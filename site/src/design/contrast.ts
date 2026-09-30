/**
 * WCAG 2.2 relative-luminance contrast.
 *
 * Exists because the vision's contrast table must stay *true*, not merely
 * written down: `contrast.test.ts` recomputes every pair from `tokens.ts`, so
 * editing a hex to something prettier fails the build instead of quietly
 * shipping unreadable text.
 *
 * Ported from the values verified when the vision was written; the same
 * computation produced the ratios quoted in `docs/product/ux-vision.md`.
 */

/** Parse `#rgb` or `#rrggbb`. Throws on anything else, so a typo fails loudly. */
export function parseHex(hex: string): readonly [number, number, number] {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ] as const;
}

/** One sRGB channel, linearised per WCAG 2.2. */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance: 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black/white). */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Truncate for test output so a failure prints `4.49`, not a float tail. */
export function round2(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}