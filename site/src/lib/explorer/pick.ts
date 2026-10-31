/** Picking works on scene data and the camera, never on pixels (ADR-0007). */

import { type ExplorerCamera, focalPx, projectSegment, screenRay } from "../sky/camera.ts";
import type { BelowMode } from "../sky/payload.ts";
import type { SkyScene } from "../sky/scene.ts";
import { type Vec3, angularDistanceDeg, dot } from "../sky/vec.ts";
import type { Viewport } from "./frame.ts";
import type { ObserverView } from "./observerView.ts";
import { segmentShown, starShown } from "./visibility.ts";

export type Pick =
  | { kind: "star"; id: string; index: number }
  | { kind: "constellation"; id: string };

export interface PickOptions {
  /** Stars fainter than this are not drawn, so not pickable. Default: no limit. */
  magLimit?: number;
  below?: BelowMode;
  /** False when the constellation lines layer is off. */
  lines?: boolean;
}

export const STAR_TOLERANCE_PX = 12;
export const SEGMENT_TOLERANCE_PX = 8;
/** Angles closer than this are the same distance, so brightness decides. */
const TIE_DEG = 1e-9;

function distanceToSegment(
  px: number,
  py: number,
  seg: readonly [number, number, number, number],
): number {
  const [x1, y1, x2, y2] = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pickAt(
  scene: SkyScene,
  view: ObserverView,
  camera: ExplorerCamera,
  viewport: Viewport,
  x: number,
  y: number,
  options: PickOptions = {},
): Pick | null {
  const { magLimit = Infinity, below = "dimmed", lines = true } = options;
  const ray = screenRay(camera, x, y, viewport.width, viewport.height);
  // Tolerance is an angle: the 12 px at the view centre, so it follows the fov.
  const tolRad = Math.atan(STAR_TOLERANCE_PX / focalPx(camera.fovDeg, viewport.width, viewport.height));
  const cosTol = Math.cos(tolRad);
  const v = scene.vectors;

  let best = -1;
  let bestDeg = Infinity;
  let bestMag = Infinity;
  for (let i = 0; i < scene.stars.length; i++) {
    const star = scene.stars[i];
    if (star.mag > magLimit) continue;
    const sv: Vec3 = [v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0];
    if (dot(ray, sv) < cosTol) continue;
    if (!starShown(below, view.altitudesDeg[i] ?? 0)) continue;
    const deg = angularDistanceDeg(ray, sv);
    if (deg < bestDeg - TIE_DEG || (Math.abs(deg - bestDeg) <= TIE_DEG && star.mag < bestMag)) {
      best = i;
      bestDeg = deg;
      bestMag = star.mag;
    }
  }
  if (best >= 0) {
    return { kind: "star", id: scene.stars[best].id, index: best };
  }

  if (!lines) return null;
  let bestPx = SEGMENT_TOLERANCE_PX;
  let hit: string | null = null;
  for (const con of scene.constellations) {
    for (const [a, b] of con.segments) {
      if (!segmentShown(below, view.altitudesDeg[a] ?? 0, view.altitudesDeg[b] ?? 0)) continue;
      const seg = projectSegment(
        camera,
        [v[a * 3] ?? 0, v[a * 3 + 1] ?? 0, v[a * 3 + 2] ?? 0],
        [v[b * 3] ?? 0, v[b * 3 + 1] ?? 0, v[b * 3 + 2] ?? 0],
        viewport.width,
        viewport.height,
      );
      if (!seg) continue;
      const d = distanceToSegment(x, y, seg);
      if (d <= bestPx) {
        bestPx = d;
        hit = con.id;
      }
    }
  }
  return hit === null ? null : { kind: "constellation", id: hit };
}
