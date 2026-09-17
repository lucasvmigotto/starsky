import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPEC, starSize } from "./spec.ts";

const here = dirname(fileURLToPath(import.meta.url));
const parsed: unknown = JSON.parse(
  readFileSync(join(here, "..", "..", "render-spec.json"), "utf-8"),
);
const renderSpec = parsed as Record<string, Record<string, unknown>>;

describe("render-spec conformance", () => {
  it("matches normative colors", () => {
    expect({ ...SPEC.colors }).toEqual(renderSpec["colors"]);
  });

  it("matches star + constellation + shape + caption tokens", () => {
    const stars = renderSpec["stars"];
    expect(SPEC.stars.sizeMax).toBe(stars["sizeMax"]);
    expect(SPEC.stars.sizeMin).toBe(stars["sizeMin"]);
    expect(SPEC.stars.glowMagThreshold).toBe(stars["glowMagThreshold"]);
    expect(SPEC.stars.glowRadiusFactor).toBe(stars["glowRadiusFactor"]);
    expect(SPEC.stars.glowAlpha).toBe(stars["glowAlpha"]);
    expect(SPEC.stars.coreAlpha).toBe(stars["coreAlpha"]);
    const lines = renderSpec["constellations"];
    expect(SPEC.constellations.lineWidth).toBe(lines["lineWidth"]);
    expect(SPEC.constellations.lineAlpha).toBe(lines["lineAlpha"]);
    expect(SPEC.constellations.labelUppercase).toBe(lines["labelUppercase"]);
    expect(SPEC.constellations.labelFontSize).toBe(lines["labelFontSize"]);
    expect(SPEC.constellations.labelAlpha).toBe(lines["labelAlpha"]);
    const shape = renderSpec["shape"];
    expect(SPEC.shape.ringWidth).toBe(shape["ringWidth"]);
    expect(SPEC.shape.ringAlpha).toBe(shape["ringAlpha"]);
    const caption = renderSpec["caption"];
    expect(SPEC.caption.bandFraction).toBe(caption["bandFraction"]);
    expect(SPEC.caption.titleFontSize).toBe(caption["titleFontSize"]);
    expect(SPEC.caption.detailFontSize).toBe(caption["detailFontSize"]);
  });

  it("implements size = size_max * 10 ** (mag / -2.5) clamped to [0.6, 14]", () => {
    // Bright star saturates at the cap; faint star floors at the minimum.
    expect(starSize(-1.44)).toBe(14);
    expect(starSize(12)).toBe(0.6);
    // Interior point follows the formula exactly.
    const expected = 14.0 * 10 ** (3.0 / -2.5);
    expect(starSize(3.0)).toBeCloseTo(expected, 9);
    expect(starSize(3.0)).toBeGreaterThan(0.6);
    expect(starSize(3.0)).toBeLessThan(14);
  });
});
