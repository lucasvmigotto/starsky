/**
 * Pure frame planning (ADR-0007): draw lists for one camera, no Canvas calls.
 * Deterministic for the same inputs; the renderer only draws what is here.
 */

import {
  type ExplorerCamera,
  FOV_DEFAULT_DEG,
  NEAR_PLANE,
  focalPx,
  projectSegment,
  projectToViewport,
} from "../sky/camera.ts";
import { conjugate, rotate } from "../sky/quat.ts";
import type { SkyScene } from "../sky/scene.ts";
import { type Vec3, add, raDecToVec, scale } from "../sky/vec.ts";
import type { PlanLayers } from "./layers.ts";
import type { ObserverView } from "./observerView.ts";
import { isBelow, segmentShown, starShown } from "./visibility.ts";

export interface Viewport {
  width: number;
  height: number;
}

export interface FrameInput {
  scene: SkyScene;
  view: ObserverView;
  camera: ExplorerCamera;
  viewport: Viewport;
  layers: PlanLayers;
  /** Stars fainter than this are not drawn. */
  magLimit: number;
  /** `HIP:<n>` or `CON:<abbr>` */
  selection: string | null;
  hover: string | null;
  /** N, E, S, W; supplied by the caller so the planner holds no copy. */
  cardinalText?: readonly [string, string, string, string];
}

/** Stars of one visual class, as x, y pairs. */
export interface StarBatch {
  radius: number;
  dim: boolean;
  glow: boolean;
  xy: number[];
}

/** Segments as x1, y1, x2, y2 quadruples. */
export interface LineBatch {
  selected: boolean;
  dim: boolean;
  xy: number[];
}

export interface Polyline {
  xy: number[];
}

export interface CardinalMark {
  text: string;
  x: number;
  y: number;
}

export interface LabelMark {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  dim: boolean;
}

export interface SelectionMark {
  kind: "selected" | "hover";
  x: number;
  y: number;
  radius: number;
  label: string | null;
  dim: boolean;
}

export interface FramePlan {
  stars: StarBatch[];
  lines: LineBatch[];
  horizon: Polyline[];
  grid: Polyline[];
  cardinals: CardinalMark[];
  labels: LabelMark[];
  marks: SelectionMark[];
}

/** Half a glyph plus its glow: stars this far outside the viewport cannot touch it. */
const CULL_MARGIN_PX = 10;
const RING_GAP_PX = 5;
const LABEL_HEIGHT_PX = 14;
const LABEL_CHAR_WIDTH_PX = 6.6;
const LABEL_PAD_PX = 6;
/** One label per this many square pixels, so small viewports thin out first. */
const LABEL_AREA_PX2 = 60_000;
const LABEL_CAP_MIN = 2;
const GLOW_CLASS = 2.5;
const SAMPLE_DEG = 3;
const GRID_STEP_DEG = 30;
const DEFAULT_CARDINALS = ["N", "E", "S", "W"] as const;

/** Radius class (0.5 px steps) from magnitude, before the zoom factor. */
function radiusClass(mag: number): number {
  const raw = Math.min(3.6, Math.max(0.6, 2.9 - 0.4 * mag));
  return Math.max(0.5, Math.round(raw * 2) / 2);
}

function zoomScale(fovDeg: number): number {
  return Math.min(1.8, Math.max(0.8, 1 + 0.25 * Math.log2(FOV_DEFAULT_DEG / fovDeg)));
}

/** Rows of the camera-from-world rotation, so a star costs nine multiplications. */
function rotationRows(camera: ExplorerCamera): [Vec3, Vec3, Vec3] {
  const q = conjugate(camera.orientation);
  const ex = rotate(q, [1, 0, 0]);
  const ey = rotate(q, [0, 1, 0]);
  const ez = rotate(q, [0, 0, 1]);
  return [
    [ex[0], ey[0], ez[0]],
    [ex[1], ey[1], ez[1]],
    [ex[2], ey[2], ez[2]],
  ];
}

function polylines(
  camera: ExplorerCamera,
  points: readonly Vec3[],
  viewport: Viewport,
  closed: boolean,
): Polyline[] {
  const out: Polyline[] = [];
  let current: number[] | null = null;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const seg = projectSegment(camera, a, b, viewport.width, viewport.height);
    if (!seg) {
      current = null;
      continue;
    }
    const last = current ? current.length : 0;
    const continues =
      current !== null &&
      Math.abs((current[last - 2] ?? NaN) - seg[0]) < 1e-9 &&
      Math.abs((current[last - 1] ?? NaN) - seg[1]) < 1e-9;
    if (current === null || !continues) {
      current = [seg[0], seg[1]];
      out.push({ xy: current });
    }
    current.push(seg[2], seg[3]);
  }
  return out;
}

