/**
 * Caption fitting (BCR-0010).
 *
 * The caption is centred in a band exactly `sizePx` wide, so a long detail line
 * — a full `display_name`, an IANA zone — runs off both edges and is clipped.
 * Both renderers must fit it identically, and they cannot share code that way:
 * `poster.ts` draws with canvas and can pass `maxWidth`, while `export.ts`
 * builds SVG text as strings and has no canvas to measure with.
 *
 * So the *decision* lives here and both renderers consume it: this module
 * measures the string once with the same face and font size, and reports the
 * size each renderer should draw it at. Sharing the decision is what keeps the
 * PNG and the SVG of one moment from disagreeing, which constitution principle
 * II requires.
 *
 * Fitting is by uniform scale, never truncation. A clipped coordinate reads as
 * a rendering fault; a smaller one reads as a caption.
 */

/**
 * Inner width available to the caption, as a fraction of the poster width.
 * A fraction so it holds at every export size.
 */
export const CAPTION_INNER_WIDTH_FRACTION = 0.94;

/** The longest we will ever draw the caption. */
export function captionMaxWidth(sizePx: number): number {
  return sizePx * CAPTION_INNER_WIDTH_FRACTION;
}

/**
 * Font size at which `text` fits within `maxWidth`, and the natural width at
 * that size.
 *
 * Returns the input font size unchanged when the text already fits, so a short
 * caption renders at its specified size — the spec's font sizes are normative
 * and must not drift for the common case.
 */
export function fitCaption(
  text: string,
  fontSizePx: number,
  maxWidth: number,
  measure: (text: string, fontPx: number) => number,
): { fontSizePx: number; naturalWidth: number } {
  const naturalWidth = measure(text, fontSizePx);
  if (naturalWidth <= maxWidth || naturalWidth === 0) {
    return { fontSizePx, naturalWidth };
  }
  // Uniform scale; floor at a legible minimum rather than shrinking to nothing.
  const MIN_FONT_PX = 6;
  const scaled = (fontSizePx * maxWidth) / naturalWidth;
  return {
    fontSizePx: Math.max(MIN_FONT_PX, scaled),
    naturalWidth,
  };
}

/**
 * Headless fallback measurement (BCR-0010).
 *
 * Used only when no canvas is available — SVG has no `maxWidth` and the SVG
 * builder is a pure function. Cormorant Garamond's average advance for mixed
 * Latin with digits is roughly 0.46em, close enough to decide whether a caption
 * needs shrinking. The canvas path is authoritative and is what the app and the
 * reference tests use.
 */
export function estimateTextWidth(text: string, fontSizePx: number): number {
  const ADVANCE_EM = 0.46;
  // `Array.from` rather than spreading: this also works on astral-plane
  // characters (the ° in the coordinates), which `.length` would miscount.
  return Array.from(text).length * ADVANCE_EM * fontSizePx;
}

/**
 * `lengthAdjust` for SVG. `spacingAndGlyphs` scales the glyphs themselves,
 * which matches canvas's `maxWidth` behaviour (it scales horizontally) rather
 * than only tightening the letter spacing.
 */
export const SVG_LENGTH_ADJUST = "spacingAndGlyphs";