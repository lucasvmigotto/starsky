import { describe, expect, it } from "bun:test";
import { storyMargin, storyGeometry } from "./format.ts";
import { posterGeometry } from "./poster.ts";
import { SPEC } from "../spec.ts";

describe("story format geometry (BCR-0012)", () => {
  it("is 1080 x 1920", () => {
    const g = storyGeometry();
    expect(g.widthPx).toBe(1080);
    expect(g.heightPx).toBe(1920);
  });

  it("centers the 1080 poster: margin is within half a pixel of the exact value", () => {
    const poster = posterGeometry(1080);
    const exact = (1920 - (1080 + 1080 * SPEC.caption.bandFraction)) / 2;
    expect(Math.abs(storyMargin(1080) - exact)).toBeLessThanOrEqual(0.5);
    expect(storyMargin(1080)).toBe(301);
    // The standard canvas is 1318 rows; margins on both sides are equal.
    const rows = Math.round(poster.canvasHeight);
    expect(storyMargin(1080) * 2 + rows).toBe(1920);
  });

  it("lands on a whole pixel so the poster is not resampled", () => {
    expect(Number.isInteger(storyMargin(1080))).toBe(true);
  });
});