function horizonPoints(view: ObserverView): Vec3[] {
  const points: Vec3[] = [];
  const steps = Math.round(360 / SAMPLE_DEG);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    points.push(add(scale(view.north, Math.cos(a)), scale(view.east, Math.sin(a))));
  }
  return points;
}

let gridCache: Vec3[][] | null = null;

/** Meridians and parallels every 30 degrees, in the fixed equatorial frame. */
function gridLines(): Vec3[][] {
  if (gridCache) return gridCache;
  const lines: Vec3[][] = [];
  for (let ra = 0; ra < 360; ra += GRID_STEP_DEG) {
    const line: Vec3[] = [];
    for (let dec = -90; dec <= 90; dec += SAMPLE_DEG) line.push(raDecToVec(ra, dec));
    lines.push(line);
  }
  for (let dec = -60; dec <= 60; dec += GRID_STEP_DEG) {
    const line: Vec3[] = [];
    for (let ra = 0; ra <= 360; ra += SAMPLE_DEG) line.push(raDecToVec(ra, dec));
    lines.push(line);
  }
  gridCache = lines;
  return lines;
}

function planStars(input: FrameInput): StarBatch[] {
  const { scene, view, camera, viewport, layers, magLimit } = input;
  const rows = rotationRows(camera);
  const [r0, r1, r2] = rows;
  const f = focalPx(camera.fovDeg, viewport.width, viewport.height);
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const zoom = zoomScale(camera.fovDeg);
  const batches = new Map<number, StarBatch>();
  const v = scene.vectors;
  const stars = scene.stars;
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    if (star.mag > magLimit) continue;
    const x = v[i * 3] ?? 0;
    const y = v[i * 3 + 1] ?? 0;
    const z = v[i * 3 + 2] ?? 0;
    const depth = -(r2[0] * x + r2[1] * y + r2[2] * z);
    if (depth < NEAR_PLANE) continue;
    const sx = cx + (f * (r0[0] * x + r0[1] * y + r0[2] * z)) / depth;
    const sy = cy - (f * (r1[0] * x + r1[1] * y + r1[2] * z)) / depth;
    if (
      sx < -CULL_MARGIN_PX ||
      sx > viewport.width + CULL_MARGIN_PX ||
      sy < -CULL_MARGIN_PX ||
      sy > viewport.height + CULL_MARGIN_PX
    ) {
      continue;
    }
    const alt = view.altitudesDeg[i] ?? 0;
    if (!starShown(layers.below, alt)) continue;
    const cls = radiusClass(star.mag);
    const dim = isBelow(alt);
    const key = cls * 4 + (dim ? 1 : 0);
    let batch = batches.get(key);
    if (!batch) {
      batch = { radius: cls * zoom, dim, glow: cls >= GLOW_CLASS && !dim, xy: [] };
      batches.set(key, batch);
    }
    batch.xy.push(sx, sy);
  }
  return [...batches.entries()].sort((a, b) => a[0] - b[0]).map(([, batch]) => batch);
}

function planLines(input: FrameInput): LineBatch[] {
  const { scene, view, camera, viewport, layers, selection } = input;
  if (!layers.constellationLines) return [];
  const batches = new Map<number, LineBatch>();
  const v = scene.vectors;
  const vec = (i: number): Vec3 => [v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0];
  for (const con of scene.constellations) {
    const selected = con.id === selection;
    for (const [a, b] of con.segments) {
      const altA = view.altitudesDeg[a] ?? 0;
      const altB = view.altitudesDeg[b] ?? 0;
      if (!segmentShown(layers.below, altA, altB)) continue;
      const seg = projectSegment(camera, vec(a), vec(b), viewport.width, viewport.height);
      if (!seg) continue;
      const dim = isBelow(altA) || isBelow(altB);
      const key = (selected ? 2 : 0) + (dim ? 1 : 0);
      let batch = batches.get(key);
      if (!batch) {
        batch = { selected, dim, xy: [] };
        batches.set(key, batch);
      }
      batch.xy.push(seg[0], seg[1], seg[2], seg[3]);
    }
  }
  return [...batches.entries()].sort((a, b) => a[0] - b[0]).map(([, batch]) => batch);
}

