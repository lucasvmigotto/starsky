import { describe, expect, it } from "bun:test";
import { createCanvas } from "@napi-rs/canvas";
import { explorer } from "../../../design/tokens.ts";
import { parseHex } from "../../../design/contrast.ts";
import { type ExplorerCamera, lookAt } from "../../sky/camera.ts";
import { dirAt, sceneOf } from "../fixture.ts";
import { type FrameInput, type FramePlan, planFrame } from "../frame.ts";
import { DEFAULT_LAYERS } from "../layers.ts";
import { Canvas2dRenderer, MAX_BACKING_PIXELS } from "./canvas2d.ts";
import { at } from "../../testing.ts";

function camera(fovDeg = 60): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
}

function plan(width: number, height: number, overrides: Partial<FrameInput> = {}): FramePlan {
  const world = sceneOf(
    [
      { hip: 1, dir: dirAt(4, -6), mag: -1 },
      { hip: 2, dir: dirAt(-4, 6), mag: -1 },
      { hip: 3, dir: dirAt(8, 6), mag: 2 },
    ],
    [["Tst", "Test", 1, 3]],
  );
  return planFrame({
    ...world,
    camera: camera(),
    viewport: { width, height },
    layers: DEFAULT_LAYERS,
    magLimit: 6.5,
    selection: null,
    hover: null,
    ...overrides,
  });
}

function setup(width: number, height: number, dpr = 1) {
  const canvas = createCanvas(1, 1);
  const renderer = new Canvas2dRenderer(canvas as unknown as HTMLCanvasElement);
  const draw = (p: FramePlan, w = width, h = height, d = dpr): void => {
    renderer.render(p, { width: w, height: h, dpr: d });
  };
  const pixel = (x: number, y: number): readonly [number, number, number] => {
    const data = canvas.getContext("2d").getImageData(x, y, 1, 1).data;
    return [at(data, 0), at(data, 1), at(data, 2)];
  };
  return { canvas, renderer, draw, pixel };
}

const luma = ([r, g, b]: readonly [number, number, number]): number => r + g + b;

describe("Canvas2dRenderer", () => {
  it("clears to the sky colour and draws stars where the plan says", () => {
    const { draw, pixel } = setup(400, 300);
    const p = plan(400, 300);
    draw(p);
    expect(pixel(2, 2)).toEqual(parseHex(explorer.background));
    const bright = p.stars.flatMap((b) => (b.dim ? [] : b.xy)).slice(0, 2);
    const [x, y] = bright as [number, number];
    expect(luma(pixel(Math.round(x), Math.round(y)))).toBeGreaterThan(luma(parseHex(explorer.background)) + 300);
  });

  it("draws a star below the horizon dimmer than one above it", () => {
    const { draw, pixel } = setup(400, 300);
    const p = plan(400, 300);
    draw(p);
    const above = p.stars.find((b) => !b.dim && b.glow);
    const below = p.stars.find((b) => b.dim);
    expect(above).toBeDefined();
    expect(below).toBeDefined();
    const a = above?.xy ?? [0, 0];
    const b = below?.xy ?? [0, 0];
    expect(luma(pixel(Math.round(b[0] ?? 0), Math.round(b[1] ?? 0)))).toBeLessThan(
      luma(pixel(Math.round(a[0] ?? 0), Math.round(a[1] ?? 0))),
    );
  });

  it("draws the selection ring in the selection colour", () => {
    const { draw, pixel } = setup(400, 300);
    const p = plan(400, 300, { selection: "HIP:3" });
    draw(p);
    expect(p.marks).toHaveLength(1);
    const { x, y, radius } = at(p.marks, 0);
    const [tr, tg, tb] = parseHex(explorer.selection);
    // The ring is 2 px wide and the plan is fractional, so look across it.
    let nearest = Infinity;
    for (let dx = -2; dx <= 2; dx++) {
      const [r, g, b] = pixel(Math.round(x + radius) + dx, Math.round(y));
      nearest = Math.min(nearest, Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb));
    }
    expect(nearest).toBeLessThan(60);
  });

  it("sizes the backing store to the viewport and survives resizes", () => {
    const { canvas, draw } = setup(400, 300, 2);
    draw(plan(400, 300), 400, 300, 2);
    expect([canvas.width, canvas.height]).toEqual([800, 600]);
    draw(plan(200, 500), 200, 500, 1);
    expect([canvas.width, canvas.height]).toEqual([200, 500]);
    draw(plan(0, 0), 0, 0, 1);
    expect(canvas.width).toBeGreaterThan(0);
  });

  it("caps the device pixel ratio at 2 and the backing store by area", () => {
    const { canvas, draw } = setup(400, 300);
    draw(plan(400, 300), 400, 300, 3);
    expect(canvas.width).toBe(800);
    draw(plan(100, 100), 12_000, 9_000, 2);
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(MAX_BACKING_PIXELS);
  });

  it("leaves the context in a clean state after each frame", () => {
    const { canvas, draw } = setup(400, 300);
    draw(plan(400, 300, { selection: "CON:Tst", layers: { ...DEFAULT_LAYERS, equatorialGrid: true } }));
    const ctx = canvas.getContext("2d");
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.getTransform().a).toBe(1);
  });

  it("draws nothing once disposed", () => {
    const { renderer, canvas } = setup(400, 300);
    renderer.dispose();
    expect(() => {
      renderer.render(plan(400, 300), { width: 400, height: 300, dpr: 1 });
    }).not.toThrow();
    expect(canvas.width).toBe(1);
  });
});
