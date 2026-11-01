/**
 * The stars that form a constellation's figure, brightest first (019): the
 * hover tooltip's short summary and the inspector's full list. Plain data;
 * the words around it are copy, and names are never translated.
 */

import type { SceneConstellation, SkyScene } from "../sky/scene.ts";
import type { ObserverView } from "./observerView.ts";
import { starLabel } from "./selection.ts";
import { isBelow } from "./visibility.ts";

/** At most this many named stars go in the tooltip. */
export const TIP_NAMED = 3;

export interface FigureStar {
  id: string;
  /** The proper name, else `HIP <n>`. */
  title: string;
  mag: number;
  /** Below the horizon for this place and moment. */
  below: boolean;
}

export interface ConstellationTip {
  name: string;
  /** Distinct stars in the figure. */
  count: number;
  /** Up to three proper names, brightest first. */
  named: string[];
  /** Stars of the figure not in `named`, named or not; 0 when none are named. */
  rest: number;
}

function constellationOf(scene: SkyScene, id: string): SceneConstellation | undefined {
  const index = scene.constellationIndexById.get(id);
  return index === undefined ? undefined : scene.constellations[index];
}

/** Member indices by apparent magnitude, brightest first; a tie goes to the lower HIP number. */
function byBrightness(scene: SkyScene, con: SceneConstellation): number[] {
  const mag = (i: number): number => scene.stars[i]?.mag ?? Infinity;
  const hip = (i: number): number => scene.stars[i]?.hip ?? Infinity;
  return [...con.memberIndices].sort((a, b) => mag(a) - mag(b) || hip(a) - hip(b));
}

/** Every star of the figure, brightest first, or null for an id that is not a constellation. */
export function figureStars(scene: SkyScene, view: ObserverView, id: string): FigureStar[] | null {
  const con = constellationOf(scene, id);
  if (!con) return null;
  const out: FigureStar[] = [];
  for (const i of byBrightness(scene, con)) {
    const star = scene.stars[i];
    if (!star) continue;
    out.push({ id: star.id, title: starLabel(star), mag: star.mag, below: isBelow(view.altitudesDeg[i] ?? 0) });
  }
  return out;
}

/** The tooltip's content for a constellation, or null for an id that is not one. */
export function constellationTip(scene: SkyScene, id: string): ConstellationTip | null {
  const con = constellationOf(scene, id);
  if (!con) return null;
  const named: string[] = [];
  for (const i of byBrightness(scene, con)) {
    const name = scene.stars[i]?.name ?? null;
    if (name === null) continue;
    named.push(name);
    if (named.length === TIP_NAMED) break;
  }
  const count = con.memberIndices.length;
  return { name: con.name, count, named, rest: named.length === 0 ? 0 : count - named.length };
}
