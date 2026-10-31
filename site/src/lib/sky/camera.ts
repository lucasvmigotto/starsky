/**
 * Explorer camera (ADR-0006). Camera frame: +X right, +Y up, forward is -Z.
 * Orientation rotates camera to world; gnomonic projection, CSS pixels, +y down.
 */

import {
  type Quat,
  conjugate,
  fromBasis,
  fromUnitVectors,
  multiply,
  normalize,
  rotate,
} from "./quat.ts";
import { type Vec3, cross, normalizeVec } from "./vec.ts";

export interface ExplorerCamera {
  orientation: Quat;
  /** Degrees along the shorter viewport side. */
  fovDeg: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export const FOV_MIN_DEG = 5;
export const FOV_MAX_DEG = 120;
export const FOV_DEFAULT_DEG = 100;
/** A point is visible only if -c.z >= NEAR_PLANE. */
export const NEAR_PLANE = 0.01;

const DEG = Math.PI / 180;

export function clampFov(fovDeg: number): number {
  return Math.min(FOV_MAX_DEG, Math.max(FOV_MIN_DEG, fovDeg));
}

export function focalPx(fovDeg: number, width: number, height: number): number {
  return Math.min(width, height) / 2 / Math.tan((fovDeg * DEG) / 2);
}

export function worldToCamera(camera: ExplorerCamera, v: Vec3): Vec3 {
  return rotate(conjugate(camera.orientation), v);
}

function projectCameraVector(
  c: Vec3,
  fovDeg: number,
  width: number,
  height: number,
): ScreenPoint | null {
  const depth = -c[2];
  if (depth < NEAR_PLANE) return null;
  const f = focalPx(fovDeg, width, height);
  return { x: width / 2 + f * (c[0] / depth), y: height / 2 - f * (c[1] / depth) };
}

/** Screen position of a world direction, or null at or behind the near plane. */
export function projectToViewport(
  camera: ExplorerCamera,
  v: Vec3,
  width: number,
  height: number,
): ScreenPoint | null {
  return projectCameraVector(worldToCamera(camera, v), camera.fovDeg, width, height);
}

/** Unit world direction under a screen point. */
export function screenRay(
  camera: ExplorerCamera,
  x: number,
  y: number,
  width: number,
  height: number,
): Vec3 {
  const f = focalPx(camera.fovDeg, width, height);
  const c = normalizeVec([(x - width / 2) / f, -(y - height / 2) / f, -1]);
  return rotate(camera.orientation, c);
}

/**
 * Orientation looking along `forward` with `up` as the vertical hint.
 * Falls back to a fixed hint when forward is parallel to up (the poles).
 */
export function lookAt(forward: Vec3, up: Vec3): Quat {
  const f = normalizeVec(forward);
  let right = cross(f, up);
  if (Math.hypot(...right) < 1e-9) {
    right = cross(f, Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
  }
  right = normalizeVec(right);
  const upVec = cross(right, f);
  return fromBasis(right, upVec, [-f[0], -f[1], -f[2]]);
}

/** Rotate so the world direction grabbed at `from` ends up under `to`. */
export function rotateByDrag(
  camera: ExplorerCamera,
  from: ScreenPoint,
  to: ScreenPoint,
  width: number,
  height: number,
): ExplorerCamera {
  const grabbed = screenRay(camera, from.x, from.y, width, height);
  const underTo = screenRay(camera, to.x, to.y, width, height);
  const delta = fromUnitVectors(underTo, grabbed);
  return { ...camera, orientation: normalize(multiply(delta, camera.orientation)) };
}

/** Change fov (clamped), then rotate so the direction under the pointer stays put. */
export function zoomAnchored(
  camera: ExplorerCamera,
  fovDeg: number,
  x: number,
  y: number,
  width: number,
  height: number,
): ExplorerCamera {
  const anchored = screenRay(camera, x, y, width, height);
  const zoomed: ExplorerCamera = { ...camera, fovDeg: clampFov(fovDeg) };
  const now = screenRay(zoomed, x, y, width, height);
  const delta = fromUnitVectors(now, anchored);
  return { ...zoomed, orientation: normalize(multiply(delta, zoomed.orientation)) };
}

/**
 * Clip a camera-space segment to -z >= NEAR_PLANE before projecting.
 * Returns null when the whole segment is behind the plane.
 */
export function clipSegmentToNearPlane(a: Vec3, b: Vec3): [Vec3, Vec3] | null {
  const da = -a[2] - NEAR_PLANE;
  const db = -b[2] - NEAR_PLANE;
  if (da < 0 && db < 0) return null;
  if (da >= 0 && db >= 0) return [a, b];
  const t = da / (da - db);
  const hit: Vec3 = [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    -NEAR_PLANE,
  ];
  return da >= 0 ? [a, hit] : [hit, b];
}

/** Project a world-space segment, clipped at the near plane, to [x1, y1, x2, y2]. */
export function projectSegment(
  camera: ExplorerCamera,
  a: Vec3,
  b: Vec3,
  width: number,
  height: number,
): [number, number, number, number] | null {
  const clipped = clipSegmentToNearPlane(worldToCamera(camera, a), worldToCamera(camera, b));
  if (!clipped) return null;
  const p = projectCameraVector(clipped[0], camera.fovDeg, width, height);
  const q = projectCameraVector(clipped[1], camera.fovDeg, width, height);
  // Clipped endpoints sit exactly on the plane, so rounding can reject them.
  if (!p || !q) return null;
  return [p.x, p.y, q.x, q.y];
}

