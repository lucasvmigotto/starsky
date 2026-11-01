/**
 * Scene conversions between the Explorer and the poster (BCR-0011). Pure: no
 * storage, no DOM, no codec. A scene is the place, the moment and the title;
 * composition and camera are not shared, so each direction fills them from
 * defaults.
 */
import { DEFAULT_LAYERS } from "../explorer/layers.ts";
import { layersToPayload } from "../explorer/link.ts";
import type { SharePayload } from "../share.ts";
import type { ExplorerCamera } from "../sky/camera.ts";
import { initialCamera } from "../sky/observer.ts";
import type { ExplorerPayload } from "../sky/payload.ts";
import { DEFAULTS } from "./defaults.ts";

/**
 * The magnitude range a share link accepts (`OPTION_RANGES.magnitude_limit` in
 * `share.ts`, which is private; `convert.test.ts` pins both ends against the
 * real validation). The Explorer's own `mag` is wider, [-2, 12].
 */
const MAG_MIN = 1;
const MAG_MAX = 7;

/** The Explorer link rejects longer text (`MAX_TEXT_CHARS` in `sky/payload.ts`). */
const MAX_TEXT_CHARS = 200;

function clampMagnitude(mag: number): number {
  if (!Number.isFinite(mag)) return DEFAULTS.magnitudeLimit;
  return Math.min(MAG_MAX, Math.max(MAG_MIN, mag));
}

/** `YYYY-MM-DDTHH:MM:SSZ`, the form the Explorer link takes; throws for a non-date. */
export function normalizeWhen(whenUtc: string): string {
  const parsed = new Date(whenUtc);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`not a moment: ${whenUtc}`);
  }
  return `${parsed.toISOString().slice(0, 19)}Z`;
}

function shorten(text: string | null): string | null {
  return text === null ? null : text.slice(0, MAX_TEXT_CHARS);
}

/** The poster for an Explorer scene: its place, moment, title and magnitude. */
export function explorerToPoster(explorer: ExplorerPayload): SharePayload {
  return {
    v: 1,
    lat: explorer.lat,
    lon: explorer.lon,
    place: explorer.place,
    when_utc: explorer.when_utc,
    tz: explorer.tz,
    options: {
      projection: DEFAULTS.projection,
      fisheye_strength: DEFAULTS.fisheyeStrength,
      min_separation: DEFAULTS.minSeparation,
      magnitude_limit: clampMagnitude(explorer.mag),
      glow: DEFAULTS.glow,
      glow_intensity: DEFAULTS.glowIntensity,
      constellations: DEFAULTS.constellations,
      constellation_labels: DEFAULTS.constellationLabels,
      shape: DEFAULTS.shape,
      title: explorer.title === null || explorer.title === "" ? null : explorer.title,
    },
    ...(explorer.lang === undefined ? {} : { lang: explorer.lang }),
  };
}

/**
 * The Explorer scene for a poster, looking at the zenith unless `camera` says
 * otherwise, with the default layers and nothing selected.
 */
export function posterToExplorer(share: SharePayload, camera?: ExplorerCamera): ExplorerPayload {
  const when_utc = normalizeWhen(share.when_utc);
  const view =
    camera ?? initialCamera({ latDeg: share.lat, lonDeg: share.lon, when: new Date(when_utc) });
  return {
    v: 1,
    lat: share.lat,
    lon: share.lon,
    place: shorten(share.place),
    tz: share.tz,
    when_utc,
    title: shorten(share.options.title),
    mag: share.options.magnitude_limit,
    q: view.orientation,
    fov: view.fovDeg,
    layers: layersToPayload(DEFAULT_LAYERS),
    sel: null,
    // The poster's language rides along, so a poster made later starts in it.
    ...(share.lang === undefined ? {} : { lang: share.lang }),
  };
}
