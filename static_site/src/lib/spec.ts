/**
 * Normative visual tokens mirrored from `static_site/render-spec.json`.
 * Change both together; `src/tests/spec.test.ts` guards against drift.
 */
export const SPEC = {
  colors: {
    background: "#0b0f19",
    star: "#f5efe0",
    line: "#b98a8a",
    ring: "#f5efe0",
  },
  stars: {
    sizeMax: 14.0,
    sizeMin: 0.6,
    glowMagThreshold: 3.5,
    glowRadiusFactor: 5.0,
    glowAlpha: 0.13,
    coreAlpha: 0.95,
  },
  constellations: {
    lineWidth: 0.7,
    lineAlpha: 0.7,
    labelUppercase: true,
    labelFontSize: 7,
    labelAlpha: 0.85,
  },
  shape: {
    ringWidth: 2.0,
    ringAlpha: 0.9,
  },
  caption: {
    bandFraction: 0.22,
    titleFontSize: 17,
    detailFontSize: 10.5,
  },
  shareLink: {
    fragmentParam: "s",
    payloadVersion: 1,
  },
} as const;

/** size = size_max * 10 ** (mag / -2.5), clamped to [sizeMin, sizeMax]. */
export function starSize(mag: number): number {
  const raw = SPEC.stars.sizeMax * 10 ** (mag / -2.5);
  return Math.min(SPEC.stars.sizeMax, Math.max(SPEC.stars.sizeMin, raw));
}
