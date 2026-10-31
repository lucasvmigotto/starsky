import { describe, expect, it } from "bun:test";
import {
  type ExplorerCamera,
  FOV_MAX_DEG,
  FOV_MIN_DEG,
  lookAt,
  projectToViewport,
  screenRay,
} from "../sky/camera.ts";
import { initialCamera } from "../sky/observer.ts";
import { rotate } from "../sky/quat.ts";
import { type Vec3, angularDistanceDeg, vecToRaDec } from "../sky/vec.ts";
import { ExplorerController, type ControllerChange } from "./controller.ts";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import type { FramePlan } from "./frame.ts";

const VIEWPORT = { width: 800, height: 600 };

function horizonCamera(fovDeg = 60): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, 0), dirAt(90, 0)), fovDeg };
}

function setup(camera: ExplorerCamera = horizonCamera()) {
  const { scene } = sceneOf(
    [
      { hip: 1, dir: dirAt(0, 0), mag: 1 },
      { hip: 2, dir: dirAt(10, 20), mag: 2 },
      { hip: 3, dir: dirAt(10, 24), mag: 2 },
    ],
    [["Tst", "Test", 2, 3]],
    [[1, "Alpha"]],
  );
  const queue: (() => void)[] = [];
  const plans: FramePlan[] = [];
  const changes: ControllerChange[] = [];
  const controller = new ExplorerController({
    scene,
    ctx: CTX,
    camera,
    magLimit: 6.5,
    viewport: VIEWPORT,
    requestFrame: (cb) => {
      queue.push(cb);
      return queue.length;
    },
    draw: (plan) => {
      plans.push(plan);
    },
  });
  controller.subscribe((c) => changes.push(c));
  const flush = (): number => {
    const run = queue.splice(0);
    run.forEach((cb) => {
      cb();
    });
    return run.length;
  };
  return { controller, queue, plans, changes, flush };
}

function project(camera: ExplorerCamera, v: Vec3): { x: number; y: number } {
  const p = projectToViewport(camera, v, VIEWPORT.width, VIEWPORT.height);
  if (!p) throw new Error("off screen");
  return p;
}

function forward(c: ExplorerCamera) {
  return rotate(c.orientation, [0, 0, -1]);
}

describe("scheduling", () => {
  it("draws once at start, coalesces invalidations and then stays idle", () => {
    const { controller, queue, plans, flush } = setup();
    expect(queue).toHaveLength(1);
    controller.invalidate();
    controller.invalidate();
    expect(queue).toHaveLength(1);
    expect(flush()).toBe(1);
    expect(plans).toHaveLength(1);
    expect(controller.frames).toBe(1);
    expect(queue).toHaveLength(0);
    expect(flush()).toBe(0);
    expect(controller.frames).toBe(1);
  });

  it("requests one frame for a whole burst of pointer moves", () => {
    const { controller, queue, flush } = setup();
    flush();
    controller.pointerDown(1, 100, 100);
    for (let i = 1; i <= 20; i++) controller.pointerMove(1, 100 + i * 5, 100);
    expect(queue).toHaveLength(1);
    flush();
    controller.pointerUp(1, 200, 100);
    flush();
    expect(controller.frames).toBe(2);
  });

  it("ignores a pointer that is not down", () => {
    const { controller, queue, flush } = setup();
    flush();
    controller.pointerMove(1, 10, 10);
    expect(queue).toHaveLength(0);
  });

  it("does not draw after it is disposed", () => {
    const { controller, flush, plans } = setup();
    controller.dispose();
    flush();
    expect(plans).toHaveLength(0);
  });
});

