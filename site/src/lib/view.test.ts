/**
 * The view transform, asserted as behaviour rather than as arithmetic.
 *
 * `project`/`unproject` below mirror what `SkyCanvas` actually does to the
 * canvas (`translate(C); scale(s); translate(-f)`). Asserting against them means
 * these tests fail if the maths is wrong *and* if it stops agreeing with the
 * renderer — which is the failure that would otherwise only be visible as "the
 * drag feels slightly wrong".
 */
import { describe, expect, it } from "bun:test";
import { CANVAS_H, CANVAS_W, DISK_CX, DISK_CY } from "./skymodel.ts";
import {
  clampScale,
  clampView,
  HOME_VIEW,
  isHomeView,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  type View,
  zoomAt,
} from "./view.ts";

/** Poster coordinates to screen coordinates, as the canvas transform does. */
function project(view: View, lx: number, ly: number): [number, number] {
  return [
    DISK_CX + view.scale * (lx - view.fx),
    DISK_CY + view.scale * (ly - view.fy),
  ];
}

/** The inverse, as the hit-test does. */
function unproject(view: View, sx: number, sy: number): [number, number] {
  return [
    view.fx + (sx - DISK_CX) / view.scale,
    view.fy + (sy - DISK_CY) / view.scale,
  ];
}

const ZOOMED: View = { scale: 2.4, fx: 300, fy: 380 };

describe("view transform", () => {
  it("projects and unprojects as inverses", () => {
    const [sx, sy] = project(ZOOMED, 512, 260);
    const [lx, ly] = unproject(ZOOMED, sx, sy);
    expect(lx).toBeCloseTo(512, 9);
    expect(ly).toBeCloseTo(260, 9);
  });

  describe("panning", () => {
    it("carries the poster with the pointer", () => {
      const before = project(ZOOMED, 300, 380);
      const after = project(panBy(ZOOMED, 60, -40), 300, 380);
      expect(after[0] - before[0]).toBeCloseTo(60, 9);
      expect(after[1] - before[1]).toBeCloseTo(-40, 9);
    });

    it("moves further per pointer pixel the more it is zoomed out", () => {
      // One screen pixel of travel is one logical pixel of travel divided by
      // the scale, so the same drag crosses less sky the closer you are.
      const near = panBy({ scale: 6, fx: 400, fy: 400 }, 10, 0);
      const wide = panBy({ scale: 1.2, fx: 400, fy: 400 }, 10, 0);
      expect(Math.abs(near.fx - 400)).toBeLessThan(Math.abs(wide.fx - 400));
    });

    it("cannot lose the poster at the minimum scale", () => {
      // Scale 1 fills the frame exactly, so there is nothing behind the poster
      // to pan to and any movement must be a no-op.
      for (const [dx, dy] of [
        [0, 0],
        [-900, 0],
        [900, 0],
        [0, -900],
        [0, 900],
      ]) {
        expect(isHomeView(panBy(HOME_VIEW, dx, dy))).toBe(true);
      }
    });

    it("keeps the focus inside the poster however far it is flung", () => {
      const flung = panBy({ scale: 4, fx: 400, fy: 400 }, -100000, 100000);
      expect(flung.fx).toBeGreaterThanOrEqual(0);
      expect(flung.fx).toBeLessThanOrEqual(CANVAS_W);
      expect(flung.fy).toBeGreaterThanOrEqual(0);
      expect(flung.fy).toBeLessThanOrEqual(CANVAS_H);
    });
  });

  describe("zooming", () => {
    it("holds the anchored point still", () => {
      const anchor: [number, number] = [DISK_CX + 120, DISK_CY - 90];
      const before = unproject(ZOOMED, anchor[0], anchor[1]);
      const zoomed = zoomAt(ZOOMED, anchor[0], anchor[1], 1.8);
      const after = unproject(zoomed, anchor[0], anchor[1]);
      expect(after[0]).toBeCloseTo(before[0], 6);
      expect(after[1]).toBeCloseTo(before[1], 6);
    });

    it("moves the view when the anchor is off-centre", () => {
      // Zooming about the centre must not drift the focus; zooming about the
      // cursor must, or the anchor test above would pass trivially.
      const centred = zoomAt(ZOOMED, DISK_CX, DISK_CY, 2);
      expect(centred.fx).toBeCloseTo(ZOOMED.fx, 9);
      expect(centred.fy).toBeCloseTo(ZOOMED.fy, 9);

      const cornered = zoomAt(ZOOMED, CANVAS_W, 0, 2);
      expect(cornered.fx).not.toBeCloseTo(ZOOMED.fx, 3);
      expect(cornered.fy).not.toBeCloseTo(ZOOMED.fy, 3);
    });

    it("round-trips: zooming out returns exactly home", () => {
      // Not "close to" — the reset control's disabled state is compared by
      // equality, so an approximate return would leave it live after a reset.
      const zoomed = zoomAt(HOME_VIEW, 620, 250, 2.4);
      expect(isHomeView(zoomed)).toBe(false);
      expect(isHomeView(zoomAt(zoomed, 620, 250, 1 / 2.4))).toBe(true);
    });

    it("stops at the bounds", () => {
      expect(clampScale(0)).toBe(MIN_SCALE);
      expect(clampScale(1e9)).toBe(MAX_SCALE);
      expect(clampScale(NaN)).toBe(HOME_VIEW.scale);
      expect(clampScale(Infinity)).toBe(MAX_SCALE);
    });

    it("degrades to home rather than to NaN", () => {
      const broken = clampView({ scale: Number.NaN, fx: 1, fy: 2 });
      expect(Number.isNaN(broken.fx)).toBe(false);
      expect(Number.isNaN(broken.fy)).toBe(false);
      expect(isHomeView(broken)).toBe(true);
    });

    it("is a no-op at the bound rather than a jump", () => {
      const max = zoomAt({ scale: MAX_SCALE, fx: 400, fy: 400 }, 400, 400, 4);
      expect(max.scale).toBe(MAX_SCALE);
      const min = zoomAt(HOME_VIEW, 400, 400, 0.25);
      expect(isHomeView(min)).toBe(true);
    });
  });
});
