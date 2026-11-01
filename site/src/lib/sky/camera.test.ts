import { describe, expect, it } from "bun:test";
import {
  FOV_DEFAULT_DEG,
  FOV_MAX_DEG,
  FOV_MIN_DEG,
  NEAR_PLANE,
  clampFov,
  clipSegmentToNearPlane,
  focalPx,
  lookAt,
  projectToViewport,
  rotateByDrag,
  screenRay,
  worldToCamera,
  zoomAnchored,
  type ExplorerCamera,
} from "./camera.ts";
import { type Quat, multiply, normalize, fromAxisAngle, rotate } from "./quat.ts";
import { angularDistanceDeg, raDecToVec, vecToRaDec, type Vec3 } from "./vec.ts";

const W = 800;
const H = 600;

function cameraAt(raDeg: number, decDeg: number, fovDeg = 90): ExplorerCamera {
  return { orientation: lookAt(raDecToVec(raDeg, decDeg), [0, 0, 1]), fovDeg };
}

function proj(cam: ExplorerCamera, raDeg: number, decDeg: number) {
  return projectToViewport(cam, raDecToVec(raDeg, decDeg), W, H);
}

describe("constants and clamp", () => {
  it("matches ADR-0006", () => {
    expect(FOV_MIN_DEG).toBe(5);
    expect(FOV_MAX_DEG).toBe(120);
    expect(FOV_DEFAULT_DEG).toBe(100);
    expect(NEAR_PLANE).toBe(0.01);
    expect(clampFov(1)).toBe(5);
    expect(clampFov(500)).toBe(120);
    expect(clampFov(60)).toBe(60);
  });

  it("derives focal length from the shorter side", () => {
    expect(focalPx(90, 800, 600)).toBeCloseTo(300, 9);
    expect(focalPx(90, 600, 800)).toBeCloseTo(300, 9);
  });
});

describe("handedness", () => {
  it("projects the view center to the viewport center", () => {
    const p = proj(cameraAt(0, 0), 0, 0);
    expect(p?.x).toBeCloseTo(W / 2, 9);
    expect(p?.y).toBeCloseTo(H / 2, 9);
  });

  it("puts RA +10 LEFT of center and Dec +10 above it with north up", () => {
    const cam = cameraAt(0, 0);
    const east = proj(cam, 10, 0);
    const west = proj(cam, -10, 0);
    const north = proj(cam, 0, 10);
    if (!east || !west || !north) throw new Error("projection failed");
    expect(east.x).toBeLessThan(W / 2);
    expect(east.y).toBeCloseTo(H / 2, 9);
    expect(west.x).toBeGreaterThan(W / 2);
    expect(north.y).toBeLessThan(H / 2);
    expect(north.x).toBeCloseTo(W / 2, 9);
    // gnomonic: f * tan(10 deg)
    const f = focalPx(90, W, H);
    expect(W / 2 - east.x).toBeCloseTo(f * Math.tan((10 * Math.PI) / 180), 9);
  });
});

