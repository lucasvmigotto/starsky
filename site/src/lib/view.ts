/**
 * View-transform maths for the interactive poster.
 *
 * `SkyCanvas` draws the composed poster through one affine transform, which
 * reduces to a single equation — `C` being the disc centre the view pivots on:
 *
 *     screen = C + (logical - focus) * scale
 *
 * Dragging the map and zooming it are that equation and its inverse. They live
 * here, free of React and of the DOM, because this is the one part of the
 * interaction a test can actually pin down: "the map followed the pointer" and
 * "the map moved a bit" are indistinguishable by eye once the render is a blur
 * of constellations, and only the numbers tell them apart.
 */
import { CANVAS_H, CANVAS_W, DISK_CX, DISK_CY } from "./skymodel.ts";

export interface View {
  scale: number;
  /** Poster coordinates the view pivots on. */
  fx: number;
  fy: number;
}

/** The whole poster, undistorted: scale 1 is the 800x1000 frame exactly. */
export const HOME_VIEW: View = { scale: 1, fx: DISK_CX, fy: DISK_CY };

/**
 * 1 is the floor rather than something below it, because the poster already
 * fills its frame exactly; zoomed out past that there is only empty canvas to
 * reveal, which is a dead end rather than a view. 6 is about where individual
 * stars stop being distinguishable at poster scale.
 */
export const MIN_SCALE = 1;
export const MAX_SCALE = 6;

/** Pointer travel below this is a click, not a drag, so it must not select. */
export const DRAG_SLOP = 5;

export function clampScale(scale: number): number {
  // NaN is the only value with no meaningful clamp: it has no side, so it falls
  // back to the safe one. `Infinity` does, and clamps to the bound like any
  // other out-of-range number.
  if (Number.isNaN(scale)) return HOME_VIEW.scale;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Confine a view to the navigable range.
 *
 * Two rules, both about not being able to lose the map:
 *
 * - At `MIN_SCALE` the poster fills the frame, so any pan would push part of it
 *   off screen and reveal nothing behind. The view is pinned to home there,
 *   which is what makes "1" the minimum instead of a number below it.
 * - Above it, the focus stays inside the poster. That bound is what stops a
 *   flick from throwing the sky away for good. It is loosest around 2x, where
 *   a pan can still reach the dark margin beyond the disc, and tightens as you
 *   zoom in.
 */
export function clampView(view: View): View {
  const scale = clampScale(view.scale);
  if (scale <= MIN_SCALE) return HOME_VIEW;
  return {
    scale,
    fx: Math.min(CANVAS_W, Math.max(0, view.fx)),
    fy: Math.min(CANVAS_H, Math.max(0, view.fy)),
  };
}

/**
 * Drag the view by a pointer movement, so the poster tracks the pointer.
 *
 * `dx`/`dy` are in poster-screen pixels — the same 800x1000 space `drawImage`
 * covers — not viewport pixels, so the result does not depend on how wide the
 * canvas happens to be laid out.
 */
export function panBy(view: View, dx: number, dy: number): View {
  return clampView({
    scale: view.scale,
    fx: view.fx - dx / view.scale,
    fy: view.fy - dy / view.scale,
  });
}

/**
 * Zoom by `factor` while pinning whatever sat under `(ax, ay)` to that same
 * spot.
 *
 * The anchor is what separates zooming from scaling: without it the sky slides
 * out from under the cursor mid-gesture, which is the feeling people describe
 * as the map not really zooming.
 */
export function zoomAt(
  view: View,
  ax: number,
  ay: number,
  factor: number,
): View {
  const next = clampScale(view.scale * factor);
  if (next === view.scale) return view;
  return clampView({
    scale: next,
    // Re-derive from the anchor: focus' = anchorLogical - (anchor - C) / scale'
    fx: view.fx + (ax - DISK_CX) * (1 / view.scale - 1 / next),
    fy: view.fy + (ay - DISK_CY) * (1 / view.scale - 1 / next),
  });
}

/** Exact, so the bounds it is compared against are the same values it yields. */
export function isHomeView(view: View): boolean {
  return (
    view.scale === HOME_VIEW.scale &&
    view.fx === HOME_VIEW.fx &&
    view.fy === HOME_VIEW.fy
  );
}
