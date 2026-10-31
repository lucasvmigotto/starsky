/** What the "below the horizon" layer lets through; shared by drawing and picking. */

import type { BelowMode } from "../sky/payload.ts";

export function isBelow(altDeg: number): boolean {
  return altDeg < 0;
}

export function starShown(mode: BelowMode, altDeg: number): boolean {
  return mode === "dimmed" || !isBelow(altDeg);
}

/** A segment with either end below the horizon is dimmed, or dropped when hidden. */
export function segmentShown(mode: BelowMode, altA: number, altB: number): boolean {
  return mode === "dimmed" || (!isBelow(altA) && !isBelow(altB));
}