describe("poles and wrap", () => {
  it("is finite at both celestial poles", () => {
    for (const dec of [90, -90]) {
      const cam = cameraAt(0, dec);
      for (let ra = 0; ra < 360; ra += 15) {
        for (const d of [dec, dec * 0.9, dec * 0.5]) {
          const p = proj(cam, ra, d);
          expect(p).not.toBeNull();
          expect(Number.isFinite(p?.x)).toBe(true);
          expect(Number.isFinite(p?.y)).toBe(true);
        }
      }
    }
  });

  it("places the pole at the center when looking at it", () => {
    const p = proj(cameraAt(0, 90), 123, 90);
    expect(p?.x).toBeCloseTo(W / 2, 9);
    expect(p?.y).toBeCloseTo(H / 2, 9);
  });

  it("is continuous when a star's RA crosses 0/360 near the pole", () => {
    const cam = cameraAt(0, 85);
    let prev = proj(cam, 355, 80);
    for (let ra = 355.1; ra < 365; ra += 0.1) {
      const cur = proj(cam, ra % 360, 80);
      if (!prev || !cur) throw new Error("projection failed");
      expect(Math.hypot(cur.x - prev.x, cur.y - prev.y)).toBeLessThan(2);
      prev = cur;
    }
  });

  it("is continuous when the camera drags across the pole", () => {
    let cam = cameraAt(180, 60);
    const star = raDecToVec(200, 70);
    let prev = worldToCamera(cam, star);
    let crossed = false;
    for (let i = 0; i < 200; i += 1) {
      // 4 px is about 1 degree at this focal length; the view sweeps over the pole
      cam = rotateByDrag(cam, { x: 400, y: 300 }, { x: 400, y: 304 }, W, H);
      const cur = worldToCamera(cam, star);
      expect(angularDistanceDeg(prev, cur)).toBeLessThan(1.5);
      const dec = vecToRaDec(rotate(cam.orientation, [0, 0, -1])).decDeg;
      if (dec > 89) crossed = true;
      prev = cur;
    }
    expect(crossed).toBe(true);
  });

  it("is continuous when the camera pans through RA 0/360", () => {
    const star = raDecToVec(2, 5);
    let prev: { x: number; y: number } | null = null;
    for (let ra = 10; ra > -10; ra -= 0.1) {
      const cur = projectToViewport(cameraAt(((ra % 360) + 360) % 360, 0), star, W, H);
      if (prev && cur) expect(Math.hypot(cur.x - prev.x, cur.y - prev.y)).toBeLessThan(10);
      prev = cur;
    }
  });
});

describe("near plane", () => {
  it("rejects a point behind the camera", () => {
    expect(proj(cameraAt(0, 0), 180, 0)).toBeNull();
    expect(proj(cameraAt(0, 0), 95, 0)).toBeNull();
  });

  it("rejects points within the near-plane threshold", () => {
    const cam = cameraAt(0, 0);
    // -c.z = cos(angle); angle 89.9 deg => 0.0017 < 0.01
    expect(proj(cam, 89.9, 0)).toBeNull();
    expect(proj(cam, 89, 0)).not.toBeNull();
  });

  it("clips a segment crossing the near plane at exactly -z = 0.01", () => {
    const front: Vec3 = [0.5, 0, -1];
    const back: Vec3 = [-0.5, 0, 1];
    const clipped = clipSegmentToNearPlane(front, back);
    if (!clipped) throw new Error("expected a clipped segment");
    expect(clipped[0]).toEqual(front);
    expect(-clipped[1][2]).toBeCloseTo(NEAR_PLANE, 12);
    // lies on the original segment
    expect(clipped[1][0]).toBeCloseTo(0.5 - 0.495, 12);
    expect(clipSegmentToNearPlane(back, front)?.[1]).toEqual(front);
  });

  it("keeps fully visible segments and drops fully hidden ones", () => {
    const a: Vec3 = [0, 0, -1];
    const b: Vec3 = [0.1, 0, -1];
    expect(clipSegmentToNearPlane(a, b)).toEqual([a, b]);
    expect(clipSegmentToNearPlane([0, 0, 1], [0.1, 0, 0.5])).toBeNull();
  });
});

describe("screen rays", () => {
  it("projectToViewport(screenRay(p)) == p", () => {
    for (const cam of [cameraAt(0, 0), cameraAt(123, -47, 30), cameraAt(10, 90, 120)]) {
      for (const [x, y] of [
        [0, 0],
        [W / 2, H / 2],
        [799, 599],
        [123.4, 456.7],
      ] as const) {
        const p = projectToViewport(cam, screenRay(cam, x, y, W, H), W, H);
        expect(p?.x).toBeCloseTo(x, 7);
        expect(p?.y).toBeCloseTo(y, 7);
      }
    }
  });

  it("worldToCamera sends the forward direction to -Z", () => {
    const c = worldToCamera(cameraAt(40, 30), raDecToVec(40, 30));
    expect(c[2]).toBeCloseTo(-1, 12);
  });
});

