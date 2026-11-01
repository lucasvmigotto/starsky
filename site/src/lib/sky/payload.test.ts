import { describe, expect, it } from "bun:test";
import { deflate, inflate } from "pako";
import { bytesToBase64Url, canonicalJson } from "../encode.ts";
import { base64UrlToBytes } from "../share.ts";
import {
  ExplorerDecodeError,
  type ExplorerPayload,
  decodeExplorer,
  encodeExplorer,
  explorerFragmentFromHash,
} from "./payload.ts";

const BASE: ExplorerPayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "New York",
  tz: "America/New_York",
  when_utc: "2026-06-21T03:30:00Z",
  title: null,
  mag: 6.5,
  q: [0.1, 0.2, 0.3, 0.92736185],
  fov: 100,
  layers: { lines: true, labels: false, below: "dimmed" },
  sel: "HIP:32349",
};

function craft(value: unknown): string {
  const raw = new TextEncoder().encode(
    typeof value === "string" ? value : canonicalJson(value),
  );
  return bytesToBase64Url(deflate(raw, { level: 9, legacyHash: true }));
}

function withField(field: string, value: unknown): string {
  return craft({ ...BASE, [field]: value });
}

function rawCraft(value: unknown): string {
  // Bypass canonicalJson so out-of-schema shapes can be built.
  return craft(JSON.stringify(value));
}

describe("round trip", () => {
  it("encodes then decodes", () => {
    const back = decodeExplorer(encodeExplorer(BASE));
    expect(back.v).toBe(1);
    expect(back.lat).toBe(BASE.lat);
    expect(back.lon).toBe(BASE.lon);
    expect(back.place).toBe("New York");
    expect(back.title).toBeNull();
    expect(back.when_utc).toBe(BASE.when_utc);
    expect(back.layers).toEqual(BASE.layers);
    expect(back.sel).toBe("HIP:32349");
    expect(back.fov).toBe(100);
  });

  it("stores the quaternion to 5 decimals on the wire", () => {
    const json = inflate(base64UrlToBytes(encodeExplorer(BASE)), { toText: true });
    const q = (JSON.parse(json) as { q: number[] }).q;
    expect(q).toHaveLength(4);
    for (const c of q) {
      expect(String(c).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(5);
    }
    const back = decodeExplorer(encodeExplorer(BASE));
    expect(Math.hypot(...back.q)).toBeCloseTo(1, 12);
    expect(back.q[0]).toBeCloseTo(0.1, 4);
  });

  it("is deterministic and stable across a second round trip", () => {
    const a = encodeExplorer(BASE);
    expect(encodeExplorer(BASE)).toBe(a);
    expect(encodeExplorer(decodeExplorer(a))).toBe(a);
  });

  it("normalizes a non-unit quaternion on encode", () => {
    const back = decodeExplorer(encodeExplorer({ ...BASE, q: [0, 0, 0, 5] }));
    expect(back.q).toEqual([0, 0, 0, 1]);
  });

  it("produces url-safe output with no padding", () => {
    expect(encodeExplorer(BASE)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts null sel and null place", () => {
    const back = decodeExplorer(encodeExplorer({ ...BASE, sel: null, place: null }));
    expect(back.sel).toBeNull();
    expect(back.place).toBeNull();
  });
});

describe("validation", () => {
  const bad: [string, string][] = [
    ["bad base64 characters", "!!!not-base64!!!"],
    ["bad base64 length", "a"],
    ["empty", ""],
    ["not zlib", bytesToBase64Url(new TextEncoder().encode("hello"))],
    ["not JSON", craft("{nope")],
    ["JSON that is not an object", rawCraft([1, 2])],
    ["null", rawCraft(null)],
    ["wrong version", withField("v", 2)],
    ["missing version", rawCraft({ ...BASE, v: undefined })],
    ["lat too big", withField("lat", 90.1)],
    ["lat too small", withField("lat", -91)],
    ["lat not a number", rawCraft({ ...BASE, lat: "40" })],
    ["lon too big", withField("lon", 180.5)],
    ["lon too small", withField("lon", -181)],
    ["mag too faint", withField("mag", 99)],
    ["mag too bright", withField("mag", -9)],
    ["fov below min", withField("fov", 4)],
    ["fov above max", withField("fov", 121)],
    ["q too short", withField("q", [0, 0, 1])],
    ["q too long", withField("q", [0, 0, 0, 1, 0])],
    ["q non-numeric", rawCraft({ ...BASE, q: [0, 0, 0, "1"] })],
    ["q near zero", withField("q", [0, 0, 0, 1e-9])],
    ["q all zero", withField("q", [0, 0, 0, 0])],
    ["layers missing", rawCraft({ ...BASE, layers: undefined })],
    ["layers not an object", withField("layers", [true])],
    ["layers without below", withField("layers", { lines: true })],
    ["layers bad below", withField("layers", { below: "gone" })],
    ["layers non-boolean flag", rawCraft({ ...BASE, layers: { below: "hidden", lines: 1 } })],
    ["when_utc not a string", rawCraft({ ...BASE, when_utc: 5 })],
    ["when_utc garbage", withField("when_utc", "yesterday")],
    ["when_utc impossible date", withField("when_utc", "2026-02-30T00:00:00Z")],
    ["when_utc with offset", withField("when_utc", "2026-06-21T03:30:00+02:00")],
    ["tz empty", withField("tz", "")],
    ["sel malformed", withField("sel", "star 5")],
    ["place not a string", rawCraft({ ...BASE, place: 4 })],
    ["title not a string", rawCraft({ ...BASE, title: {} })],
  ];

  for (const [label, fragment] of bad) {
    it(`rejects ${label} with ExplorerDecodeError`, () => {
      expect(() => decodeExplorer(fragment)).toThrow(ExplorerDecodeError);
    });
  }

  it("rejects oversized fragments", () => {
    expect(() => decodeExplorer("A".repeat(10_000))).toThrow(ExplorerDecodeError);
  });

  it("refuses to encode an invalid payload", () => {
    expect(() => encodeExplorer({ ...BASE, lat: 100 })).toThrow(ExplorerDecodeError);
    expect(() => encodeExplorer({ ...BASE, q: [0, 0, 0, 0] })).toThrow(ExplorerDecodeError);
  });

  it("accepts the range boundaries", () => {
    for (const patch of [
      { lat: 90, lon: 180 },
      { lat: -90, lon: -180 },
      { fov: 5 },
      { fov: 120 },
    ]) {
      expect(() => decodeExplorer(encodeExplorer({ ...BASE, ...patch }))).not.toThrow();
    }
  });
});

describe("explorerFragmentFromHash", () => {
  it("returns the payload only for #e=", () => {
    expect(explorerFragmentFromHash("#e=abc123")).toBe("abc123");
    expect(explorerFragmentFromHash("e=abc123")).toBe("abc123");
  });

  it("never matches #s=, #studio= or router hashes", () => {
    expect(explorerFragmentFromHash("#s=abc123")).toBeNull();
    expect(explorerFragmentFromHash("#studio=abc123")).toBeNull();
    expect(explorerFragmentFromHash("#/studio")).toBeNull();
    expect(explorerFragmentFromHash("#/")).toBeNull();
    expect(explorerFragmentFromHash("")).toBeNull();
    expect(explorerFragmentFromHash("#e=")).toBeNull();
    expect(explorerFragmentFromHash("#ex=abc")).toBeNull();
  });
});
