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
/**
 * The Sky Explorer's canvas palette (010-explorer-canvas, ADR-0007).
 *
 * Built from the interface tokens above; `render-spec.json` does not govern the
 * Explorer. Canvas takes plain strings, so the renderer reads these constants
 * once, never CSS variables per frame. Dimming is alpha, not a second colour, so
 * a star below the horizon is never mistaken for a different kind of object.
 *
 * Text pairs (`label`, `labelBelow`, `labelSelected`, `cardinal`) clear 4.5:1 and
 * the line/ring pairs 3:1 against `background` — `explorer-theme.test.ts` checks.
 * `color.accent` stays off the map (see the boundary note at the top).
 */
export const explorer = {
  background: color.bg,
  star: color.text,
  line: color.border,
  lineSelected: color.text,
  horizon: color.textFaint,
  grid: color.borderSoft,
  label: color.textMuted,
  labelBelow: color.textFaint,
  labelSelected: color.text,
  cardinal: color.textMuted,
  /** Selection ring and hover ring: a shape as well as a colour. */
  selection: color.focus,
  /** Background of the halo behind map text. */
  halo: color.bg,
  alpha: {
    /** Stars and lines below the horizon. */
    dim: 0.3,
    grid: 0.7,
    glow: 0.25,
    halo: 0.75,
  },
  font: {
    label: "12px system-ui, -apple-system, 'Segoe UI', sans-serif",
    labelSelected: "600 12px system-ui, -apple-system, 'Segoe UI', sans-serif",
    cardinal: "600 13px system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  /** Stroke widths in CSS pixels. */
  width: { line: 1, lineSelected: 2, horizon: 1.25, grid: 1, ring: 2, hoverRing: 1 },
  /** A glow circle is this many times the star radius. */
  glowScale: 2.6,
  /** Gap between a selection ring and its label. */
  labelGap: 6,
} as const;
