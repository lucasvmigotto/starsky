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
import { starLabel } from "./selection.ts";
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
  /** `CON:<abbr>` under the pointer or the panel list's pointer; selection wins over it. */
  hoverConstellation?: string | null;
  /** N, E, S, W; supplied by the caller so the planner holds no copy. */
  cardinalText?: readonly [string, string, string, string];
}

/** Stars of one visual class, as x, y pairs. */
export interface StarBatch {
  radius: number;
  /** Opacity tier by magnitude, 0.6 to 1; the renderer multiplies `dim` on top. */
  alpha: number;
  dim: boolean;
  glow: boolean;
  xy: number[];
}

/** Segments as x1, y1, x2, y2 quadruples. */
export interface LineBatch {
  selected: boolean;
  /** Softer than selected: a hovered constellation that is not also selected. */
  hover: boolean;
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
  hover: boolean;
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
/** A label must not sit on a star at least this bright (magnitude at or below). */
const BRIGHT_MAG = 2;
const BRIGHT_CLEARANCE_PX = 4;
/** One label per this many square pixels, so small viewports thin out first. */
const LABEL_AREA_PX2 = 60_000;
const LABEL_CAP_MIN = 2;
/** Stars at or brighter than this magnitude get a glow circle. */
const GLOW_MAG = 2;
const RADIUS_BASE_PX = 3.6;
const RADIUS_PER_MAG_PX = 0.5;
const RADIUS_MIN_PX = 0.8;
const RADIUS_MAX_PX = 4.5;
/** Opacity falls linearly from 1 at the first magnitude to the faint value at the second. */
const ALPHA_FULL_MAG = 4;
const ALPHA_FAINT_MAG = 6.5;
const ALPHA_FAINT = 0.6;
/** Steps between full and faint opacity, so batches stay few. */
const ALPHA_STEPS = 4;
const SAMPLE_DEG = 3;
const GRID_STEP_DEG = 30;
const DEFAULT_CARDINALS = ["N", "E", "S", "W"] as const;

/** Radius class (0.5 px steps, never under the floor) from magnitude, before the zoom factor. */
function radiusClass(mag: number): number {
  const raw = Math.min(RADIUS_MAX_PX, Math.max(RADIUS_MIN_PX, RADIUS_BASE_PX - RADIUS_PER_MAG_PX * mag));
  return Math.max(RADIUS_MIN_PX, Math.round(raw * 2) / 2);
}

/** Opacity tier, 0 (full) to ALPHA_STEPS (faintest). */
function alphaTier(mag: number): number {
  const t = (mag - ALPHA_FULL_MAG) / (ALPHA_FAINT_MAG - ALPHA_FULL_MAG);
  return Math.round(Math.min(1, Math.max(0, t)) * ALPHA_STEPS);
}

function tierAlpha(tier: number): number {
  return 1 - (tier * (1 - ALPHA_FAINT)) / ALPHA_STEPS;
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
    const tier = alphaTier(star.mag);
    const dim = isBelow(alt);
    const glow = star.mag <= GLOW_MAG && !dim;
    const key = (((cls * 2) * (ALPHA_STEPS + 1) + tier) * 2 + (glow ? 1 : 0)) * 2 + (dim ? 1 : 0);
    let batch = batches.get(key);
    if (!batch) {
      batch = { radius: cls * zoom, alpha: tierAlpha(tier), dim, glow, xy: [] };
      batches.set(key, batch);
    }
    batch.xy.push(sx, sy);
  }
  return [...batches.entries()].sort((a, b) => a[0] - b[0]).map(([, batch]) => batch);
}

