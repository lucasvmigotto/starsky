import { describe, expect, it } from "bun:test";
import { type ExplorerCamera, lookAt, projectToViewport } from "../sky/camera.ts";
import { dirAt, sceneOf } from "./fixture.ts";
import { pickAt, pickConstellationAt } from "./pick.ts";
import type { LabelMark } from "./frame.ts";

const VIEWPORT = { width: 800, height: 600 };

function camera(fovDeg = 60): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
}

function screenOf(cam: ExplorerCamera, altDeg: number, azDeg: number): { x: number; y: number } {
  const p = projectToViewport(cam, dirAt(altDeg, azDeg), VIEWPORT.width, VIEWPORT.height);
  if (!p) throw new Error("off screen");
  return p;
}

describe("pickAt stars", () => {
  const stars = [
    { hip: 1, dir: dirAt(0, 0), mag: 3 },
    { hip: 2, dir: dirAt(0, 3), mag: 1 },
    { hip: 3, dir: dirAt(6, -10), mag: 2 },
  ];

  it("picks the nearest star by angle", () => {
    const { scene, view } = sceneOf(stars);
    const cam = camera();
    const near = screenOf(cam, 0, 0.2);
    expect(pickAt(scene, view, cam, VIEWPORT, near.x + 2, near.y)).toMatchObject({ kind: "star", id: "HIP:1" });
    const other = screenOf(cam, 0, 3);
    expect(pickAt(scene, view, cam, VIEWPORT, other.x - 3, other.y + 1)).toMatchObject({ kind: "star", id: "HIP:2" });
  });

  it("breaks an exact tie toward the brighter star", () => {
    const { scene, view } = sceneOf([
      { hip: 10, dir: dirAt(0, -1), mag: 4 },
      { hip: 11, dir: dirAt(0, 1), mag: 2 },
    ]);
    // The ray through the centre is equidistant from both.
    expect(pickAt(scene, view, camera(), VIEWPORT, 400, 300)).toMatchObject({ id: "HIP:11" });
  });

  it("returns nothing when no star or segment is near", () => {
    const { scene, view } = sceneOf(stars);
    expect(pickAt(scene, view, camera(), VIEWPORT, 20, 20)).toBeNull();
  });

  it("scales its tolerance with the field of view", () => {
    const { scene, view } = sceneOf(stars);
    const wide = camera(100);
    const narrow = camera(5);
    // The same 0.4 degree miss is a few pixels when wide, far too many when narrow.
    const w = screenOf(wide, 0, 0.4);
    expect(pickAt(scene, view, wide, VIEWPORT, w.x, w.y)).toMatchObject({ id: "HIP:1" });
    const n = screenOf(narrow, 0, 0.4);
    expect(pickAt(scene, view, narrow, VIEWPORT, n.x, n.y)).toBeNull();
  });

  it("ignores stars the frame would not draw", () => {
    const { scene, view } = sceneOf([
      { hip: 1, dir: dirAt(0, 0), mag: 8 },
      { hip: 2, dir: dirAt(-0.5, 0.3), mag: 1 },
    ]);
    const cam = camera();
    expect(pickAt(scene, view, cam, VIEWPORT, 400, 300, { magLimit: 6.5 })).toMatchObject({ id: "HIP:2" });
    expect(pickAt(scene, view, cam, VIEWPORT, 400, 300, { magLimit: 6.5, below: "hidden" })).toBeNull();
  });
});

describe("pickAt segments", () => {
  const stars = [
    { hip: 1, dir: dirAt(10, -12), mag: 2 },
    { hip: 2, dir: dirAt(10, 12), mag: 2 },
  ];
  const segments: [string, string, number, number][] = [["Tst", "Test", 1, 2]];

  it("selects the constellation near a line but not a star", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const a = screenOf(cam, 10, -12);
    const b = screenOf(cam, 10, 12);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(pickAt(scene, view, cam, VIEWPORT, mid.x, mid.y + 5)).toEqual({ kind: "constellation", id: "CON:Tst" });
    expect(pickAt(scene, view, cam, VIEWPORT, mid.x, mid.y + 40)).toBeNull();
  });

  it("lets a star beat the segment that ends at it", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const a = screenOf(cam, 10, -12);
    expect(pickAt(scene, view, cam, VIEWPORT, a.x + 4, a.y)).toMatchObject({ kind: "star", id: "HIP:1" });
  });

  it("does not pick lines that are not drawn", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const a = screenOf(cam, 10, -12);
    const b = screenOf(cam, 10, 12);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    expect(pickAt(scene, view, cam, VIEWPORT, x, y, { lines: false })).toBeNull();
  });
});


describe("pickConstellationAt (hover)", () => {
  // Two stars joined by one segment of "Tst", a third star off to the side.
  const stars = [
    { hip: 1, dir: dirAt(0, -10), mag: 2 },
    { hip: 2, dir: dirAt(0, 10), mag: 2 },
    { hip: 3, dir: dirAt(15, 30), mag: 2 },
  ];
  const segments: Parameters<typeof sceneOf>[1] = [["Tst", "Test", 1, 2]];

  function label(x: number, y: number): LabelMark {
    return { id: "CON:Tst", text: "Test", x, y, width: 80, height: 18, selected: false, hover: false, dim: false };
  }

  it("picks a constellation near one of its line segments, by pixel distance", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const a = screenOf(cam, 0, -10);
    const b = screenOf(cam, 0, 10);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [], mid.x, mid.y + 5)).toBe("CON:Tst");
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [], mid.x, mid.y + 40)).toBeNull();
  });

  it("picks it by its label box when the pointer is off every line", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [label(100, 100)], 130, 105)).toBe("CON:Tst");
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [label(100, 100)], 150, 105)).toBeNull();
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [label(100, 100)], 130, 125)).toBeNull();
  });

  it("leaves a star to its own tooltip: over a star there is no constellation hover", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const onStar = screenOf(cam, 0, -10);
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [], onStar.x + 2, onStar.y)).toBeNull();
  });

  it("ignores the lines when that layer is off, but still takes a label", () => {
    const { scene, view } = sceneOf(stars, segments);
    const cam = camera();
    const a = screenOf(cam, 0, -10);
    const b = screenOf(cam, 0, 10);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [], mid.x, mid.y + 3, { lines: false })).toBeNull();
    expect(pickConstellationAt(scene, view, cam, VIEWPORT, [label(mid.x, mid.y)], mid.x, mid.y, { lines: false })).toBe("CON:Tst");
  });
});
