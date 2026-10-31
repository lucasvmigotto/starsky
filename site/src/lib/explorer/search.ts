/**
 * Search over the scene: constellations by name or abbreviation, stars by name
 * or HIP number. Ranked exact, prefix, substring; case and diacritics ignored.
 */

import type { SkyScene } from "../sky/scene.ts";
import { starLabel } from "./selection.ts";

export type SearchResult =
  | { id: string; kind: "constellation"; label: string; abbr: string }
  | { id: string; kind: "star"; label: string; hip: number; mag: number };

export interface SearchOptions {
  /** Maximum results; default 8. */
  limit?: number;
  /** Stars fainter than this are not offered, because the map does not draw them. */
  magLimit?: number;
}

const DEFAULT_LIMIT = 8;
const HIP_QUERY = /^(?:hip[\s:]*)?(\d+)$/;

export function normalizeQuery(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** 0 exact, 1 prefix, 2 substring, null no match. */
function rankOf(text: string, query: string): number | null {
  if (text === query) return 0;
  if (text.startsWith(query)) return 1;
  return text.includes(query) ? 2 : null;
}

const namedStars = new WeakMap<SkyScene, { index: number; norm: string }[]>();

function namedStarsOf(scene: SkyScene): { index: number; norm: string }[] {
  let list = namedStars.get(scene);
  if (!list) {
    list = [];
    scene.stars.forEach((star, index) => {
      if (star.name !== null) list?.push({ index, norm: normalizeQuery(star.name) });
    });
    namedStars.set(scene, list);
  }
  return list;
}

interface Ranked {
  rank: number;
  group: number;
  mag: number;
  label: string;
  result: SearchResult;
}

export function searchObjects(
  scene: SkyScene,
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const q = normalizeQuery(query);
  if (q === "") return [];
  const limit = options.limit ?? DEFAULT_LIMIT;
  const magLimit = options.magLimit ?? Infinity;
  const found: Ranked[] = [];
  const hip = HIP_QUERY.exec(q)?.[1];

  const addStar = (index: number, rank: number): void => {
    const star = scene.stars[index];
    if (star.mag > magLimit) return;
    found.push({
      rank,
      group: 1,
      mag: star.mag,
      label: starLabel(star),
      result: { id: star.id, kind: "star", label: starLabel(star), hip: star.hip, mag: star.mag },
    });
  };

  if (hip !== undefined) {
    scene.stars.forEach((star, index) => {
      const rank = rankOf(String(star.hip), hip);
      if (rank === 0 || rank === 1) addStar(index, rank);
    });
  } else {
    for (const con of scene.constellations) {
      const name = rankOf(normalizeQuery(con.name), q);
      const abbr = rankOf(normalizeQuery(con.abbr), q);
      const rank = name === null ? abbr : abbr === null ? name : Math.min(name, abbr);
      if (rank === null) continue;
      found.push({
        rank,
        group: 0,
        mag: 0,
        label: con.name,
        result: { id: con.id, kind: "constellation", label: con.name, abbr: con.abbr },
      });
    }
    for (const { index, norm } of namedStarsOf(scene)) {
      const rank = rankOf(norm, q);
      if (rank !== null) addStar(index, rank);
    }
  }

  found.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.group - b.group ||
      a.mag - b.mag ||
      (a.label < b.label ? -1 : a.label > b.label ? 1 : 0) ||
      (a.result.id < b.result.id ? -1 : 1),
  );
  return found.slice(0, limit).map((r) => r.result);
}
