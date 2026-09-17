import { describe, expect, it } from "vitest";
import type { SharePayload } from "./share.ts";
import {
  buildSkyModel,
  DISK_CX,
  DISK_CY,
  DISK_R,
  type SegmentRow,
  type StarRow,
} from "./skymodel.ts";

function payload(): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: "Times Square, New York, United States",
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
      title: "Our Night",
    },
  };
}

describe("buildSkyModel", () => {
  it("filters horizon, magnitude, and declutters close pairs", () => {
    const catalog: StarRow[] = [
      { hip: 1, raDeg: 40, decDeg: 60, mag: 2.0 }, // circumpolar, kept
      { hip: 5, raDeg: 45, decDeg: 60, mag: 2.5 }, // circumpolar, kept
      { hip: 6, raDeg: 0, decDeg: 89.9, mag: 3.0 }, // kept
      { hip: 7, raDeg: 0.001, decDeg: 89.9, mag: 5.0 }, // near-twin of 6, decluttered
      { hip: 3, raDeg: 180, decDeg: -80, mag: 1.0 }, // below horizon
      { hip: 4, raDeg: 40, decDeg: 60, mag: 7.0 }, // past magnitude limit
    ];
    const segments: SegmentRow[] = [["Ori", "Orion", 1, 5]];
    const model = buildSkyModel(payload(), catalog, segments);

    expect(model.stars.map((s) => s.hip).sort()).toEqual([1, 5, 6]);
    for (const s of model.stars) {
      expect(s.size).toBeGreaterThanOrEqual(0.6);
      expect(s.size).toBeLessThanOrEqual(14);
      expect(Math.hypot(s.px - DISK_CX, s.py - DISK_CY)).toBeLessThanOrEqual(
        DISK_R * 1.001 + 1,
      );
    }
    expect(model.figures).toHaveLength(1);
    const fig = model.figures[0];
    expect(fig.name).toBe("Orion");
    expect(fig.brightestMag).toBeCloseTo(2.0, 9);
    const [a, b] = model.stars.filter((s) => s.hip === 1 || s.hip === 5);
    expect(fig.centroidX).toBeCloseTo((a.px + b.px) / 2, 9);
    expect(fig.centroidY).toBeCloseTo((a.py + b.py) / 2, 9);
  });

  it("honors the constellations toggle", () => {
    const catalog: StarRow[] = [
      { hip: 1, raDeg: 40, decDeg: 60, mag: 2.0 },
      { hip: 5, raDeg: 45, decDeg: 60, mag: 2.5 },
    ];
    const segments: SegmentRow[] = [["Ori", "Orion", 1, 5]];
    const off = { ...payload(), options: { ...payload().options, constellations: false } };
    const model = buildSkyModel(off, catalog, segments);
    expect(model.stars.length).toBe(2);
    expect(model.figures).toHaveLength(0);
    expect(model.segments).toHaveLength(0);
  });
});
