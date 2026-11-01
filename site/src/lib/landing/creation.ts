/**
 * The `#c=` creation link: a pre-filled landing form (013-location-first). The
 * same encoding as `#s=` and `#e=` (canonical JSON, zlib level 9, base64url),
 * versioned, and tolerant on the way in: each field is checked with the form's
 * own rules, and one that fails is dropped so the rest still fills the form.
 * Only a payload that cannot be read at all, or has another version, is refused.
 * No React, no storage, no network.
 */
import { deflate, inflate } from "pako";
import { bytesToBase64Url, canonicalJson } from "../encode.ts";
import { base64UrlToBytes } from "../share.ts";
import { MAX_TEXT_CHARS, parseLocalDateTime, undrawableTitleCharacter } from "./payload.ts";

/** Every field optional; whatever is present has passed validation. */
export interface Creation {
  place?: string | null;
  lat?: number;
  lon?: number;
  /** `YYYY-MM-DDTHH:mm`, the wall clock in `tz`. */
  when_local?: string;
  tz?: string;
  title?: string;
  /** The limiting magnitude, in the form's 1..7. */
  magnitude_limit?: number;
}

export type CreationDecode = { status: "ok"; creation: Creation } | { status: "invalid" };

const PARAM = "c=";
const MAX_FRAGMENT_CHARS = 4096;
const MAG_MIN = 1;
const MAG_MAX = 7;

/** The `c` fragment from a location hash, or null for anything but `#c=`. */
export function creationFragmentFromHash(hash: string): string | null {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!body.startsWith(PARAM)) return null;
  const fragment = body.slice(PARAM.length);
  return fragment === "" ? null : fragment;
}

export function encodeCreation(creation: Creation): string {
  const raw = new TextEncoder().encode(canonicalJson({ v: 1, ...creation }));
  // legacyHash: pako 3 defaults to a hash whose output differs from canonical zlib.
  return bytesToBase64Url(deflate(raw, { level: 9, legacyHash: true }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validZone(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validWhen(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = parseLocalDateTime(value);
  if (!parts) return false;
  const [y, mo, d, h, mi] = parts;
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // A round trip catches 31 February and 25:00, which Date would roll over.
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === mo - 1 &&
    probe.getUTCDate() === d &&
    probe.getUTCHours() === h &&
    probe.getUTCMinutes() === mi
  );
}

function inRange(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

function validate(data: Record<string, unknown>): Creation {
  const out: Creation = {};
  // A place or a pin means nothing without both coordinates, so they stand or fall together.
  if (inRange(data["lat"], 90) && inRange(data["lon"], 180)) {
    out.lat = data["lat"];
    out.lon = data["lon"];
    const place = data["place"];
    if (place === null || (typeof place === "string" && place.length <= MAX_TEXT_CHARS)) {
      out.place = place;
    }
  }
  if (validWhen(data["when_local"])) out.when_local = data["when_local"];
  if (validZone(data["tz"])) out.tz = data["tz"];
  const title = data["title"];
  if (
    typeof title === "string" &&
    title.length <= MAX_TEXT_CHARS &&
    undrawableTitleCharacter(title) === null
  ) {
    out.title = title;
  }
  const mag = data["magnitude_limit"];
  if (typeof mag === "number" && Number.isFinite(mag) && mag >= MAG_MIN && mag <= MAG_MAX) {
    out.magnitude_limit = mag;
  }
  return out;
}

/** Never throws: anything unreadable is `invalid`. */
export function decodeCreation(fragment: string): CreationDecode {
  if (fragment === "" || fragment.length > MAX_FRAGMENT_CHARS) return { status: "invalid" };
  try {
    const text = inflate(base64UrlToBytes(fragment), { toText: true });
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data["v"] !== 1) return { status: "invalid" };
    return { status: "ok", creation: validate(data) };
  } catch {
    return { status: "invalid" };
  }
}
