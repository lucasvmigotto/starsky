/**
 * Export formats (BCR-0012). `standard` is the poster's own shape; `story` puts
 * the same 1080 px poster in the middle of a 1080 x 1920 canvas.
 */
import { SPEC } from "../spec.ts";

export type PosterFormat = "standard" | "story";

export function storyGeometry(): { widthPx: number; heightPx: number } {
  return { ...SPEC.formats.story };
}

/**
 * Rows above (and below) the poster in a story. `(height - (sizePx + band)) / 2`
 * is 301.2 for 1080, and the poster is `round(sizePx + band)` = 1318 rows tall in
 * a raster, so the margin is that remainder halved: 301 whole pixels each side.
 * A fractional offset would resample the poster and break "same pixels as the
 * standard render".
 */
export function storyMargin(sizePx: number): number {
  const posterRows = Math.round(sizePx + sizePx * SPEC.caption.bandFraction);
  return Math.round((SPEC.formats.story.heightPx - posterRows) / 2);
}