describe("rotateByDrag", () => {
  it("keeps the grabbed world direction under the pointer", () => {
    const cases: [ExplorerCamera, [number, number], [number, number]][] = [
      [cameraAt(0, 0), [400, 300], [500, 350]],
      [cameraAt(200, 70, 40), [100, 100], [700, 500]],
      [cameraAt(10, -90, 120), [10, 590], [790, 5]],
      [cameraAt(300, 20, 5), [0, 0], [799, 599]],
    ];
    for (const [cam, from, to] of cases) {
      const grabbed = screenRay(cam, from[0], from[1], W, H);
      const next = rotateByDrag(cam, { x: from[0], y: from[1] }, { x: to[0], y: to[1] }, W, H);
      const under = screenRay(next, to[0], to[1], W, H);
      expect(angularDistanceDeg(grabbed, under)).toBeLessThan(1e-6);
      const p = projectToViewport(next, grabbed, W, H);
      expect(p?.x).toBeCloseTo(to[0], 5);
      expect(p?.y).toBeCloseTo(to[1], 5);
    }
  });

  it("makes the sky follow the pointer (drag right moves the center toward the left)", () => {
    const cam = cameraAt(0, 0);
    const next = rotateByDrag(cam, { x: 400, y: 300 }, { x: 500, y: 300 }, W, H);
    // the star that was at the center is now right of center
    const p = projectToViewport(next, raDecToVec(0, 0), W, H);
    expect(p?.x).toBeGreaterThan(W / 2);
  });

  it("keeps a unit orientation", () => {
    let cam = cameraAt(0, 0);
    for (let i = 0; i < 10_000; i += 1) {
      cam = rotateByDrag(cam, { x: 400, y: 300 }, { x: 403, y: 301 }, W, H);
    }
    expect(Math.hypot(...cam.orientation)).toBeCloseTo(1, 12);
  });

  it("returns an identical view for a zero drag", () => {
    const cam = cameraAt(10, 20);
    const next = rotateByDrag(cam, { x: 5, y: 5 }, { x: 5, y: 5 }, W, H);
    expect(angularDistanceDeg(screenRay(next, 100, 100, W, H), screenRay(cam, 100, 100, W, H))).toBeLessThan(1e-9);
  });
});

describe("zoomAnchored", () => {
  it("keeps the direction under the pointer", () => {
    const cam = cameraAt(80, 30, 100);
    const px = { x: 650, y: 120 };
    const under = screenRay(cam, px.x, px.y, W, H);
    for (const fov of [60, 20, 5, 110]) {
      const zoomed = zoomAnchored(cam, fov, px.x, px.y, W, H);
      expect(zoomed.fovDeg).toBeCloseTo(fov, 12);
      const after = screenRay(zoomed, px.x, px.y, W, H);
      expect(angularDistanceDeg(under, after)).toBeLessThan(1e-6);
    }
  });

  it("clamps the field of view to 5-120", () => {
    const cam = cameraAt(0, 0, 100);
    expect(zoomAnchored(cam, 1, 400, 300, W, H).fovDeg).toBe(5);
    expect(zoomAnchored(cam, 999, 400, 300, W, H).fovDeg).toBe(120);
    const clamped = zoomAnchored(cam, 1, 700, 100, W, H);
    const under = screenRay(cam, 700, 100, W, H);
    expect(angularDistanceDeg(under, screenRay(clamped, 700, 100, W, H))).toBeLessThan(1e-6);
  });
});

describe("lookAt", () => {
  it("makes forward the target and north the up direction", () => {
    const cam = cameraAt(30, 20);
    const north = projectToViewport(cam, raDecToVec(30, 25), W, H);
    expect(north?.x).toBeCloseTo(W / 2, 6);
    expect(north?.y).toBeLessThan(H / 2);
  });

  it("is defined at the poles", () => {
    for (const dec of [90, -90]) {
      const q = lookAt(raDecToVec(0, dec), [0, 0, 1]);
      expect(Math.hypot(...q)).toBeCloseTo(1, 12);
      const c = worldToCamera({ orientation: q, fovDeg: 90 }, raDecToVec(0, dec));
      expect(c[2]).toBeCloseTo(-1, 12);
    }
  });
});

describe("composition drift", () => {
  it("normalize keeps unit length", () => {
    let q: Quat = lookAt(raDecToVec(0, 0), [0, 0, 1]);
    const s = fromAxisAngle([0.2, 0.9, 0.1], 1.3);
    for (let i = 0; i < 10_000; i += 1) q = normalize(multiply(s, q));
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
  });
});
