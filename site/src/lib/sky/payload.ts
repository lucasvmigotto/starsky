/**
 * `#e=` link payload v1: canonical JSON -> zlib level 9 -> base64url (no padding).
 * Carries only durable view state: never pointer, hover, animation or panel state.
 */

import { inflate, deflate } from "pako";
import { bytesToBase64Url, canonicalJson } from "../encode.ts";
import { type LinkLang, base64UrlToBytes, isValidLinkLang } from "../share.ts";
import { FOV_MAX_DEG, FOV_MIN_DEG } from "./camera.ts";
import { type Quat, normalize } from "./quat.ts";

export type BelowMode = "hidden" | "dimmed";

/** Boolean layer flags plus the required `below` mode. */
export type ExplorerLayers = Record<string, boolean | BelowMode>;

export interface ExplorerPayload {
  v: 1;
  lat: number;
  lon: number;
  place: string | null;
  tz: string;
  /** `YYYY-MM-DDTHH:MM:SSZ` */
  when_utc: string;
  title: string | null;
  /** Magnitude limit. */
  mag: number;
  q: Quat;
  fov: number;
  layers: ExplorerLayers;
  /** `HIP:<n>` or `CON:<abbr>` */
  sel: string | null;
  /**
   * The poster language to carry forward to the Studio (018-pt-br). Absent
   * means none was chosen; `en-US` is never written.
   */
  lang?: LinkLang;
}

export class ExplorerDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplorerDecodeError";
  }
}

const MAX_FRAGMENT_CHARS = 4096;
const MAX_TEXT_CHARS = 200;
const MIN_Q_NORM = 1e-6;
const MAG_MIN = -2;
const MAG_MAX = 12;
const WHEN_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SEL_RE = /^(HIP:\d+|CON:[A-Za-z0-9]+)$/;

function fail(message: string): never {
  throw new ExplorerDecodeError(`Invalid explorer payload: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(data: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return fail(`${key} must be a number in [${String(min)}, ${String(max)}]`);
  }
  return value;
}

function text(data: Record<string, unknown>, key: string, nullable: boolean): string | null {
  const value = data[key];
  if (value === null && nullable) return null;
  if (typeof value !== "string" || value.length > MAX_TEXT_CHARS) {
    return fail(`${key} must be a short string${nullable ? " or null" : ""}`);
  }
  return value;
}

function parseQuat(value: unknown): Quat {
  if (!Array.isArray(value) || value.length !== 4) return fail("q must have 4 numbers");
  const parts: number[] = [];
  for (const part of value as unknown[]) {
    if (typeof part !== "number" || !Number.isFinite(part)) return fail("q must be numeric");
    parts.push(part);
  }
  const [x = 0, y = 0, z = 0, w = 1] = parts;
  if (Math.hypot(x, y, z, w) < MIN_Q_NORM) return fail("q is too close to zero");
  return normalize([x, y, z, w]);
}

function parseLayers(value: unknown): ExplorerLayers {
  if (!isRecord(value)) return fail("layers must be an object");
  const layers: ExplorerLayers = {};
  for (const [key, flag] of Object.entries(value)) {
    if (key === "below") continue;
    if (typeof flag !== "boolean") return fail(`layers.${key} must be a boolean`);
    layers[key] = flag;
  }
  const below = value["below"];
  if (below !== "hidden" && below !== "dimmed") {
    return fail('layers.below must be "hidden" or "dimmed"');
  }
  layers["below"] = below;
  return layers;
}

function parseWhen(value: unknown): string {
  if (typeof value !== "string" || !WHEN_RE.test(value)) {
    return fail("when_utc must be YYYY-MM-DDTHH:MM:SSZ");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== value.slice(0, 19)) {
    return fail("when_utc is not a real date");
  }
  return value;
}

function validate(data: unknown): ExplorerPayload {
  if (!isRecord(data)) return fail("not an object");
  if (data["v"] !== 1) return fail(`unsupported version ${JSON.stringify(data["v"])}`);
  const tz = text(data, "tz", false);
  if (!tz) return fail("tz must not be empty");
  const sel = data["sel"];
  if (sel !== null && (typeof sel !== "string" || !SEL_RE.test(sel))) {
    return fail("sel must be HIP:<n>, CON:<abbr> or null");
  }
  if (!isValidLinkLang(data)) return fail('lang must be "pt-BR" or absent');
  return {
    v: 1,
    lat: num(data, "lat", -90, 90),
    lon: num(data, "lon", -180, 180),
    place: text(data, "place", true),
    tz,
    when_utc: parseWhen(data["when_utc"]),
    title: text(data, "title", true),
    mag: num(data, "mag", MAG_MIN, MAG_MAX),
    q: parseQuat(data["q"]),
    fov: num(data, "fov", FOV_MIN_DEG, FOV_MAX_DEG),
    layers: parseLayers(data["layers"]),
    sel,
    ...(data["lang"] === "pt-BR" ? { lang: "pt-BR" as const } : {}),
  };
}

/** Serialize to the `e` fragment string (no `#e=` prefix). Validates first. */
export function encodeExplorer(payload: ExplorerPayload): string {
  const valid = validate(payload);
  const rounded = valid.q.map((c) => Math.round(c * 1e5) / 1e5);
  const out = { ...valid, q: rounded };
  const raw = new TextEncoder().encode(canonicalJson(out));
  // legacyHash: pako 3 defaults to a hash whose output differs from canonical zlib.
  return bytesToBase64Url(deflate(raw, { level: 9, legacyHash: true }));
}

export function decodeExplorer(fragment: string): ExplorerPayload {
  if (fragment.length > MAX_FRAGMENT_CHARS) return fail("fragment too long");
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(fragment);
  } catch {
    return fail("not base64url");
  }
  let raw: string;
  try {
    raw = inflate(bytes, { toText: true });
  } catch {
    return fail("not a zlib stream");
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail("not JSON");
  }
  return validate(data);
}

/** The `e` fragment from a location hash, or null for anything but `#e=`. */
export function explorerFragmentFromHash(hash: string): string | null {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!body.startsWith("e=")) return null;
  const fragment = body.slice(2);
  return fragment === "" ? null : fragment;
}
