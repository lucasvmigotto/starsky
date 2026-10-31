/** Per-star altitudes for one place and moment, recomputed only when those change. */

import { type ObservationContext, northHorizonVector, zenithVector } from "../sky/observer.ts";
import type { SkyScene } from "../sky/scene.ts";
import { type Vec3, cross, dot } from "../sky/vec.ts";

export interface ObserverView {
  ctx: ObservationContext;
  zenith: Vec3;
  north: Vec3;
  /** Horizon unit vector toward local east. */
  east: Vec3;
  /** Degrees, same order as `scene.stars`; negative is below the horizon. */
  altitudesDeg: Float64Array;
}

const RAD = 180 / Math.PI;

export function prepareObserverView(scene: SkyScene, ctx: ObservationContext): ObserverView {
  const zenith = zenithVector(ctx);
  const north = northHorizonVector(ctx);
  const east = cross(north, zenith);
  const n = scene.stars.length;
  const altitudesDeg = new Float64Array(n);
  const v = scene.vectors;
  for (let i = 0; i < n; i++) {
    const sinAlt = dot([v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0], zenith);
    altitudesDeg[i] = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
  }
  return { ctx, zenith, north, east, altitudesDeg };
}
