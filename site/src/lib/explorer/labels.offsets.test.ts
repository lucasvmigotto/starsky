import { describe, expect, it } from "bun:test";
import { type ExplorerCamera, lookAt, projectToViewport } from "../sky/camera.ts";
import { add, normalizeVec, scale } from "../sky/vec.ts";
import { dirAt, sceneOf } from "./fixture.ts";
import { type LabelMark, planFrame } from "./frame.ts";
import { DEFAULT_LAYERS } from "./layers.ts";

const VIEWPORT = { width: 1000, height: 800 };

function camera(): ExplorerCamera {
  return { orientation: lookAt(dirAt(12, 0), dirAt(90, 0)), fovDeg: 60 };
}

/** A two-star constellation with a lone star of the given magnitude at its middle. */
function world(middleMag: number) {
  const a = dirAt(10, -3);
  const b = dirAt(14, 3);
  const middle = normalizeVec(add(scale(a, 0.5), scale(b, 0.5)));
  const built = sceneOf(
    [
      { hip: 1, dir: a, mag: 4 },
      { hip: 2, dir: b, mag: 4 },
      { hip: 3, dir: middle, mag: middleMag },
    ],
    [["Tst", "Teststar", 1, 2]],
  );
  return { ...built, middle };
}

function label(w: ReturnType<typeof world>): LabelMark {
  const plan = planFrame({
    scene: w.scene,
    view: w.view,
    camera: camera(),
    viewport: VIEWPORT,
    layers: DEFAULT_LAYERS,
    magLimit: 6.5,
    selection: null,
    hover: null,
  });
  return plan.labels[0];
}

function covers(mark: LabelMark, x: number, y: number): boolean {
  return Math.abs(mark.x - x) < mark.width / 2 && Math.abs(mark.y - y) < mark.height / 2;
}

describe("label offsets", () => {
  it("leaves a label where it is when only a faint star is under it", () => {
    const faint = label(world(3));
    const none = label(world(9));
    expect(faint.x).toBeCloseTo(none.x, 6);
    expect(faint.y).toBeCloseTo(none.y, 6);
  });

  it("moves a label off a star of magnitude 2 or brighter", () => {
    const w = world(1);
    const mark = label(w);
    const star = projectToViewport(camera(), w.middle, VIEWPORT.width, VIEWPORT.height);
    expect(star).not.toBeNull();
    expect(covers(mark, star?.x ?? 0, star?.y ?? 0)).toBe(false);
    const home = label(world(9));
    expect(Math.hypot(mark.x - home.x, mark.y - home.y)).toBeLessThan(80);
  });

  it("also moves for a star exactly at magnitude 2", () => {
    const w = world(2);
    const star = projectToViewport(camera(), w.middle, VIEWPORT.width, VIEWPORT.height);
    expect(covers(label(w), star?.x ?? 0, star?.y ?? 0)).toBe(false);
  });

  it("is deterministic", () => {
    const a = label(world(1));
    const b = label(world(1));
    expect(a).toEqual(b);
  });

  it("keeps the label inside the viewport", () => {
    const mark = label(world(1));
    expect(mark.x - mark.width / 2).toBeGreaterThanOrEqual(0);
    expect(mark.x + mark.width / 2).toBeLessThanOrEqual(VIEWPORT.width);
    expect(mark.y - mark.height / 2).toBeGreaterThanOrEqual(0);
    expect(mark.y + mark.height / 2).toBeLessThanOrEqual(VIEWPORT.height);
  });
});
