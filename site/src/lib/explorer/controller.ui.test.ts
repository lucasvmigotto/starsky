import { describe, expect, it } from "bun:test";
import { type ExplorerCamera, FOV_MAX_DEG, FOV_MIN_DEG, lookAt, projectToViewport } from "../sky/camera.ts";
import { rotate } from "../sky/quat.ts";
import { angularDistanceDeg, normalizeVec } from "../sky/vec.ts";
import { type ControllerChange, ExplorerController, SETTLE_MS } from "./controller.ts";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import type { FramePlan } from "./frame.ts";

const VIEWPORT = { width: 800, height: 600 };

function horizonCamera(fovDeg = 60): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
}

interface FakeTimer {
  callback: () => void;
  ms: number;
  cancelled: boolean;
  fired: boolean;
}

function setup(options: { timers?: boolean; camera?: ExplorerCamera } = {}) {
  const a = dirAt(10, 20);
  const b = dirAt(30, 60);
  const { scene } = sceneOf(
    [
      { hip: 1, dir: dirAt(0, 0), mag: 1 },
      { hip: 2, dir: a, mag: 2 },
      { hip: 3, dir: b, mag: 2 },
    ],
    [["Tst", "Test", 2, 3]],
  );
  const queue: (() => void)[] = [];
  const plans: FramePlan[] = [];
  const changes: ControllerChange[] = [];
  const timers: FakeTimer[] = [];
  const controller = new ExplorerController({
    scene,
    ctx: CTX,
    camera: options.camera ?? horizonCamera(),
    magLimit: 6.5,
    viewport: VIEWPORT,
    requestFrame: (cb) => {
      queue.push(cb);
      return queue.length;
    },
    draw: (plan) => {
      plans.push(plan);
    },
    ...(options.timers === false
      ? {}
      : {
          setTimer: (callback: () => void, ms: number) => {
            timers.push({ callback, ms, cancelled: false, fired: false });
            return timers.length - 1;
          },
          clearTimer: (handle: number) => {
            timers[handle].cancelled = true;
          },
        }),
  });
  controller.subscribe((c) => changes.push(c));
  const flush = (): void => {
    queue.splice(0).forEach((cb) => {
      cb();
    });
  };
  const live = (): FakeTimer[] => timers.filter((t) => !t.cancelled && !t.fired);
  const fire = (): void => {
    const pending = live();
    const timer = pending[pending.length - 1];
    timer.fired = true;
    timer.callback();
  };
  return { controller, scene, a, b, plans, changes, flush, timers, live, fire };
}

function forward(c: ExplorerCamera) {
  return rotate(c.orientation, [0, 0, -1]);
}

describe("centerOn", () => {
  it("puts a star at the middle of the view and keeps the zoom", () => {
    const { controller, a } = setup();
    expect(controller.centerOn("HIP:2")).toBe(true);
    const camera = controller.getCamera();
    expect(camera.fovDeg).toBe(60);
    const p = projectToViewport(camera, a, VIEWPORT.width, VIEWPORT.height);
    expect(p?.x).toBeCloseTo(400, 3);
    expect(p?.y).toBeCloseTo(300, 3);
  });

  it("centres a constellation on the centroid of its member vectors", () => {
    const { controller, a, b } = setup();
    expect(controller.centerOn("CON:Tst")).toBe(true);
    const centroid = normalizeVec([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
    expect(angularDistanceDeg(forward(controller.getCamera()), centroid)).toBeLessThan(1e-6);
  });

  it("is instant: one request, no animation", () => {
    const { controller, flush, plans } = setup();
    flush();
    controller.centerOn("HIP:3");
    flush();
    expect(plans).toHaveLength(2);
  });

  it("does nothing for an id the scene does not hold", () => {
    const { controller } = setup();
    const before = controller.getCamera();
    expect(controller.centerOn("HIP:999")).toBe(false);
    expect(controller.centerOn("CON:Nope")).toBe(false);
    expect(controller.getCamera()).toBe(before);
  });
});

describe("setLayer", () => {
  it("changes the layer and asks for a frame that reflects it", () => {
    const { controller, flush, plans } = setup();
    flush();
    expect(plans[plans.length - 1]?.horizon.length).toBeGreaterThan(0);
    controller.setLayer("horizon", false);
    expect(controller.getLayers().horizon).toBe(false);
    flush();
    expect(plans[plans.length - 1]?.horizon).toEqual([]);
  });

  it("takes the below mode too", () => {
    const { controller } = setup();
    controller.setLayer("below", "hidden");
    expect(controller.getLayers().below).toBe("hidden");
  });

  it("does not redraw for the value it already has", () => {
    const { controller, flush, plans } = setup();
    flush();
    controller.setLayer("horizon", true);
    flush();
    expect(plans).toHaveLength(1);
  });
});

describe("zoomBy", () => {
  it("zooms in and out by key steps and stops at the limits", () => {
    const { controller } = setup();
    controller.zoomBy(1);
    expect(controller.getCamera().fovDeg).toBeCloseTo(48, 6);
    controller.zoomBy(-1);
    expect(controller.getCamera().fovDeg).toBeCloseTo(60, 6);
    for (let i = 0; i < 30; i++) controller.zoomBy(1);
    expect(controller.getCamera().fovDeg).toBe(FOV_MIN_DEG);
    for (let i = 0; i < 40; i++) controller.zoomBy(-1);
    expect(controller.getCamera().fovDeg).toBe(FOV_MAX_DEG);
  });

  it("asks for no frame at a limit", () => {
    const { controller, flush, plans } = setup({ camera: horizonCamera(FOV_MIN_DEG) });
    flush();
    controller.zoomBy(1);
    flush();
    expect(plans).toHaveLength(1);
  });
});

describe("settled", () => {
  it("fires once, SETTLE_MS after the last change", () => {
    const { controller, live, fire, changes } = setup();
    expect(SETTLE_MS).toBe(500);
    controller.zoomBy(1);
    controller.zoomBy(1);
    expect(live()).toHaveLength(1);
    expect(live()[0]?.ms).toBe(500);
    expect(changes).toEqual([]);
    fire();
    expect(changes).toEqual([{ kind: "settled" }]);
    expect(live()).toHaveLength(0);
  });

  it("restarts the wait on every change", () => {
    const { controller, timers } = setup();
    controller.zoomBy(1);
    controller.centerOn("HIP:2");
    controller.setLayer("horizon", false);
    expect(timers).toHaveLength(3);
    expect(timers.filter((t) => t.cancelled)).toHaveLength(2);
  });

  it("counts a selection change", () => {
    const { controller, live } = setup();
    controller.select("HIP:1");
    expect(live()).toHaveLength(1);
  });

  it("does not fire while a pointer is down, and waits again", () => {
    const { controller, fire, changes, live } = setup();
    controller.pointerDown(1, 100, 100);
    controller.pointerMove(1, 160, 100);
    fire();
    expect(changes.filter((c) => c.kind === "settled")).toHaveLength(0);
    expect(live()).toHaveLength(1);
    controller.pointerUp(1, 160, 100);
    fire();
    expect(changes.filter((c) => c.kind === "settled")).toHaveLength(1);
  });

  it("is silent without timers, and after dispose", () => {
    const quiet = setup({ timers: false });
    quiet.controller.zoomBy(1);
    expect(quiet.changes).toEqual([]);
    const { controller, live } = setup();
    controller.zoomBy(1);
    controller.dispose();
    expect(live()).toHaveLength(0);
  });
});
