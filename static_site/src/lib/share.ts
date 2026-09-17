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
 * `src/starpy/share/spec.py::decode_payload` (raw zlib, not gzip).
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
  return data as SharePayload;
}

/** Extract the `s` fragment from a location hash like `#s=...`. */
export function fragmentFromHash(hash: string): string | null {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean.startsWith(`${SPEC.shareLink.fragmentParam}=`)) return null;
  return clean.slice(2);
}
