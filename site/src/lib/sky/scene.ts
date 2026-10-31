/**
 * Prepared scene: every catalog star (the scene has no observer, so nothing is
 * culled), unit vectors in a typed array, and figure-based constellations.
 */

import type { SegmentRow, StarRow } from "../skymodel.ts";
import { raDecToVec } from "./vec.ts";

export interface SceneStar {
  /** `HIP:<n>` */
  id: string;
  hip: number;
  raDeg: number;
  decDeg: number;
  mag: number;
  name: string | null;
  /** Constellations whose figure lines use this star; empty if none. */
  constellationIds: string[];
}

export interface SceneConstellation {
  /** `CON:<abbr>` */
  id: string;
  abbr: string;
  name: string;
  /** Star indices, ascending. */
  memberIndices: number[];
  /** Star index pairs. */
  segments: [number, number][];
  brightestIndex: number;
}

export interface SkyScene {
  stars: SceneStar[];
  /** xyz per star, stride 3, same order as `stars`. */
  vectors: Float64Array;
  constellations: SceneConstellation[];
  starIndexById: Map<string, number>;
  constellationIndexById: Map<string, number>;
}

export function prepareScene(
  stars: readonly StarRow[],
  segments: readonly SegmentRow[],
  names: readonly (readonly [number, string])[],
): SkyScene {
  const nameByHip = new Map<number, string>(names);
  const vectors = new Float64Array(stars.length * 3);
  const starIndexById = new Map<string, number>();
  const hipToEntry = new Map<number, { index: number; star: SceneStar }>();

  const sceneStars: SceneStar[] = stars.map((row, i) => {
    const v = raDecToVec(row.raDeg, row.decDeg);
    vectors[i * 3] = v[0];
    vectors[i * 3 + 1] = v[1];
    vectors[i * 3 + 2] = v[2];
    const id = `HIP:${String(row.hip)}`;
    starIndexById.set(id, i);
    const star: SceneStar = {
      id,
      hip: row.hip,
      raDeg: row.raDeg,
      decDeg: row.decDeg,
      mag: row.mag,
      name: nameByHip.get(row.hip) ?? null,
      constellationIds: [],
    };
    hipToEntry.set(row.hip, { index: i, star });
    return star;
  });

  interface Draft {
    abbr: string;
    name: string;
    members: Map<number, SceneStar>;
    segments: [number, number][];
  }
  const drafts = new Map<string, Draft>();
  for (const [abbr, name, hipA, hipB] of segments) {
    const ea = hipToEntry.get(hipA);
    const eb = hipToEntry.get(hipB);
    if (ea === undefined || eb === undefined) continue;
    let draft = drafts.get(abbr);
    if (!draft) {
      draft = { abbr, name, members: new Map(), segments: [] };
      drafts.set(abbr, draft);
    }
    draft.members.set(ea.index, ea.star);
    draft.members.set(eb.index, eb.star);
    draft.segments.push([ea.index, eb.index]);
  }

  const constellations: SceneConstellation[] = [];
  const constellationIndexById = new Map<string, number>();
  for (const draft of drafts.values()) {
    const id = `CON:${draft.abbr}`;
    const memberIndices = [...draft.members.keys()].sort((x, y) => x - y);
    let brightest = memberIndices[0] ?? 0;
    let brightestMag = Infinity;
    for (const idx of memberIndices) {
      const star = draft.members.get(idx);
      if (star === undefined) continue;
      if (star.mag < brightestMag) {
        brightest = idx;
        brightestMag = star.mag;
      }
      star.constellationIds.push(id);
    }
    constellationIndexById.set(id, constellations.length);
    constellations.push({
      id,
      abbr: draft.abbr,
      name: draft.name,
      memberIndices,
      segments: draft.segments,
      brightestIndex: brightest,
    });
  }

  return { stars: sceneStars, vectors, constellations, starIndexById, constellationIndexById };
}