describe("drag and click", () => {
  it("selects the star under a click", () => {
    const { controller, changes } = setup();
    controller.pointerDown(1, 402, 301);
    controller.pointerUp(1, 402, 301);
    expect(controller.getSelection()).toBe("HIP:1");
    expect(changes).toEqual([{ kind: "selection", selection: "HIP:1" }]);
  });

  it("lets the caller turn a tap into no selection at all, and still drags", () => {
    const { controller, changes } = setup();
    controller.pointerDown(1, 402, 301);
    controller.pointerUp(1, 402, 301, { select: false });
    expect(controller.getSelection()).toBeNull();
    expect(changes).toEqual([]);
    // The next tap is a normal one.
    controller.pointerDown(3, 402, 301);
    controller.pointerUp(3, 402, 301);
    expect(controller.getSelection()).toBe("HIP:1");
    // A drag still pans.
    const before = controller.getCamera();
    controller.pointerDown(2, 402, 301);
    controller.pointerMove(2, 450, 340);
    controller.pointerUp(2, 450, 340, { select: false });
    expect(controller.getCamera()).not.toBe(before);
  });

  it("treats a small wobble as a click", () => {
    const { controller } = setup();
    const before = controller.getCamera();
    controller.pointerDown(1, 400, 300);
    controller.pointerMove(1, 403, 300);
    controller.pointerUp(1, 403, 300);
    expect(controller.getSelection()).toBe("HIP:1");
    expect(controller.getCamera()).toEqual(before);
  });

  it("never selects at the end of a drag, and turns the sky with the pointer", () => {
    const { controller, changes } = setup();
    const start = controller.getCamera();
    const grabbed = screenRay(start, 400, 300, 800, 600);
    controller.pointerDown(1, 400, 300);
    controller.pointerMove(1, 450, 340);
    controller.pointerMove(1, 520, 380);
    controller.pointerUp(1, 520, 380);
    expect(controller.getSelection()).toBeNull();
    expect(changes).toEqual([]);
    const under = screenRay(controller.getCamera(), 520, 380, 800, 600);
    expect(angularDistanceDeg(under, grabbed)).toBeLessThan(1e-6);
  });

  it("clears the selection on an empty click and on Escape", () => {
    const { controller } = setup();
    controller.select("HIP:1");
    controller.pointerDown(1, 30, 30);
    controller.pointerUp(1, 30, 30);
    expect(controller.getSelection()).toBeNull();
    controller.select("HIP:1");
    expect(controller.key("Escape")).toBe(true);
    expect(controller.getSelection()).toBeNull();
    expect(controller.key("Escape")).toBe(false);
  });

  it("selects a constellation from a click near its line", () => {
    const { controller } = setup();
    // Between hip 2 and hip 3, a little below the line.
    const p = project(controller.getCamera(), dirAt(10, 22));
    controller.pointerDown(1, p.x, p.y + 4);
    controller.pointerUp(1, p.x, p.y + 4);
    expect(controller.getSelection()).toBe("CON:Tst");
  });

  it("ends a gesture cleanly on pointercancel", () => {
    const { controller } = setup();
    controller.pointerDown(1, 400, 300);
    controller.pointerMove(1, 500, 300);
    controller.pointerCancel(1);
    const after = controller.getCamera();
    controller.pointerMove(1, 600, 300);
    expect(controller.getCamera()).toEqual(after);
    expect(controller.getSelection()).toBeNull();
    const star = project(controller.getCamera(), dirAt(0, 0));
    controller.pointerDown(2, star.x, star.y);
    controller.pointerUp(2, star.x, star.y);
    expect(controller.getSelection()).toBe("HIP:1");
  });
});

describe("crossing a pole", () => {
  it("moves smoothly over the north celestial pole with no jump", () => {
    const camera: ExplorerCamera = {
      orientation: lookAt(
        [Math.cos((88 * Math.PI) / 180), 0, Math.sin((88 * Math.PI) / 180)],
        [0, 0, 1],
      ),
      fovDeg: 60,
    };
    const { controller } = setup(camera);
    let prev = forward(controller.getCamera());
    controller.pointerDown(1, 400, 500);
    let crossed = false;
    for (let y = 490; y >= 50; y -= 10) {
      controller.pointerMove(1, 400, y);
      const f = forward(controller.getCamera());
      expect(angularDistanceDeg(prev, f)).toBeLessThan(2);
      expect(controller.getCamera().fovDeg).toBe(60);
      expect(Math.hypot(...controller.getCamera().orientation)).toBeCloseTo(1, 12);
      const ra = vecToRaDec(f);
      const raPrev = vecToRaDec(prev);
      if (Math.abs(ra.raDeg - raPrev.raDeg) > 90) crossed = true;
      prev = f;
    }
    controller.pointerUp(1, 400, 50);
    expect(crossed).toBe(true);
  });
});

describe("zoom", () => {
  it("anchors wheel zoom at the pointer", () => {
    const { controller } = setup();
    const before = screenRay(controller.getCamera(), 600, 200, 800, 600);
    controller.wheel(-120, 600, 200);
    const after = screenRay(controller.getCamera(), 600, 200, 800, 600);
    expect(controller.getCamera().fovDeg).toBeLessThan(60);
    expect(angularDistanceDeg(before, after)).toBeLessThan(1e-6);
  });

  it("stops at the field of view limits and then stops redrawing", () => {
    const { controller, flush, queue } = setup();
    for (let i = 0; i < 100; i++) controller.wheel(-300, 400, 300);
    expect(controller.getCamera().fovDeg).toBe(FOV_MIN_DEG);
    flush();
    controller.wheel(-300, 400, 300);
    expect(queue).toHaveLength(0);
    for (let i = 0; i < 200; i++) controller.wheel(300, 400, 300);
    expect(controller.getCamera().fovDeg).toBe(FOV_MAX_DEG);
  });

  it("pinches around the centroid", () => {
    const { controller } = setup();
    const anchor = screenRay(controller.getCamera(), 400, 300, 800, 600);
    controller.pointerDown(1, 300, 300);
    controller.pointerDown(2, 500, 300);
    controller.pointerMove(1, 250, 300);
    controller.pointerMove(2, 550, 300);
    expect(controller.getCamera().fovDeg).toBeCloseTo((60 * 200) / 300, 6);
    expect(angularDistanceDeg(screenRay(controller.getCamera(), 400, 300, 800, 600), anchor)).toBeLessThan(1e-6);
    controller.pointerUp(1, 250, 300);
    controller.pointerUp(2, 550, 300);
    expect(controller.getSelection()).toBeNull();
  });

  it("carries on as a drag when one finger lifts, without selecting", () => {
    const { controller } = setup();
    controller.pointerDown(1, 300, 300);
    controller.pointerDown(2, 500, 300);
    controller.pointerUp(1, 300, 300);
    const before = controller.getCamera();
    controller.pointerMove(2, 520, 300);
    expect(controller.getCamera()).not.toEqual(before);
    controller.pointerUp(2, 520, 300);
    expect(controller.getSelection()).toBeNull();
  });
});

