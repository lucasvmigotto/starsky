import { describe, expect, it } from "bun:test";
import { type ExplorerCamera, lookAt } from "../sky/camera.ts";
import { dirAt, sceneOf } from "./fixture.ts";
import { type LabelMark, planFrame } from "./frame.ts";
import { DEFAULT_LAYERS } from "./layers.ts";
import { at } from "../testing.ts";

function horizonCamera(fovDeg = 90): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
}

/** `count` two-star constellations scattered deterministically around the view centre. */
function crowded(count: number) {
  const stars = [];
  const segments: [string, string, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const alt = 3 + ((i * 7) % 19);
    const az = -25 + ((i * 11) % 50);
    stars.push({ hip: 100 + i * 2, dir: dirAt(alt, az), mag: 1 + i * 0.05 });
    stars.push({ hip: 101 + i * 2, dir: dirAt(alt + 1, az + 1), mag: 3 });
    segments.push([`C${String(i)}`, `Constellation${String(i)}`, 100 + i * 2, 101 + i * 2]);
  }
  return sceneOf(stars, segments);
}

function labelsFor(
  world: ReturnType<typeof crowded>,
  viewport: { width: number; height: number },
  extra: { selection?: string | null; fov?: number } = {},
): LabelMark[] {
  return planFrame({
    ...world,
    camera: horizonCamera(extra.fov),
    viewport,
    layers: DEFAULT_LAYERS,
    magLimit: 6.5,
    selection: extra.selection ?? null,
    hover: null,
  }).labels;
}

function overlap(a: LabelMark, b: LabelMark): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2
  );
}

describe("constellation labels", () => {
  it("never overlap, even in a crowded sky", () => {
    const labels = labelsFor(crowded(40), { width: 1440, height: 900 });
    expect(labels.length).toBeGreaterThan(1);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = at(labels, i);
        const b = at(labels, j);
        expect(overlap(a, b)).toBe(false);
      }
    }
  });

  it("thin out more on a small viewport", () => {
    const world = crowded(40);
    const large = labelsFor(world, { width: 1440, height: 900 });
    const small = labelsFor(world, { width: 390, height: 844 });
    expect(small.length).toBeLessThan(large.length);
    expect(small.length).toBeGreaterThan(0);
  });

  it("keeps every label inside the viewport", () => {
    const viewport = { width: 390, height: 844 };
    for (const l of labelsFor(crowded(40), viewport)) {
      expect(l.x - l.width / 2).toBeGreaterThanOrEqual(0);
      expect(l.x + l.width / 2).toBeLessThanOrEqual(viewport.width);
    }
  });

  it("places the brightest constellation first when two collide", () => {
    const world = sceneOf(
      [
        { hip: 1, dir: dirAt(5, 0), mag: 3 },
        { hip: 2, dir: dirAt(5.2, 0.2), mag: 3 },
        { hip: 3, dir: dirAt(5, 0.1), mag: 0.5 },
        { hip: 4, dir: dirAt(5.2, 0.3), mag: 3 },
      ],
      [
        ["Dim", "Dimmer", 1, 2],
        ["Bri", "Brighter", 3, 4],
      ],
    );
    const labels = labelsFor(world, { width: 1440, height: 900 });
    expect(labels.map((l) => l.id)).toEqual(["CON:Bri"]);
  });

  it("places the selected constellation first and marks it", () => {
    const world = sceneOf(
      [
        { hip: 1, dir: dirAt(5, 0), mag: 3 },
        { hip: 2, dir: dirAt(5.2, 0.2), mag: 3 },
        { hip: 3, dir: dirAt(5, 0.1), mag: 0.5 },
        { hip: 4, dir: dirAt(5.2, 0.3), mag: 3 },
      ],
      [
        ["Dim", "Dimmer", 1, 2],
        ["Bri", "Brighter", 3, 4],
      ],
    );
    const labels = labelsFor(world, { width: 1440, height: 900 }, { selection: "CON:Dim" });
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ id: "CON:Dim", selected: true });
  });

  it("sits at the mean of the members on screen", () => {
    const world = sceneOf(
      [
        { hip: 1, dir: dirAt(0, -2), mag: 2 },
        { hip: 2, dir: dirAt(0, 2), mag: 2 },
        { hip: 3, dir: dirAt(0, 180), mag: 2 },
      ],
      [
        ["Tst", "Test", 1, 2],
        ["Tst", "Test", 2, 3],
      ],
    );
    const label = at(labelsFor(world, { width: 800, height: 600 }, { fov: 60 }), 0);
    expect(label.text).toBe("Test");
    expect(label.x).toBeCloseTo(400, 3);
    expect(label.y).toBeCloseTo(300, 3);
  });

  it("is dimmed when every member is below the horizon, and absent when hidden", () => {
    const world = sceneOf(
      [
        { hip: 1, dir: dirAt(-8, -2), mag: 2 },
        { hip: 2, dir: dirAt(-8, 2), mag: 2 },
      ],
      [["Tst", "Test", 1, 2]],
    );
    const base = { ...world, camera: horizonCamera(60), viewport: { width: 800, height: 600 }, magLimit: 6.5, selection: null, hover: null };
    expect(planFrame({ ...base, layers: DEFAULT_LAYERS }).labels[0]?.dim).toBe(true);
    expect(planFrame({ ...base, layers: { ...DEFAULT_LAYERS, below: "hidden" } }).labels).toEqual([]);
    expect(planFrame({ ...base, layers: { ...DEFAULT_LAYERS, constellationLabels: false } }).labels).toEqual([]);
  });
});
