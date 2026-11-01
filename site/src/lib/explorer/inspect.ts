/**
 * What the inspector shows, as plain data. Catalog fields are copied through;
 * altitude and azimuth come from `observerAltAz` (FR-004), rounded to the 0.1°
 * the display uses. A fact the scene does not hold is `null` or absent, never
 * a guess.
 */

import { type HorizonStatus, type ObservationContext, horizonStatus, observerAltAz } from "../sky/observer.ts";
import type { SkyScene } from "../sky/scene.ts";
import type { Vec3 } from "../sky/vec.ts";
import type { ObserverView } from "./observerView.ts";
import { starLabel } from "./selection.ts";
import { isBelow } from "./visibility.ts";

export interface StarDetail {
  kind: "star";
  id: string;
  /** The name, else `HIP <n>`. */
  title: string;
  name: string | null;
  hip: number;
  mag: number;
  raDeg: number;
  decDeg: number;
  /** Derived for the place and moment; rounded to 0.1°. */
  altDeg: number;
  azDeg: number;
  horizon: HorizonStatus;
  /** Constellations whose figure uses this star; empty if none. */
  figures: { id: string; name: string }[];
}

export interface ConstellationDetail {
  kind: "constellation";
  id: string;
  name: string;
  abbr: string;
  /** Distinct stars in the figure. */
  starCount: number;
  /** Of those, how many are above the horizon now. */
  aboveCount: number;
  brightest: { id: string; title: string; mag: number };
}

export interface ConstellationItem {
  id: string;
  name: string;
  abbr: string;
}

/** Round to one decimal, without a negative zero. */
function tenth(value: number): number {
  const r = Math.round(value * 10) / 10;
  return r === 0 ? 0 : r;
}

export function describeStar(scene: SkyScene, ctx: ObservationContext, id: string): StarDetail | null {
  const index = scene.starIndexById.get(id);
  const star = index === undefined ? undefined : scene.stars[index];
  if (index === undefined || !star) return null;
  const v = scene.vectors;
  const dir: Vec3 = [v[index * 3] ?? 0, v[index * 3 + 1] ?? 0, v[index * 3 + 2] ?? 0];
  const { altDeg, azDeg } = observerAltAz(ctx, dir);
  const figures: StarDetail["figures"] = [];
  for (const conId of star.constellationIds) {
    const ci = scene.constellationIndexById.get(conId);
    const con = ci === undefined ? undefined : scene.constellations[ci];
    if (con) figures.push({ id: con.id, name: con.name });
  }
  return {
    kind: "star",
    id,
    title: starLabel(star),
    name: star.name,
    hip: star.hip,
    mag: star.mag,
    raDeg: star.raDeg,
    decDeg: star.decDeg,
    altDeg: tenth(altDeg),
    azDeg: tenth(azDeg) % 360,
    horizon: horizonStatus(ctx, dir),
    figures,
  };
}

export function describeConstellation(
  scene: SkyScene,
  view: ObserverView,
  id: string,
): ConstellationDetail | null {
  const index = scene.constellationIndexById.get(id);
  const con = index === undefined ? undefined : scene.constellations[index];
  if (!con) return null;
  const star = scene.stars[con.brightestIndex];
  if (!star) return null;
  let above = 0;
  for (const i of con.memberIndices) if (!isBelow(view.altitudesDeg[i] ?? 0)) above++;
  return {
    kind: "constellation",
    id,
    name: con.name,
    abbr: con.abbr,
    starCount: con.memberIndices.length,
    aboveCount: above,
    brightest: { id: star.id, title: starLabel(star), mag: star.mag },
  };
}

/** Every constellation, by name, for the browse list. */
export function listConstellations(scene: SkyScene): ConstellationItem[] {
  return scene.constellations
    .map((c) => ({ id: c.id, name: c.name, abbr: c.abbr }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || (a.id < b.id ? -1 : 1));
}

export interface GroupedConstellation extends ConstellationItem {
  /** Above the horizon with some of its stars below it. Never set in the bottom group. */
  partly: boolean;
}

export interface ConstellationGroups {
  above: GroupedConstellation[];
  below: GroupedConstellation[];
}

const byName = (a: ConstellationItem, b: ConstellationItem): number =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || (a.id < b.id ? -1 : 1);

/**
 * The browse list split by the horizon: a constellation with any star above it
 * goes in `above`. Depends on the place and moment only, so compute it once per scene.
 */
export function groupConstellations(scene: SkyScene, view: ObserverView): ConstellationGroups {
  const above: GroupedConstellation[] = [];
  const below: GroupedConstellation[] = [];
  for (const con of scene.constellations) {
    let up = 0;
    for (const i of con.memberIndices) if (!isBelow(view.altitudesDeg[i] ?? 0)) up++;
    const item = { id: con.id, name: con.name, abbr: con.abbr };
    if (up === 0) below.push({ ...item, partly: false });
    else above.push({ ...item, partly: up < con.memberIndices.length });
  }
  return { above: above.sort(byName), below: below.sort(byName) };
}
