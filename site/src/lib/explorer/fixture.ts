/** Small hand-built skies for the Explorer tests: positions are given as altitude and azimuth. */

import type { SegmentRow, StarRow } from "../skymodel.ts";
import { type ObservationContext, northHorizonVector, zenithVector } from "../sky/observer.ts";
import { type SkyScene, prepareScene } from "../sky/scene.ts";
import { type Vec3, add, cross, scale, vecToRaDec } from "../sky/vec.ts";
import { type ObserverView, prepareObserverView } from "./observerView.ts";

const DEG = Math.PI / 180;

export const CTX: ObservationContext = {
  latDeg: 40,
  lonDeg: -75,
  when: new Date("2026-03-01T03:00:00Z"),
};

/** World direction at the given altitude and azimuth (east of north) for `ctx`. */
export function dirAt(altDeg: number, azDeg: number, ctx: ObservationContext = CTX): Vec3 {
  const zenith = zenithVector(ctx);
  const north = northHorizonVector(ctx);
  const east = cross(north, zenith);
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const level = add(scale(north, Math.cos(az)), scale(east, Math.sin(az)));
  return add(scale(level, Math.cos(alt)), scale(zenith, Math.sin(alt)));
}

export interface PlacedStar {
  hip: number;
  dir: Vec3;
  mag: number;
}

export function rowOf(star: PlacedStar): StarRow {
  const { raDeg, decDeg } = vecToRaDec(star.dir);
  return { hip: star.hip, raDeg, decDeg, mag: star.mag };
}

export function sceneOf(
  stars: readonly PlacedStar[],
  segments: readonly SegmentRow[] = [],
  names: readonly (readonly [number, string])[] = [],
): { scene: SkyScene; view: ObserverView } {
  const scene = prepareScene(stars.map(rowOf), segments, names);
  return { scene, view: prepareObserverView(scene, CTX) };
}
