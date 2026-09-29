/**
 * Poster renderer tests (Slice 3).
 *
 * Canvas is unavailable in the default `bun test` environment, so layout and
 * geometry are tested through the pure functions and the SVG export, which
 * share the same geometry code as the canvas path. Whether the raster matches
 * the CLI within tolerance is the parity harness's job (it renders in a real
 * browser), not this suite's.
 */
import { describe, expect, it } from "bun:test";
import { buildPosterSvg } from "./export.ts";
import {
  AXIS_EXTENT,
  posterGeometry,
  renderPosterToCanvas,
  unitToCanvas,
} from "./poster.ts";
import type { SharePayload } from "../share.ts";
import type { SkyModel, VisibleStar } from "../skymodel.ts";

function makePayload(overrides: Partial<SharePayload["options"]> = {}): SharePayload {
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
      title: "Golden Night",
      ...overrides,
    },
  };
}

function star(overrides: Partial<VisibleStar> = {}): VisibleStar {
  return {
    hip: 1,
    raDeg: 10,
    decDeg: 20,
    mag: 1.0,
    unitX: 0.0,
    unitY: 0.0,
    px: 400,
    py: 400,
    size: 14,
    ...overrides,
  };
}

function makeModel(stars: VisibleStar[]): SkyModel {
  return {
    stars,
    figures: [
      {
        abbr: "TST",
        name: "Test",
        starIndices: [0],
        centroidX: 400,
        centroidY: 400,
        brightestMag: 1.0,
        brightestHip: 1,
      },
    ],
    segments: stars.length > 1 ? [{ a: 0, b: 1, figure: 0 }] : [],
    when: new Date("2026-01-01T00:00:00Z"),
  };
}

const PREVIEW = { diskCx: 400, diskCy: 400, diskR: 368 };

describe("posterGeometry", () => {
  it("adds the caption band below a square sky", () => {
    const g = posterGeometry(800);
    expect(g.skyPx).toBe(800);
    expect(g.bandPx).toBeCloseTo(800 * 0.22, 6);
    expect(g.canvasHeight).toBeCloseTo(800 * 1.22, 6);
  });

  it("scales with the requested size", () => {
    const g = posterGeometry(1600);
    expect(g.bandPx).toBeCloseTo(1600 * 0.22, 6);
  });
});

describe("unitToCanvas", () => {
  it("centres the origin and inverts y (matplotlib axes)", () => {
    const g = posterGeometry(800);
    const [cx, cy] = unitToCanvas(0, 0, g);
    expect(cx).toBeCloseTo(400, 6);
    expect(cy).toBeCloseTo(400, 6);
    const [, top] = unitToCanvas(0, 1, g);
    expect(top).toBeLessThan(cy);
  });

  it("places unit radius at 1/AXIS_EXTENT of the half-extent", () => {
    const g = posterGeometry(800);
    const [x] = unitToCanvas(1, 0, g);
    expect(x - 400).toBeCloseTo((1 / AXIS_EXTENT) * 400, 6);
  });
});

describe("buildPosterSvg", () => {
  it("is a standalone SVG with the poster size and background", () => {
    const svg = buildPosterSvg(makePayload(), makeModel([star()]), 800);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="800"');
    expect(svg).toContain('fill="#0b0f19"');
    expect(svg).toContain("</svg>");
  });

  it("draws one circle per star and the caption as real text", () => {
    const model = makeModel([star(), star({ hip: 2, unitX: 0.2, mag: 3 })]);
    const svg = buildPosterSvg(makePayload(), model, 800);
    expect(svg.match(/<circle /g)?.length).toBeGreaterThanOrEqual(2);
    expect(svg).toContain("Golden Night");
    expect(svg).toContain("40.7580");
    expect(svg).toContain("<text");
  });

  it("omits constellation lines when the option is off", () => {
    const model = makeModel([star(), star({ hip: 2, unitX: 0.2 })]);
    const withLines = buildPosterSvg(makePayload(), model, 800);
    const without = buildPosterSvg(
      makePayload({ constellations: false }),
      model,
      800,
    );
    expect(withLines).toContain("<line ");
    expect(without).not.toContain("<line ");
  });

  it("draws the ring only for the circle shape", () => {
    const model = makeModel([star()]);
    const circle = buildPosterSvg(makePayload(), model, 800);
    const square = buildPosterSvg(makePayload({ shape: "square" }), model, 800);
    expect(circle).toContain('stroke="#f5efe0"');
    expect(square).not.toContain('stroke="#f5efe0"');
  });

  it("escapes the title so a malicious payload cannot inject markup", () => {
    const svg = buildPosterSvg(
      makePayload({ title: '<script>alert("x")</script>' }),
      makeModel([star()]),
      800,
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
});

describe("renderPosterToCanvas", () => {
  it("sizes the backing store to sky + band and honours dpr", () => {
    if (typeof document === "undefined") return; // canvas env only
    const canvas = renderPosterToCanvas(
      makePayload(),
      makeModel([star()]),
      800,
      PREVIEW,
      2,
    );
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(Math.round(800 * 1.22 * 2));
  });
});