function planLines(input: FrameInput): LineBatch[] {
  const { scene, view, camera, viewport, layers, selection, hoverConstellation } = input;
  if (!layers.constellationLines) return [];
  const batches = new Map<number, LineBatch>();
  const v = scene.vectors;
  const vec = (i: number): Vec3 => [v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0];
  for (const con of scene.constellations) {
    const selected = con.id === selection;
    const hover = !selected && con.id === hoverConstellation;
    for (const [a, b] of con.segments) {
      const altA = view.altitudesDeg[a] ?? 0;
      const altB = view.altitudesDeg[b] ?? 0;
      if (!segmentShown(layers.below, altA, altB)) continue;
      const seg = projectSegment(camera, vec(a), vec(b), viewport.width, viewport.height);
      if (!seg) continue;
      const dim = isBelow(altA) || isBelow(altB);
      const key = (selected ? 4 : 0) + (hover ? 2 : 0) + (dim ? 1 : 0);
      let batch = batches.get(key);
      if (!batch) {
        batch = { selected, hover, dim, xy: [] };
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

const brightStars = new WeakMap<SkyScene, number[]>();

function brightIndices(scene: SkyScene): number[] {
  let list = brightStars.get(scene);
  if (!list) {
    list = [];
    scene.stars.forEach((star, i) => {
      if (star.mag <= BRIGHT_MAG) list?.push(i);
    });
    brightStars.set(scene, list);
  }
  return list;
}

/** Screen positions of the bright stars the map draws, in catalogue order. */
function brightScreenPoints(input: FrameInput): { x: number; y: number }[] {
  const { scene, view, camera, viewport, layers, magLimit } = input;
  const v = scene.vectors;
  const out: { x: number; y: number }[] = [];
  for (const i of brightIndices(scene)) {
    if ((scene.stars[i]?.mag ?? Infinity) > magLimit) continue;
    if (!starShown(layers.below, view.altitudesDeg[i] ?? 0)) continue;
    const p = projectToViewport(
      camera,
      [v[i * 3] ?? 0, v[i * 3 + 1] ?? 0, v[i * 3 + 2] ?? 0],
      viewport.width,
      viewport.height,
    );
    if (p) out.push(p);
  }
  return out;
}

function coversStar(mark: LabelMark, stars: readonly { x: number; y: number }[]): boolean {
  return stars.some(
    (s) =>
      Math.abs(mark.x - s.x) < mark.width / 2 + BRIGHT_CLEARANCE_PX &&
      Math.abs(mark.y - s.y) < mark.height / 2 + BRIGHT_CLEARANCE_PX,
  );
}

/** Offsets tried in order around the anchor: above, below, right, left, then corners. */
function labelOffsets(mark: LabelMark): [number, number][] {
  const dx = mark.width / 2 + LABEL_PAD_PX;
  const dy = mark.height + LABEL_PAD_PX;
  return [
    [0, -dy],
    [0, dy],
    [dx, 0],
    [-dx, 0],
    [dx, -dy],
    [-dx, -dy],
    [dx, dy],
    [-dx, dy],
  ];
}

function clampMark(mark: LabelMark, viewport: Viewport): LabelMark {
  return {
    ...mark,
    x: Math.min(viewport.width - mark.width / 2, Math.max(mark.width / 2, mark.x)),
    y: Math.min(viewport.height - mark.height / 2, Math.max(mark.height / 2, mark.y)),
  };
}

function planLabels(input: FrameInput): LabelMark[] {
  const { scene, view, camera, viewport, layers, selection, hoverConstellation } = input;
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
        hover: con.id !== selection && con.id === hoverConstellation,
        dim: !anyAbove,
      },
    });
  }
  candidates.sort(
    (a, b) =>
      Number(b.mark.selected) - Number(a.mark.selected) ||
      Number(b.mark.hover) - Number(a.mark.hover) ||
      a.brightness - b.brightness ||
      (a.mark.id < b.mark.id ? -1 : 1),
  );
  const cap = Math.max(LABEL_CAP_MIN, Math.floor((viewport.width * viewport.height) / LABEL_AREA_PX2));
  const placed: LabelMark[] = [];
  // Collisions are decided on the anchors, as before; offsets only clear bright stars.
  const anchors: LabelMark[] = [];
  const bright = brightScreenPoints(input);
  for (const { mark } of candidates) {
    if (placed.length >= cap) break;
    if (anchors.some((other) => overlaps(mark, other))) continue;
    let spot = mark;
    if (coversStar(mark, bright)) {
      for (const [ox, oy] of labelOffsets(mark)) {
        const moved = clampMark({ ...mark, x: mark.x + ox, y: mark.y + oy }, viewport);
        if (!coversStar(moved, bright) && !placed.some((other) => overlaps(moved, other))) {
          spot = moved;
          break;
        }
      }
    }
    if (placed.some((other) => overlaps(spot, other))) continue;
    anchors.push(mark);
    placed.push(spot);
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
  const label = kind === "selected" ? starLabel(star) : null;
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