function planCardinals(input: FrameInput): CardinalMark[] {
  const { view, camera, viewport, layers } = input;
  if (!layers.cardinalDirections) return [];
  const text = input.cardinalText ?? DEFAULT_CARDINALS;
  const dirs: Vec3[] = [
    view.north,
    view.east,
    scale(view.north, -1),
    scale(view.east, -1),
  ];
  const out: CardinalMark[] = [];
  dirs.forEach((dir, i) => {
    const p = projectToViewport(camera, dir, viewport.width, viewport.height);
    if (p) out.push({ text: text[i] ?? "", x: p.x, y: p.y });
  });
  return out;
}

function overlaps(a: LabelMark, b: LabelMark): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 + LABEL_PAD_PX &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 + LABEL_PAD_PX
  );
}

function planLabels(input: FrameInput): LabelMark[] {
  const { scene, view, camera, viewport, layers, selection } = input;
  if (!layers.constellationLabels) return [];
  const v = scene.vectors;
  interface Candidate {
    mark: LabelMark;
    brightness: number;
  }
  const candidates: Candidate[] = [];
  for (const con of scene.constellations) {
    let sx = 0;
    let sy = 0;
    let onScreen = 0;
    let anyAbove = false;
    for (const i of con.memberIndices) {
      if (!isBelow(view.altitudesDeg[i] ?? 0)) anyAbove = true;
      const p = projectToViewport(
        camera,
        [v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0],
        viewport.width,
        viewport.height,
      );
      if (p && p.x >= 0 && p.x <= viewport.width && p.y >= 0 && p.y <= viewport.height) {
        sx += p.x;
        sy += p.y;
        onScreen++;
      }
    }
    if (onScreen === 0 || (!anyAbove && layers.below === "hidden")) continue;
    const width = con.name.length * LABEL_CHAR_WIDTH_PX;
    const x = Math.min(viewport.width - width / 2, Math.max(width / 2, sx / onScreen));
    const y = Math.min(viewport.height - LABEL_HEIGHT_PX / 2, Math.max(LABEL_HEIGHT_PX / 2, sy / onScreen));
    candidates.push({
      brightness: scene.stars[con.brightestIndex]?.mag ?? Infinity,
      mark: {
        id: con.id,
        text: con.name,
        x,
        y,
        width,
        height: LABEL_HEIGHT_PX,
        selected: con.id === selection,
        dim: !anyAbove,
      },
    });
  }
  candidates.sort(
    (a, b) =>
      Number(b.mark.selected) - Number(a.mark.selected) ||
      a.brightness - b.brightness ||
      (a.mark.id < b.mark.id ? -1 : 1),
  );
  const cap = Math.max(LABEL_CAP_MIN, Math.floor((viewport.width * viewport.height) / LABEL_AREA_PX2));
  const placed: LabelMark[] = [];
  for (const { mark } of candidates) {
    if (placed.length >= cap) break;
    if (placed.some((other) => overlaps(mark, other))) continue;
    placed.push(mark);
  }
  return placed;
}

function starMark(
  input: FrameInput,
  id: string | null,
  kind: SelectionMark["kind"],
): SelectionMark | null {
  if (id === null) return null;
  const { scene, view, camera, viewport, layers } = input;
  const index = scene.starIndexById.get(id);
  const star = index === undefined ? undefined : scene.stars[index];
  if (index === undefined || !star) return null;
  const alt = view.altitudesDeg[index] ?? 0;
  if (!starShown(layers.below, alt)) return null;
  const v = scene.vectors;
  const p = projectToViewport(
    camera,
    [v[index * 3] ?? 0, v[index * 3 + 1] ?? 0, v[index * 3 + 2] ?? 0],
    viewport.width,
    viewport.height,
  );
  if (!p || p.x < 0 || p.x > viewport.width || p.y < 0 || p.y > viewport.height) return null;
  const radius = radiusClass(star.mag) * zoomScale(camera.fovDeg) + RING_GAP_PX;
  const label = kind === "selected" ? (star.name ?? `HIP ${String(star.hip)}`) : null;
  return { kind, x: p.x, y: p.y, radius, label, dim: isBelow(alt) };
}

export function planFrame(input: FrameInput): FramePlan {
  const { camera, viewport, layers, view } = input;
  const marks: SelectionMark[] = [];
  const selected = starMark(input, input.selection, "selected");
  if (selected) marks.push(selected);
  if (input.hover !== input.selection) {
    const hover = starMark(input, input.hover, "hover");
    if (hover) marks.push(hover);
  }
  return {
    stars: planStars(input),
    lines: planLines(input),
    horizon: layers.horizon ? polylines(camera, horizonPoints(view), viewport, true) : [],
    grid: layers.equatorialGrid
      ? gridLines().flatMap((line) => polylines(camera, line, viewport, false))
      : [],
    cardinals: planCardinals(input),
    labels: planLabels(input),
    marks,
  };
}
