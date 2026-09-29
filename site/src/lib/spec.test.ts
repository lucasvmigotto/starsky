import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { SPEC, starSize } from "./spec.ts";

const here = dirname(fileURLToPath(import.meta.url));
const parsed: unknown = JSON.parse(
  readFileSync(join(here, "..", "..", "render-spec.json"), "utf-8"),
);
// The spec is read from disk as untyped JSON; values are asserted field by
// field against the typed SPEC, so the assertions below compare against
// `unknown` and TypeScript cannot narrow `toBe`. A cast keeps the conformance
// test honest: the runtime check is what matters here.
const renderSpec = parsed as {
  units: Record<string, unknown>;
  colors: Record<string, unknown>;
  stars: Record<string, unknown>;
  constellations: Record<string, unknown>;
  shape: Record<string, unknown>;
  caption: Record<string, unknown>;
};

// `toBe` from bun:test is generic over `T`; the untyped JSON side is `unknown`.
// `eq` preserves the equality check without fighting the overload set.
function eq(actual: unknown, expected: unknown): void {
  expect(actual).toEqual(expected);
}

describe("render-spec conformance", () => {
  it("matches normative colors", () => {
    eq({ ...SPEC.colors }, renderSpec.colors);
  });

  it("matches the shared unit contract", () => {
    eq(SPEC.units.referenceDpi, renderSpec.units["referenceDpi"]);
  });

  it("exposes the single-line caption size", () => {
    eq(
      SPEC.caption.singleCaptionFontSize,
      renderSpec.caption["singleCaptionFontSize"],
    );
  });

  it("matches star + constellation + shape + caption tokens", () => {
    const stars = renderSpec["stars"];
    eq(SPEC.stars.sizeMax, stars["sizeMax"]);
    eq(SPEC.stars.sizeMin, stars["sizeMin"]);
    eq(SPEC.stars.glowMagThreshold, stars["glowMagThreshold"]);
    eq(SPEC.stars.glowRadiusFactor, stars["glowRadiusFactor"]);
    eq(SPEC.stars.glowAlpha, stars["glowAlpha"]);
    eq(SPEC.stars.coreAlpha, stars["coreAlpha"]);
    const lines = renderSpec["constellations"];
    eq(SPEC.constellations.lineWidth, lines["lineWidth"]);
    eq(SPEC.constellations.lineAlpha, lines["lineAlpha"]);
    eq(SPEC.constellations.labelUppercase, lines["labelUppercase"]);
    eq(SPEC.constellations.labelFontSize, lines["labelFontSize"]);
    eq(SPEC.constellations.labelAlpha, lines["labelAlpha"]);
    const shape = renderSpec["shape"];
    eq(SPEC.shape.ringWidth, shape["ringWidth"]);
    eq(SPEC.shape.ringAlpha, shape["ringAlpha"]);
    const caption = renderSpec["caption"];
    eq(SPEC.caption.bandFraction, caption["bandFraction"]);
    eq(SPEC.caption.titleFontSize, caption["titleFontSize"]);
    eq(SPEC.caption.detailFontSize, caption["detailFontSize"]);
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
