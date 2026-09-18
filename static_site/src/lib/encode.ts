import { deflate } from "pako";
import type { SharePayload } from "./share.ts";

/**
 * Client-side mirror of `src/starpy/share/spec.py::encode_payload`:
 * canonical JSON -> zlib level 9 -> URL-safe base64 (no padding).
 *
 * Byte-compatibility notes (both required for fragments identical to the
 * Python encoder's output):
 * - Python `json.dumps(1.0)` emits `"1.0"` while JS `JSON.stringify(1)`
 *   emits `"1"`, so integer-valued floats are rendered with a `.0` suffix.
 * - Pydantic serializes aware UTC datetimes without millis
 *   (`"2026-01-01T00:00:00Z"`) while JS `Date.toISOString()` always emits
 *   `.000Z`; see `toWhenUtcIso` in `./time.ts`.
 * - `sort_keys=True` applies at every nesting level, including `options`.
 */

function formatJsonFloat(n: number): string {
  if (!Number.isFinite(n)) {
    throw new Error(`Cannot encode non-finite number: ${String(n)}`);
  }
  return Number.isInteger(n) ? `${String(n)}.0` : String(n);
}

/**
 * JSON-pointer-ish paths of int-typed fields in the share schema. Pydantic
 * serializes `int` fields bare (`1`) but `float` fields repr-style (`1.0`),
 * and TS `number` cannot tell them apart — so the encoder carries the
 * schema's type knowledge explicitly. `/v` is currently the only int-typed
 * path (`schemas/share.py`: `v: int`; every other numeric field is float).
 */
const INT_PATHS: ReadonlySet<string> = new Set(["/v"]);

/** Serialize to canonical JSON (sorted keys, `(",", ":")` separators). */
export function canonicalJson(value: unknown, path = ""): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (INT_PATHS.has(path)) {
      if (!Number.isInteger(value)) {
        throw new Error(`Expected integer at ${path}, got ${String(value)}`);
      }
      return String(value);
    }
    return formatJsonFloat(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item, i) => canonicalJson(item, `${path}/${String(i)}`)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const parts = keys.map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(record[key], `${path}/${key}`)}`,
    );
    return `{${parts.join(",")}}`;
  }
  throw new Error(`Cannot encode value of type ${typeof value}`);
}

/** Inverse of `base64UrlToBytes` in `./share.ts`: bytes -> base64url, no pad. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Serialize a payload to the URL-safe `s` fragment string (no `#s=` prefix;
 * the caller prepends that when setting `window.location.hash`).
 */
export function encodePayload(payload: SharePayload): string {
  const raw = new TextEncoder().encode(canonicalJson(payload));
  const compressed = deflate(raw, { level: 9 });
  return bytesToBase64Url(compressed);
}
