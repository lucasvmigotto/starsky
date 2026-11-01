import { describe, expect, it } from "bun:test";
import { decodeExplorer } from "../sky/payload.ts";
import { DEFAULT_LAYERS } from "../explorer/layers.ts";
import { layersToPayload } from "../explorer/link.ts";
import { initialCamera } from "../sky/observer.ts";
import {
  type LandingInput,
  buildExplorerPayload,
  defaultTimezone,
  exploreHash,
  formatLocalNow,
  normalizeLongitude,
  parseLocalDateTime,
  undrawableTitleCharacter,
  validateCoordinates,
} from "./payload.ts";

const NYC: LandingInput = {
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square, New York",
  when: "2026-01-01T00:00",
  tz: "America/New_York",
  mag: 5.8,
  title: "",
};

function ok<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("expected ok");
  return result.value;
}

describe("parseLocalDateTime", () => {
  it("reads a datetime-local value", () => {
    expect(parseLocalDateTime("2026-01-01T05:30")).toEqual([2026, 1, 1, 5, 30]);
  });
  it("refuses anything else", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("2026-01-01")).toBeNull();
    expect(parseLocalDateTime("2026-01-01T05:30:10")).toBeNull();
  });
});

describe("buildExplorerPayload", () => {
  it("carries place, coordinates, zone, UTC moment and magnitude, with the default view", () => {
    const payload = ok(buildExplorerPayload(NYC));
    expect(payload.lat).toBe(40.758);
    expect(payload.lon).toBe(-73.9855);
    expect(payload.place).toBe("Times Square, New York");
    expect(payload.tz).toBe("America/New_York");
    expect(payload.when_utc).toBe("2026-01-01T05:00:00Z");
    expect(payload.mag).toBe(5.8);
    expect(payload.title).toBeNull();
    expect(payload.sel).toBeNull();
    expect(payload.layers).toEqual(layersToPayload(DEFAULT_LAYERS));
    const camera = initialCamera({
      latDeg: NYC.lat,
      lonDeg: NYC.lon,
      when: new Date("2026-01-01T05:00:00Z"),
    });
    expect(payload.fov).toBe(camera.fovDeg);
    expect(payload.q).toEqual(camera.orientation);
  });

  it("keeps a dropped pin's place null", () => {
    const payload = ok(buildExplorerPayload({ ...NYC, place: null }));
    expect(payload.place).toBeNull();
  });

  it("cuts a place the link would reject", () => {
    const payload = ok(buildExplorerPayload({ ...NYC, place: "x".repeat(300) }));
    expect(payload.place).toHaveLength(200);
  });

  it("carries a trimmed title, and null for an empty one", () => {
    expect(ok(buildExplorerPayload({ ...NYC, title: "  Our first flat " })).title).toBe("Our first flat");
    expect(ok(buildExplorerPayload({ ...NYC, title: "   " })).title).toBeNull();
    expect(ok(buildExplorerPayload(NYC)).title).toBeNull();
  });

  it("refuses a title the poster face cannot draw, naming the character", () => {
    expect(buildExplorerPayload({ ...NYC, title: "Night 🌌" })).toEqual({
      ok: false,
      error: { kind: "title", character: "🌌" },
    });
    expect(undrawableTitleCharacter("Céu Austral")).toBeNull();
  });

  it("names the moment when it is missing or malformed", () => {
    expect(buildExplorerPayload({ ...NYC, when: "" })).toEqual({
      ok: false,
      error: { kind: "when" },
    });
  });

  it("names an unknown timezone", () => {
    expect(buildExplorerPayload({ ...NYC, tz: "Mars/Olympus" })).toEqual({
      ok: false,
      error: { kind: "timezone", zone: "Mars/Olympus" },
    });
  });

  it("falls back to UTC for an empty timezone", () => {
    const payload = ok(buildExplorerPayload({ ...NYC, tz: "  " }));
    expect(payload.tz).toBe("UTC");
    expect(payload.when_utc).toBe("2026-01-01T00:00:00Z");
  });
});

describe("hashes", () => {
  it("exploreHash is a #e= link that decodes to the payload", () => {
    const hash = ok(exploreHash(NYC));
    expect(hash.startsWith("#e=")).toBe(true);
    const decoded = decodeExplorer(hash.slice(3));
    const built = ok(buildExplorerPayload(NYC));
    expect({ ...decoded, q: null }).toEqual({ ...built, q: null });
    for (const [i, c] of decoded.q.entries()) expect(c).toBeCloseTo(built.q[i] ?? NaN, 5);
  });

  it("refuses a bad moment or zone", () => {
    expect(exploreHash({ ...NYC, when: "" }).ok).toBe(false);
    expect(exploreHash({ ...NYC, tz: "Nope/Nope" }).ok).toBe(false);
  });
});

describe("validateCoordinates", () => {
  it("accepts a pair inside the ranges", () => {
    expect(validateCoordinates("40.7580", "-73.9855")).toEqual({
      lat: 40.758,
      lon: -73.9855,
      latInvalid: false,
      lonInvalid: false,
    });
  });
  it("accepts the limits", () => {
    const r = validateCoordinates("-90", "180");
    expect(r.latInvalid || r.lonInvalid).toBe(false);
  });
  it("flags each field on its own", () => {
    expect(validateCoordinates("91", "10")).toMatchObject({ lat: null, latInvalid: true, lonInvalid: false });
    expect(validateCoordinates("10", "-181")).toMatchObject({ lon: null, lonInvalid: true, latInvalid: false });
  });
  it("treats empty and non-numeric text as invalid", () => {
    expect(validateCoordinates("", "abc")).toMatchObject({ latInvalid: true, lonInvalid: true });
    expect(validateCoordinates("1e999", "0").latInvalid).toBe(true);
  });
});

describe("normalizeLongitude", () => {
  it("wraps a panned-around longitude into -180..180", () => {
    expect(normalizeLongitude(190)).toBeCloseTo(-170, 9);
    expect(normalizeLongitude(-190)).toBeCloseTo(170, 9);
    expect(normalizeLongitude(12.5)).toBe(12.5);
  });
});

describe("timezone and moment defaults", () => {
  it("uses the browser's zone, else UTC", () => {
    expect(defaultTimezone(() => "Europe/Lisbon")).toBe("Europe/Lisbon");
    expect(defaultTimezone(() => "")).toBe("UTC");
    expect(
      defaultTimezone(() => {
        throw new Error("no Intl");
      }),
    ).toBe("UTC");
  });

  it("formats now as a datetime-local value in the zone", () => {
    const now = new Date("2026-01-01T03:07:45Z");
    expect(formatLocalNow(now, "UTC")).toBe("2026-01-01T03:07");
    expect(formatLocalNow(now, "America/New_York")).toBe("2025-12-31T22:07");
  });

  it("falls back to UTC for a zone Intl does not know", () => {
    expect(formatLocalNow(new Date("2026-01-01T03:07:45Z"), "Nope/Nope")).toBe("2026-01-01T03:07");
  });
});
