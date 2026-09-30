/**
 * Share-payload option validation (BCR-0008).
 *
 * A shared link is user-controllable input: a crafted `#s=` can carry any option
 * values, so out-of-range ones are **rejected** rather than clamped. The bounds
 * are the same ones the landing form's controls enforce.
 *
 * The compatibility half matters as much as the rejection half: every payload
 * the product itself produces must keep decoding.
 */
import { describe, expect, it } from "bun:test";
import { encodePayload } from "./encode.ts";
import {
  decodeShareFragment,
  type SharePayload,
} from "./share.ts";
import { SAMPLE_FRAGMENTS } from "./site.ts";

function payload(overrides: Partial<SharePayload["options"]> = {}): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: "Times Square",
    when_utc: "2026-01-01T00:00:00Z",
    tz: "UTC",
    options: {
      projection: "stereographic",
      fisheye_strength: 1.0,
      min_separation: 0.008,
      magnitude_limit: 5.8,
      glow: true,
      glow_intensity: 1.0,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title: "Validation",
      ...overrides,
    },
  };
}

describe("BCR-0008 — existing links keep working", () => {
  it("the committed sample fragments all decode", () => {
    expect(SAMPLE_FRAGMENTS.length).toBeGreaterThan(0);
    for (const fragment of SAMPLE_FRAGMENTS) {
      expect(() => decodeShareFragment(fragment)).not.toThrow();
    }
  });

  it("a defaults payload decodes", () => {
    expect(() => decodeShareFragment(encodePayload(payload()))).not.toThrow();
  });
});

describe("BCR-0008 — out-of-range options are rejected", () => {
  it("rejects fisheye_strength below its floor", () => {
    // The case the finding was written about: at 0 every star collapses to the
    // horizon ring and the poster is wholly wrong, without any error.
    const bad = encodePayload(payload({ fisheye_strength: 0 }));
    expect(() => decodeShareFragment(bad)).toThrow(/fisheye_strength/);
  });

  it("accepts both ends of every range", () => {
    const ends: Partial<SharePayload["options"]>[] = [
      { fisheye_strength: 0.1 },
      { fisheye_strength: 3.0 },
      { min_separation: 0.0 },
      { min_separation: 0.05 },
      { magnitude_limit: 1.0 },
      { magnitude_limit: 7.0 },
      { glow_intensity: 0.0 },
      { glow_intensity: 3.0 },
    ];
    for (const override of ends) {
      const fragment = encodePayload(payload(override));
      expect(() => decodeShareFragment(fragment)).not.toThrow();
    }
  });

  it("rejects just outside every range", () => {
    const out: Partial<SharePayload["options"]>[] = [
      { fisheye_strength: 0.099 },
      { fisheye_strength: 3.01 },
      { min_separation: -0.001 },
      { min_separation: 0.051 },
      { magnitude_limit: 0.99 },
      { magnitude_limit: 7.01 },
      { glow_intensity: -0.001 },
      { glow_intensity: 3.01 },
    ];
    for (const override of out) {
      const fragment = encodePayload(payload(override));
      expect(() => decodeShareFragment(fragment)).toThrow();
    }
  });

  it("rejects an unknown projection or shape", () => {
    const badProjection = encodePayload(
      payload({ projection: "mercator" as never }),
    );
    expect(() => decodeShareFragment(badProjection)).toThrow(/projection/);

    const badShape = encodePayload(payload({ shape: "triangle" as never }));
    expect(() => decodeShareFragment(badShape)).toThrow(/shape/);
  });

  it("rejects coordinates outside their bounds", () => {
    for (const bad of [payload({}), { ...payload(), lat: 95 }]) {
      if (typeof bad.lat === "number" && Math.abs(bad.lat) > 90) {
        expect(() => decodeShareFragment(encodePayload(bad))).toThrow(/lat/);
      }
    }
    const overLon: SharePayload = { ...payload(), lon: -181 };
    expect(() => decodeShareFragment(encodePayload(overLon))).toThrow(/lon/);
  });

  it("rejects a non-finite value at encode time", () => {
    // The encoder already refuses non-finite numbers, so such a value cannot
    // reach a link in the first place. This asserts the guarantee where it
    // actually lives rather than inventing a decoder case that cannot occur.
    const bad: SharePayload = {
      ...payload(),
      options: { ...payload().options, magnitude_limit: Number.POSITIVE_INFINITY },
    };
    expect(() => encodePayload(bad)).toThrow(/non-finite/);
  });
});
