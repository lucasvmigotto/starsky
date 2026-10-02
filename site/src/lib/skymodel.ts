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
/**
 * The unit-disc extent the sky axes span (`[-AXIS_EXTENT, AXIS_EXTENT]` on both
 * axes with equal aspect). It lives here, not in the renderer, because the
 * model and the drawing must agree on it: the hit-test maps the pointer
 * through these pixels while the poster draws through `unitToCanvas`, and two
 * sources for one scale is how hovering picked the mirror image of the cursor.
 */
export const AXIS_EXTENT = 1.06;
export const DISK_CX = CANVAS_W / 2;
export const DISK_CY = SKY_H / 2;
/**
 * Unit-disc radius in poster pixels — derived, not chosen. A second literal
 * here (it used to be 368) drifts from the ring the renderer draws at
 * `(1 / AXIS_EXTENT) * (sizePx / 2)`, and then the cursor and the drawing
 * disagree about where every star is.
 */
export const DISK_R = CANVAS_W / 2 / AXIS_EXTENT;

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
    if (!clash) kept.push(s);
  }

  // Figures, segments and label centroids come from ALL visible stars, not the
  // decluttered set — this mirrors the CLI, where `constellation_label_positions`
  // and `project_constellation_lines` run on `projected` and declutter only
  // chooses which stars are drawn (`render/figure.py:65-111`, `constellations.py`).
  // Using the kept set here made the browser draw about half the CLI's figures.
  const visibleHip = new Map(projected.map((s, i) => [s.hip, i]));
  const figureOrder = new Map<string, number>();
  const figures: Figure[] = [];
  const segs: SkyModel["segments"] = [];
  const drawnIndex = new Map<VisibleStar, number>();
  kept.forEach((s, i) => drawnIndex.set(s, i));
  for (const [abbr, name, hipA, hipB] of segments) {
    if (!options.constellations) break;
    const pa = visibleHip.get(hipA);
    const pb = visibleHip.get(hipB);
    if (pa === undefined || pb === undefined) continue;
    const a = projected[pa];
    const b = projected[pb];
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
    const ka = drawnIndex.get(a);
    const kb = drawnIndex.get(b);
    // A segment is only drawn when both endpoints survived declutter; the
    // figure still exists (and gets a label) if it has visible members.
    if (ka !== undefined && kb !== undefined) {
      segs.push({ a: ka, b: kb, figure: fi });
    }
    const fig = figures[fi];
    for (const [st, vi] of [
      [a, pa],
      [b, pb],
    ] as const) {
      if (!fig.starIndices.includes(vi)) fig.starIndices.push(vi);
      if (st.mag < fig.brightestMag) {
        fig.brightestMag = st.mag;
        fig.brightestHip = st.hip;
      }
    }
  }
  for (const fig of figures) {
    let sx = 0;
    let sy = 0;
    for (const si of fig.starIndices) {
      sx += projected[si].px;
      sy += projected[si].py;
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
