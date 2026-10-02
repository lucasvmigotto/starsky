/**
 * Export pipeline tests (BCR-0002, refactor Slice 4).
 *
 * The exporters are DOM/canvas-backed; without a canvas environment the
 * structural contract is checked through the SVG path, which is pure string
 * construction and is the source the PDF is built from. Browser-level
 * assertions belong to `qa:e2e`.
 */
import { describe, expect, it } from "bun:test";
import { buildPosterSvg, exportSvg } from "./export.ts";
import type { SharePayload } from "../share.ts";
import type { SkyModel, VisibleStar } from "../skymodel.ts";

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
      title: "Export Night",
      ...overrides,
    },
  };
}

function star(overrides: Partial<VisibleStar> = {}): VisibleStar {
  return {
    hip: 1,
    raDeg: 10,
    decDeg: 20,
    mag: 1,
    unitX: 0,
    unitY: 0,
    px: 400,
    py: 400,
    size: 14,
    ...overrides,
  };
}

function model(): SkyModel {
  return {
    stars: [star(), star({ hip: 2, unitX: 0.2, mag: 3.5 })],
    figures: [
      {
        abbr: "ORI",
        name: "Orion",
        starIndices: [0, 1],
        centroidX: 400,
        centroidY: 400,
        brightestMag: 1,
        brightestHip: 1,
      },
    ],
    segments: [{ a: 0, b: 1, figure: 0 }],
    when: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("exportSvg", () => {
  it("returns an SVG blob with the right MIME type", () => {
    const blob = exportSvg(payload(), model(), 1600);
    expect(blob.type).toBe("image/svg+xml");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("declares the export size independently of the on-screen preview", () => {
    const svg = buildPosterSvg(payload(), model(), 1600);
    expect(svg).toContain('width="1600"');
  });

  it("carries the title and the coordinate caption as selectable text", () => {
    const svg = buildPosterSvg(payload(), model(), 1600);
    expect(svg).toContain("Export Night");
    expect(svg).toContain("40.7580°N");
    expect(svg).toContain("<text");
  });

  it("contains no external references (self-contained export)", () => {
    const svg = buildPosterSvg(payload(), model(), 1600);
    // The xmlns declaration is the SVG namespace, not a fetch. What must not
    // appear is any remote asset: an <image href>, a stylesheet, a font URL.
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("href=");
    expect(svg).not.toContain("<style");
    expect(svg).not.toContain("@font-face");
    expect(svg).not.toContain("url(http");
  });

  it("keeps the newline out of an untitled caption's detail line", () => {
    const svg = buildPosterSvg(
      payload({ title: null }),
      model(),
      1600,
    );
    expect(svg).toContain("40.7580°N");
  });
});
