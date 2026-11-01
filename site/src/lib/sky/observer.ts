/**
 * Observer, separate from the camera (ADR-0006). Longitude is positive east.
 * `gmstDegrees` stays the one sidereal implementation.
 */

import { gmstDegrees, norm360 } from "../astro.ts";
import { type ExplorerCamera, FOV_DEFAULT_DEG, lookAt } from "./camera.ts";
import { type Vec3, dot } from "./vec.ts";

export interface ObservationContext {
  latDeg: number;
  lonDeg: number;
  when: Date;
}

export type HorizonStatus = "above" | "below";

const DEG = Math.PI / 180;

function lstRadians(ctx: ObservationContext): number {
  return norm360(gmstDegrees(ctx.when) + ctx.lonDeg) * DEG;
}

export function zenithVector(ctx: ObservationContext): Vec3 {
  const lst = lstRadians(ctx);
  const lat = ctx.latDeg * DEG;
  return [Math.cos(lat) * Math.cos(lst), Math.cos(lat) * Math.sin(lst), Math.sin(lat)];
}

/** Unit vector at the horizon toward local north; defined (and finite) at the poles too. */
export function northHorizonVector(ctx: ObservationContext): Vec3 {
  const lst = lstRadians(ctx);
  const lat = ctx.latDeg * DEG;
  return [-Math.sin(lat) * Math.cos(lst), -Math.sin(lat) * Math.sin(lst), Math.cos(lat)];
}

/** Altitude and azimuth (eastward from north) of a world direction. */
export function observerAltAz(
  ctx: ObservationContext,
  v: Vec3,
): { altDeg: number; azDeg: number } {
  const lst = lstRadians(ctx);
  const east: Vec3 = [-Math.sin(lst), Math.cos(lst), 0];
  const sinAlt = dot(v, zenithVector(ctx));
  return {
    altDeg: Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG,
    azDeg: norm360(Math.atan2(dot(v, east), dot(v, northHorizonVector(ctx))) / DEG),
  };
}

export function horizonStatus(ctx: ObservationContext, v: Vec3): HorizonStatus {
  return dot(v, zenithVector(ctx)) >= 0 ? "above" : "below";
}

/** Forward at the zenith, local north up. */
export function initialCamera(
  ctx: ObservationContext,
  fovDeg: number = FOV_DEFAULT_DEG,
): ExplorerCamera {
  return { orientation: lookAt(zenithVector(ctx), northHorizonVector(ctx)), fovDeg };
}
