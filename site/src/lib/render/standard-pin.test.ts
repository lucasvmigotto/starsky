/**
 * FR-002 / BCR-0012: with no story option the SVG is byte-identical to what it
 * was before the story format existed. The hashes were captured from the code
 * before any story change, from a synthetic model so no sky data is involved.
 * The square hash was re-pinned for BCR-0014 (the square now fills its square);
 * the circle hash is unchanged.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import { buildPosterSvg } from "./export.ts";
import type { SharePayload } from "../share.ts";
import type { SkyModel, VisibleStar } from "../skymodel.ts";

function star(o: Partial<VisibleStar> = {}): VisibleStar {
  return { hip: 1, raDeg: 10, decDeg: 20, mag: 1, unitX: 0, unitY: 0, px: 400, py: 400, size: 14, ...o };
}

const MODEL: SkyModel = {
  stars: [
    star(),
    star({ hip: 2, unitX: 0.2, unitY: -0.3, mag: 3.5, size: 5.6 }),
    star({ hip: 3, unitX: -0.5, unitY: 0.4, mag: 4.9, size: 2 }),
  ],
  figures: [
    { abbr: "ORI", name: "Orion", starIndices: [0, 1], centroidX: 400, centroidY: 400, brightestMag: 1, brightestHip: 1 },
  ],
  segments: [
    { a: 0, b: 1, figure: 0 },
    { a: 1, b: 2, figure: 0 },
  ],
  when: new Date("2026-01-01T00:00:00Z"),
};

function payload(o: Partial<SharePayload["options"]>): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: "Times Square",
    when_utc: "2026-01-01T00:00:00Z",
    tz: "UTC",
    options: {
      projection: "stereographic",
      fisheye_strength: 1,
      min_separation: 0.008,
      magnitude_limit: 5.8,
      glow: true,
      glow_intensity: 1,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title: "Export Night",
      ...o,
    },
  };
}

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

describe("standard SVG is pinned (FR-002)", () => {
  it("circle, titled, 1600", () => {
    expect(sha(buildPosterSvg(payload({}), MODEL, 1600))).toBe(
      "a1400e5ee6bec2c461a9007f48b088a60d688aecfb59ae0bc43072bb002b06c4",
    );
  });
  it("square, untitled, 800", () => {
    expect(sha(buildPosterSvg(payload({ shape: "square", title: null }), MODEL, 800))).toBe(
      "7514f361e966b80af935ecca31ff640bb39d8ac5b68ce8a4ec2b6ef559776174",
    );
  });
});
