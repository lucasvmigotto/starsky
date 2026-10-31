/**
 * The story format on the canvas path (BCR-0012, 012 T001), through the same
 * `@napi-rs/canvas` the reference suite uses.
 *
 * What it pins: the canvas is exactly 1080 x 1920, the margins above and below
 * are equal and pure background (the circle mask must not clear them), and the
 * poster inside is the standard 1080 poster, pixel for pixel.
 */
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import type { SharePayload } from "../share.ts";
import { DISK_CX, DISK_CY, DISK_R, type SkyModel, type VisibleStar } from "../skymodel.ts";
import { SPEC } from "../spec.ts";
import { storyMargin } from "./format.ts";
import { renderPoster, renderStory } from "./poster.ts";

const FONT = join(import.meta.dirname, "..", "..", "..", "..", "assets", "fonts", "CormorantGaramond.ttf");
if (!GlobalFonts.has("Cormorant Garamond")) {
  GlobalFonts.registerFromPath(FONT, "Cormorant Garamond");
}

const PREVIEW = { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R };
const BG = [0x0b, 0x0f, 0x19, 255];
const W = 1080;
const H = 1920;

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
  segments: [{ a: 0, b: 1, figure: 0 }],
  when: new Date("2026-01-01T00:00:00Z"),
};

function payload(shape: "circle" | "square"): SharePayload {
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
      shape,
      title: "Story Night",
    },
  };
}

function story(shape: "circle" | "square"): Uint8ClampedArray {
  const canvas = createCanvas(W, H);
  renderStory(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, payload(shape), MODEL, PREVIEW);
  return canvas.getContext("2d").getImageData(0, 0, W, H).data;
}

function standard(shape: "circle" | "square"): { data: Uint8ClampedArray; height: number } {
  const height = Math.round(W * (1 + SPEC.caption.bandFraction));
  const canvas = createCanvas(W, height);
  renderPoster(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, payload(shape), MODEL, W, 1, PREVIEW);
  return { data: canvas.getContext("2d").getImageData(0, 0, W, height).data, height };
}

function rowIsBackground(data: Uint8ClampedArray, y: number): boolean {
  for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4;
    for (let c = 0; c < 4; c += 1) if (data[i + c] !== BG[c]) return false;
  }
  return true;
}

describe("story canvas (1080 x 1920)", () => {
  for (const shape of ["circle", "square"] as const) {
    it(`${shape}: margins are equal and pure background`, () => {
      const data = story(shape);
      const margin = storyMargin(W);
      expect(margin).toBeGreaterThan(0);
      for (let y = 0; y < margin; y += 1) expect(rowIsBackground(data, y)).toBe(true);
      const { height } = standard(shape);
      const bottomStart = margin + height;
      expect(H - bottomStart).toBe(margin);
      for (let y = bottomStart; y < H; y += 1) expect(rowIsBackground(data, y)).toBe(true);
    });
  }

  it("square: the poster region equals the standard 1080 render", () => {
    const data = story("square");
    const { data: std, height } = standard("square");
    const margin = storyMargin(W);
    let differing = 0;
    // The standard canvas is 1318 rows for a 1317.6 px poster, so its last row
    // is only partly covered (and transparent underneath); in the story it
    // sits on the background. Every other row is identical.
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < W * 4; x += 1) {
        if (data[(margin + y) * W * 4 + x] !== std[y * W * 4 + x]) differing += 1;
      }
    }
    expect(differing).toBe(0);
  });

  it("circle: matches the standard render (to rounding) wherever it is opaque; the corners are background", () => {
    const data = story("circle");
    const { data: std, height } = standard("circle");
    const margin = storyMargin(W);
    let worst = 0;
    let transparentSeen = 0;
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const s = (y * W + x) * 4;
        const d = ((margin + y) * W + x) * 4;
        if (std[s + 3] === 255) {
          for (let c = 0; c < 4; c += 1) worst = Math.max(worst, Math.abs((data[d + c] ?? 0) - (std[s + c] ?? 0)));
        } else if (std[s + 3] === 0) {
          transparentSeen += 1;
          for (let c = 0; c < 4; c += 1) expect(data[d + c]).toBe(BG[c]);
        }
      }
    }
    expect(transparentSeen).toBeGreaterThan(0);
    // The disc edge is anti-aliased from float path coordinates that shift by
    // a bit when the origin moves, so edge pixels may differ by rounding.
    expect(worst).toBeLessThanOrEqual(2);
    // Fully opaque everywhere.
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) throw new Error(`pixel ${((i - 3) / 4).toString()} is not opaque`);
    }
  });

  it("draws the caption inside the band", () => {
    const data = story("circle");
    const margin = storyMargin(W);
    const band = margin + W;
    let ink = 0;
    for (let y = band; y < band + 200; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (data[(y * W + x) * 4] !== BG[0]) ink += 1;
      }
    }
    expect(ink).toBeGreaterThan(100);
  });
});
