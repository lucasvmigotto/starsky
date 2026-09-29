import { useMemo } from "react";
import { altAz, project } from "./astro.ts";
import type { SharePayload } from "./share.ts";
import { starSize } from "./spec.ts";

export interface StarRow {
  hip: number;
  raDeg: number;
  decDeg: number;
  mag: number;
}

/** Segment row: [abbr, name, hipA, hipB]. */
export type SegmentRow = [string, string, number, number];

export interface VisibleStar extends StarRow {
  px: number;
  py: number;
  unitX: number;
  unitY: number;
  size: number;
}

export interface Figure {
  abbr: string;
  name: string;
  starIndices: number[];
  centroidX: number;
  centroidY: number;
  brightestMag: number;
  brightestHip: number;
}

export interface SkyModel {
  stars: VisibleStar[];
  figures: Figure[];
  /** Segments as index pairs into `stars`, with figure index. */
  segments: { a: number; b: number; figure: number }[];
  when: Date;
}

/** Logical canvas geometry (spec px values are used 1:1 at this scale). */
export const CANVAS_W = 800;
export const CANVAS_H = 1000;
export const BAND_FRACTION = 0.22;
export const SKY_H = CANVAS_W; // square sky region on top
export const DISK_CX = CANVAS_W / 2;
export const DISK_CY = SKY_H / 2;
export const DISK_R = 368;

export function buildSkyModel(
  payload: SharePayload,
  catalog: StarRow[],
  segments: SegmentRow[],
): SkyModel {
  const when = new Date(payload.when_utc);
  const { lat, lon, options } = payload;

  const projected: VisibleStar[] = [];
  for (const star of catalog) {
    if (star.mag > options.magnitude_limit) continue;
    const { altDeg, azDeg } = altAz(star.raDeg, star.decDeg, lat, lon, when);
    const p = project(
      options.projection,
      altDeg,
      azDeg,
      options.fisheye_strength,
    );
    if (p.r > 1.001) continue; // below the horizon
    projected.push({
      ...star,
      unitX: p.x,
      unitY: p.y,
      px: DISK_CX + p.x * DISK_R,
      py: DISK_CY + p.y * DISK_R,
      size: starSize(star.mag),
    });
  }

  // Declutter: brightest-first, reject stars closer than min_separation
  // (unit-disk Euclidean distance).
  const order = projected
    .map((_, i) => i)
    .sort((a, b) => projected[a].mag - projected[b].mag);
  const kept: VisibleStar[] = [];
  const keptIndex = new Map<number, number>();
  const sep = options.min_separation;
  for (const i of order) {
    const s = projected[i];
    let clash = false;
    if (sep > 0) {
      for (const k of kept) {
        const dx = s.unitX - k.unitX;
        const dy = s.unitY - k.unitY;
        if (dx * dx + dy * dy < sep * sep) {
          clash = true;
          break;
        }
      }
    }
    if (!clash) {
      keptIndex.set(i, kept.length);
      kept.push(s);
    }
  }

  const figureOrder = new Map<string, number>();
  const figures: Figure[] = [];
  const segs: SkyModel["segments"] = [];
  const hipOf = new Map(projected.map((s, i) => [s.hip, i]));
  for (const [abbr, name, hipA, hipB] of segments) {
    if (!options.constellations) break;
    const pa = hipOf.get(hipA);
    const pb = hipOf.get(hipB);
    if (pa === undefined || pb === undefined) continue;
    const ka = keptIndex.get(pa);
    const kb = keptIndex.get(pb);
    if (ka === undefined || kb === undefined) continue;
    let fi = figureOrder.get(abbr);
    if (fi === undefined) {
      fi = figures.length;
      figureOrder.set(abbr, fi);
      figures.push({
        abbr,
        name,
        starIndices: [],
        centroidX: 0,
        centroidY: 0,
        brightestMag: Infinity,
        brightestHip: 0,
      });
    }
    segs.push({ a: ka, b: kb, figure: fi });
    const fig = figures[fi];
    for (const si of [ka, kb]) {
      if (!fig.starIndices.includes(si)) {
        fig.starIndices.push(si);
        const st = kept[si];
        if (st.mag < fig.brightestMag) {
          fig.brightestMag = st.mag;
          fig.brightestHip = st.hip;
        }
      }
    }
  }
  for (const fig of figures) {
    let sx = 0;
    let sy = 0;
    for (const si of fig.starIndices) {
      sx += kept[si].px;
      sy += kept[si].py;
    }
    fig.centroidX = sx / Math.max(1, fig.starIndices.length);
    fig.centroidY = sy / Math.max(1, fig.starIndices.length);
  }
  // NB: `segments[].figure` indexes `figures`; keep insertion order here
  // (callers sort for display without mutating).
  return { stars: kept, figures, segments: segs, when };
}

export function useSkyModel(
  payload: SharePayload,
  catalog: StarRow[] | null,
  segments: SegmentRow[] | null,
): SkyModel | null {
  return useMemo(() => {
    if (!catalog || !segments) return null;
    return buildSkyModel(payload, catalog, segments);
  }, [payload, catalog, segments]);
}
