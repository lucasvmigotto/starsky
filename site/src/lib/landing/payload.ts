/**
 * What the landing sends to the Explorer and the Studio, as pure functions: the
 * place and moment the visitor chose in, a `#e=` or `#studio=` hash out. No DOM,
 * no state, so the rules are testable without a page.
 */
import { DEFAULT_LAYERS } from "../explorer/layers.ts";
import { layersToPayload } from "../explorer/link.ts";
import { explorerToPoster } from "../scene/convert.ts";
import { DEFAULTS } from "../scene/defaults.ts";
import { initialCamera } from "../sky/observer.ts";
import { type ExplorerPayload, encodeExplorer } from "../sky/payload.ts";
import { draftHash } from "../studio/draft.ts";
import { toWhenUtcIso, zonedTimeToUtc } from "../time.ts";

/** The Explorer link rejects longer text (`MAX_TEXT_CHARS` in `sky/payload.ts`). */
const MAX_PLACE_CHARS = 200;

export interface LandingInput {
  lat: number;
  lon: number;
  /** The geocoder's label, or null for a dropped pin or typed coordinates. */
  place: string | null;
  /** `datetime-local` wall-clock text in `tz`. */
  when: string;
  tz: string;
  /** Limiting magnitude. */
  mag: number;
}

export type LandingError = { kind: "when" } | { kind: "timezone"; zone: string };

export type Built<T> = { ok: true; value: T } | { ok: false; error: LandingError };

export function parseLocalDateTime(
  value: string,
): [number, number, number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5])];
}

/** The UTC instant of the wall-clock text in the zone ("" is UTC). */
function resolveMoment(when: string, tz: string): Built<{ date: Date; zone: string }> {
  const parts = parseLocalDateTime(when);
  if (!parts) return { ok: false, error: { kind: "when" } };
  const zone = tz.trim() || "UTC";
  try {
    return {
      ok: true,
      value: { date: zonedTimeToUtc(parts[0], parts[1], parts[2], parts[3], parts[4], zone), zone },
    };
  } catch {
    return { ok: false, error: { kind: "timezone", zone } };
  }
}

export function buildExplorerPayload(input: LandingInput): Built<ExplorerPayload> {
  const moment = resolveMoment(input.when, input.tz);
  if (!moment.ok) return moment;
  const when_utc = toWhenUtcIso(moment.value.date).slice(0, 19) + "Z";
  const camera = initialCamera({
    latDeg: input.lat,
    lonDeg: input.lon,
    when: new Date(when_utc),
  });
  return {
    ok: true,
    value: {
      v: 1,
      lat: input.lat,
      lon: input.lon,
      place: input.place === null ? null : input.place.slice(0, MAX_PLACE_CHARS),
      tz: moment.value.zone,
      when_utc,
      title: null,
      mag: input.mag,
      q: camera.orientation,
      fov: camera.fovDeg,
      layers: layersToPayload(DEFAULT_LAYERS),
      sel: null,
    },
  };
}

/** `#e=<fragment>`: the Explorer at the place and moment, looking at the zenith. */
export function exploreHash(input: LandingInput): Built<string> {
  const built = buildExplorerPayload(input);
  if (!built.ok) return built;
  return { ok: true, value: `#e=${encodeExplorer(built.value)}` };
}

/** `#studio=<draft>`: the same scene with the default composition. */
export function studioHash(input: LandingInput): Built<string> {
  const built = buildExplorerPayload(input);
  if (!built.ok) return built;
  return { ok: true, value: draftHash(explorerToPoster(built.value)) };
}

export interface CoordinateCheck {
  lat: number | null;
  lon: number | null;
  latInvalid: boolean;
  lonInvalid: boolean;
}

function inRange(text: string, limit: number): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export function validateCoordinates(latText: string, lonText: string): CoordinateCheck {
  const lat = inRange(latText, 90);
  const lon = inRange(lonText, 180);
  return { lat, lon, latInvalid: lat === null, lonInvalid: lon === null };
}

/** A longitude panned around the world copy, back into -180..180. */
export function normalizeLongitude(lon: number): number {
  if (lon >= -180 && lon <= 180) return lon;
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** The browser's zone, else UTC. `resolve` is injectable for tests. */
export function defaultTimezone(
  resolve: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    return resolve() || DEFAULTS.tz;
  } catch {
    return DEFAULTS.tz;
  }
}

/** `YYYY-MM-DDTHH:mm` for `now` on the wall clock of `tz` (UTC for an unknown zone). */
export function formatLocalNow(now: Date, tz: string): string {
  let zone = tz;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
