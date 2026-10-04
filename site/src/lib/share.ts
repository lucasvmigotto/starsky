import { inflate } from "pako";
import { SPEC } from "./spec.ts";

export type Projection = "stereographic" | "fisheye";
export type Shape = "circle" | "square";

export interface RenderOptions {
  projection: Projection;
  fisheye_strength: number;
  min_separation: number;
  magnitude_limit: number;
  glow: boolean;
  glow_intensity: number;
  constellations: boolean;
  constellation_labels: boolean;
  shape: Shape;
  title: string | null;
}

export interface SharePayload {
  v: number;
  lat: number;
  lon: number;
  place: string | null;
  when_utc: string;
  tz: string;
  options: RenderOptions;
}

export class ShareVersionError extends Error {
  readonly found: unknown;
  constructor(found: unknown) {
    super(`Unsupported share version: ${JSON.stringify(found)}`);
    this.name = "ShareVersionError";
    this.found = found;
  }
}

export class ShareDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareDecodeError";
  }
}

/** Decode a base64url (no padding) string to bytes. */
export function base64UrlToBytes(fragment: string): Uint8Array {
  const padded = fragment.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  if (remainder === 1) {
    throw new ShareDecodeError("Invalid share payload: bad base64 length");
  }
  const normalized = padded + "=".repeat(remainder === 0 ? 0 : 4 - remainder);
  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    throw new ShareDecodeError("Invalid share payload: not base64url");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode a `#s=` fragment: base64url-no-pad -> zlib stream inflate ->
 * canonical JSON -> validated SharePayload. Mirrors
 * `src/starsky/share/spec.py::decode_payload` (raw zlib, not gzip).
 */
export function decodeShareFragment(fragment: string): SharePayload {
  const bytes = base64UrlToBytes(fragment);
  let raw: string;
  try {
    raw = inflate(bytes, { to: "string" });
  } catch (error) {
    throw new ShareDecodeError(
      `Invalid share payload: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ShareDecodeError("Invalid share payload: not JSON");
  }
  return migrateSharePayload(data);
}

/**
 * The bounds a share payload's options must fall inside (BCR-0008).
 *
 * These are the same values the landing form's controls enforce, and they are
 * declared here so the two cannot drift: a limit changed in one place without
 * the other is a bug, and the tests exercise both ends.
 *
 * A shared link is user-controllable input, so out-of-range values are
 * **rejected** rather than clamped — clamping would silently change what a link
 * asked for. The old Python renderer rejected them too.
 */
const OPTION_RANGES = {
  fisheye_strength: { min: 0.1, max: 3.0 },
  min_separation: { min: 0.0, max: 0.05 },
  magnitude_limit: { min: 1.0, max: 7.0 },
  glow_intensity: { min: 0.0, max: 3.0 },
} as const satisfies Record<string, { min: number; max: number }>;

const COORDINATE_RANGES = {
  lat: { min: -90, max: 90 },
  lon: { min: -180, max: 180 },
} as const satisfies Record<string, { min: number; max: number }>;

const PROJECTIONS = ["stereographic", "fisheye"] as const;
const SHAPES = ["circle", "square"] as const;

/** Reject a payload whose options fall outside their declared bounds. */
export function validateOptions(payload: SharePayload): void {
  for (const [field, range] of Object.entries(COORDINATE_RANGES)) {
    const value = (payload as unknown as Record<string, unknown>)[field];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < range.min ||
      value > range.max
    ) {
      throw new ShareDecodeError(
        `Invalid share payload: ${field} must be between ${range.min.toString()} and ${range.max.toString()}`,
      );
    }
  }

  const options = payload.options as unknown as Record<string, unknown>;
  for (const [field, range] of Object.entries(OPTION_RANGES)) {
    const value = options[field];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < range.min ||
      value > range.max
    ) {
      throw new ShareDecodeError(
        `Invalid share payload: ${field} must be between ${range.min.toString()} and ${range.max.toString()}`,
      );
    }
  }

  const projection = options["projection"];
  if (!PROJECTIONS.includes(projection as (typeof PROJECTIONS)[number])) {
    throw new ShareDecodeError(
      `Invalid share payload: projection must be one of ${PROJECTIONS.join(", ")}`,
    );
  }
  const shape = options["shape"];
  if (!SHAPES.includes(shape as (typeof SHAPES)[number])) {
    throw new ShareDecodeError(
      `Invalid share payload: shape must be one of ${SHAPES.join(", ")}`,
    );
  }
}

/**
 * Migrate a decoded share document to the current schema.
 *
 * Today only `v: 1` exists, so this is the identity plus validation — but
 * the indirection is the point: when a `v: 2` appears, old links migrate
 * here instead of breaking. Unknown versions throw `ShareVersionError`
 * (a different failure from corrupt bytes, and handled as "legacy" by
 * the Viewer).
 */
export function migrateSharePayload(data: unknown): SharePayload {
  if (typeof data !== "object" || data === null) {
    throw new ShareDecodeError("Invalid share payload: not an object");
  }
  const record = data as Record<string, unknown>;
  if (record["v"] !== SPEC.shareLink.payloadVersion) {
    throw new ShareVersionError(record["v"]);
  }
  if (
    typeof record["lat"] !== "number" ||
    typeof record["lon"] !== "number" ||
    typeof record["when_utc"] !== "string" ||
    typeof record["tz"] !== "string" ||
    typeof record["options"] !== "object" ||
    record["options"] === null
  ) {
    throw new ShareDecodeError("Invalid share payload: missing fields");
  }
  validateOptions(data as unknown as SharePayload);
  return data as unknown as SharePayload;
}

/** Decode a `#s=` fragment to the current sky state. */
export function decodeSkyState(fragment: string): SharePayload {
  return decodeShareFragment(fragment);
}

/** Extract the `s` fragment from a location hash like `#s=...`. */
export function fragmentFromHash(hash: string): string | null {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean.startsWith(`${SPEC.shareLink.fragmentParam}=`)) return null;
  return clean.slice(2);
}
