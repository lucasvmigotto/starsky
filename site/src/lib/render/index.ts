/**
 * The poster renderer — the only one (ADR-0003, BCR-0005).
 *
 * The `render-spec.json` tokens are the contract; `poster.ts` composes the
 * poster, `export.ts` serialises it, and `drawFocusOverlay` handles the
 * interactive focus effect on top of a composed poster.
 */
export {
  AXIS_EXTENT,
  drawFocusOverlay,
  posterGeometry,
  renderPoster,
  renderPosterToCanvas,
  unitToCanvas,
  type PosterGeometry,
  type PreviewOrigins,
} from "./poster.ts";
export {
  buildPosterSvg,
  downloadBlob,
  exportPdf,
  exportPng,
  exportSvg,
  type ExportFormat,
} from "./export.ts";
