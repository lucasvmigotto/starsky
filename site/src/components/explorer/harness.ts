/**
 * Test-only: a controller over a small sky with a manual frame queue and
 * timers, so component tests can drive the camera without a canvas.
 */
import { type ExplorerCamera, lookAt } from "../../lib/sky/camera.ts";
import { ExplorerController } from "../../lib/explorer/controller.ts";
import { CTX, type PlacedStar, dirAt, sceneOf } from "../../lib/explorer/fixture.ts";
import type { SegmentRow } from "../../lib/skymodel.ts";
import { at } from "../../lib/testing.ts";

export interface HarnessSky {
  stars: readonly PlacedStar[];
  segments: readonly SegmentRow[];
  names?: readonly (readonly [number, string])[];
}

/** HIP 1 at the view's centre and HIP 2 up and to the right, joined as "Test". */
const DEFAULT_SKY: HarnessSky = {
  stars: [
    { hip: 1, dir: dirAt(0, 0), mag: 1 },
    { hip: 2, dir: dirAt(10, 20), mag: 2 },
  ],
  segments: [["Tst", "Test", 1, 2]],
};

export function makeController(fovDeg = 60, sky: HarnessSky = DEFAULT_SKY) {
  const { scene } = sceneOf(sky.stars, sky.segments, sky.names);
  const camera: ExplorerCamera = { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
  const frames: (() => void)[] = [];
  const timers: { callback: () => void; cleared: boolean }[] = [];
  const controller = new ExplorerController({
    scene,
    ctx: CTX,
    camera,
    magLimit: 6.5,
    viewport: { width: 800, height: 600 },
    requestFrame: (cb) => frames.push(cb),
    draw: () => undefined,
    setTimer: (callback) => timers.push({ callback, cleared: false }) - 1,
    clearTimer: (handle) => {
      at(timers, handle).cleared = true;
    },
  });
  /** Let the controller settle, as if its quiet period had passed. */
  const settle = (): void => {
    const pending = timers.filter((t) => !t.cleared);
    const last = at(pending, pending.length - 1);
    last.cleared = true;
    last.callback();
  };
  return { controller, scene, settle };
}