describe("keys", () => {
  it("rotates with the arrows, toward where the arrow points", () => {
    const { controller } = setup();
    const start = forward(controller.getCamera());
    expect(controller.key("ArrowLeft")).toBe(true);
    const left = forward(controller.getCamera());
    expect(angularDistanceDeg(start, left)).toBeGreaterThan(1);
    controller.key("ArrowRight");
    expect(angularDistanceDeg(start, forward(controller.getCamera()))).toBeLessThan(1e-6);
    controller.key("ArrowUp");
    const up = forward(controller.getCamera());
    // Looking up raises the altitude of the view centre.
    expect(up[0] * dirAt(90, 0)[0] + up[1] * dirAt(90, 0)[1] + up[2] * dirAt(90, 0)[2]).toBeGreaterThan(0);
  });

  it("zooms with plus and minus and resets with 0", () => {
    const { controller } = setup();
    controller.key("+");
    expect(controller.getCamera().fovDeg).toBeLessThan(60);
    controller.key("-");
    controller.key("-");
    expect(controller.getCamera().fovDeg).toBeGreaterThan(60);
    controller.key("ArrowLeft");
    controller.key("0");
    expect(controller.getCamera()).toEqual(initialCamera(CTX));
  });

  it("does not claim keys it does not use", () => {
    const { controller } = setup();
    expect(controller.key("a")).toBe(false);
    expect(controller.key("Tab")).toBe(false);
  });
});

describe("double-click", () => {
  it("centres on the star under the pointer without changing the zoom", () => {
    const { controller } = setup();
    const p = project(controller.getCamera(), dirAt(10, 20));
    controller.doubleClick(p.x + 2, p.y);
    const centre = forward(controller.getCamera());
    expect(angularDistanceDeg(centre, dirAt(10, 20))).toBeLessThan(1e-6);
    expect(controller.getCamera().fovDeg).toBe(60);
  });

  it("centres on the point under the pointer when nothing is there", () => {
    const { controller } = setup();
    const ray = screenRay(controller.getCamera(), 100, 100, 800, 600);
    controller.doubleClick(100, 100);
    expect(angularDistanceDeg(forward(controller.getCamera()), ray)).toBeLessThan(1e-6);
  });
});

describe("selection and layers", () => {
  it("publishes a selection only when it changes", () => {
    const { controller, changes } = setup();
    controller.select("HIP:1");
    controller.select("HIP:1");
    controller.select(null);
    expect(changes).toEqual([
      { kind: "selection", selection: "HIP:1" },
      { kind: "selection", selection: null },
    ]);
  });

  it("ignores a selection that is not in the scene", () => {
    const { controller } = setup();
    controller.select("HIP:999999");
    expect(controller.getSelection()).toBeNull();
  });

  it("does not publish camera movement", () => {
    const { controller, changes } = setup();
    controller.pointerDown(1, 400, 300);
    controller.pointerMove(1, 500, 350);
    controller.pointerUp(1, 500, 350);
    controller.wheel(-100, 400, 300);
    controller.key("ArrowLeft");
    expect(changes).toEqual([]);
  });
});

describe("planning", () => {
  it("hands the renderer a plan for the current camera", () => {
    const { controller, plans, flush } = setup();
    flush();
    expect(plans[0]?.stars.length).toBeGreaterThan(0);
    controller.select("HIP:1");
    flush();
    expect(plans[1]?.marks[0]).toMatchObject({ kind: "selected", label: "Alpha" });
  });

  it("follows a resize", () => {
    const { controller, plans, flush } = setup();
    flush();
    controller.setViewport(400, 300);
    flush();
    expect(plans).toHaveLength(2);
  });
});
