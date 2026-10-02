/**
 * Design tokens — the single source for the interface's palette.
 *
 * `docs/product/ux-vision.md` → *Visual direction* is the intent; this file is
 * the implementation, and `contrast.test.ts` keeps the two honest by computing
 * every ratio in the vision's table from these values.
 *
 * **Boundary (spec.md DS-008, vision D19).** The poster's colours live in
 * `site/render-spec.json`, which is normative (constitution II) and guarded by
 * `spec.test.ts` plus the stored reference PNGs. They are deliberately NOT
 * mirrored here: the poster is a print, and a print does not take the
 * browser's theme. `color.accent` is for interactive chrome only — never for
 * anything representing a constellation inside the map.
 *
 * Dark only. A light theme was considered and declined (vision D5): the concept
 * is a dark page with a bright poster, and a light page competes with the
 * artifact rather than framing it.
 */
export const color = {
  /** Page. A blue-cast near-black: a night sky has colour. */
  bg: "#070b14",
  /** Panels and cards. */
  surface: "#0d1424",
  /** Hover and active rows — elevation by lightness, not shadow. */
  raised: "#141d31",
  /** Body text. Warm white, deliberately short of pure so stars stay brightest. */
  text: "#f2ede1",
  /** Secondary text. */
  textMuted: "#a9b3c8",
  /** Hints and metadata. */
  textFaint: "#7d879e",
  /** Verdigris — oxidised brass on a celestial atlas. Links, focus, selection. */
  accent: "#8ec9b4",
  /** Text on an accent fill. */
  accentInk: "#05222c",
  /** Control boundaries. Clears 3:1 non-text AA. */
  border: "#55648a",
  /**
   * Dividers and panel edges only. 1.62:1 — NOT a control boundary, because a
   * boundary that carries no information alone is decorative by definition.
   */
  borderSoft: "#2a3550",
  /** Focus ring. */
  focus: "#9ee6f5",
} as const;

export type ColorToken = keyof typeof color;

/**
 * Non-text minimum for a control boundary (WCAG 2.2 SC 1.4.11). Text and body
 * copy use 4.5 (SC 1.4.3).
 */
export const CONTRAST_MIN_TEXT = 4.5;
export const CONTRAST_MIN_UI = 3;