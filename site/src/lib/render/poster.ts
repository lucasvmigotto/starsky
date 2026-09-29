/**
 * Browser poster renderer — the static-first replacement for matplotlib.
 *
 * Mirrors `src/starpy/render/figure.py`'s `compose_figure` layout so the two
 * renderers agree within the tolerance in
 * `site/src/lib/render/README.md` and `specs/007-renderer-export/contracts/render-spec.md`:
 *
 * - full canvas is `size_px` wide; the sky is a square `size_px` tall region
 *   on top and the caption band is `size_px * BAND_FRACTION` below it;
 * - the sky axes span `[-1.06, 1.06]` on both axes with equal aspect, so the
 *   unit disc sits inside with a small margin;
 * - stars are filled circles of diameter `starSize(mag)` in spec px, glow is
 *   a radial gradient for `mag < glowMagThreshold`, lines are drawn at
 *   `lineWidth`/`lineAlpha`, labels are uppercased at the figure centroid;
 * - the circle ring is drawn at unit radius for `shape === "circle"`;
 * - the caption uses `titleFontSize`/`detailFontSize` with the bundled
 *   Cormorant Garamond face.
 *
 * Every visual constant comes from `SPEC` (`render-spec.json`); nothing is
 * hard-coded here (constitution II).
 */
import { formatDetailLine } from "../caption.ts";
import type { SharePayload } from "../share.ts";
import type { SkyModel, VisibleStar } from "../skymodel.ts";
import { SPEC } from "../spec.ts";

/** The unit-disc extent the CLI sets via `ax.set_xlim(-1.06, 1.06)`. */
export const AXIS_EXTENT = 1.06;

/** Extra margin around the disc, mirroring matplotlib's axes padding. */
export const RING_COLOR = SPEC.colors.ring;

export interface PosterGeometry {
  /** Total canvas width and height in device-independent pixels. */
  sizePx: number;
  /** Height of the square sky region (== sizePx). */
  skyPx: number;
  /** Height of the caption band. */
  bandPx: number;
  /** Total canvas height (sky + band). */
  canvasHeight: number;
  /** Device pixels per logical pixel (for the backing store). */
  dpr: number;
}

export function posterGeometry(sizePx: number): PosterGeometry {
  const bandPx = sizePx * SPEC.caption.bandFraction;
  return {
    sizePx,
    skyPx: sizePx,
    bandPx,
    canvasHeight: sizePx + bandPx,
    dpr: 1,
  };
}

/** Unit-disc point that is a pixel coordinate in the preview model. */
export interface PreviewGeometry {
  diskCx: number;
  diskCy: number;
  diskR: number;
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r.toString()},${g.toString()},${b.toString()},${alpha.toString()})`;
}

/**
 * Map a unit-disc point to canvas pixels.
 *
 * The CLI draws the sky axes in a square region of side `skyPx` with limits
 * ±AXIS_EXTENT; so unit coordinate `u` maps to centre + `u / AXIS_EXTENT`
 * half-extent.
 */
export function unitToCanvas(
  u: number,
  v: number,
  geometry: PosterGeometry,
): [number, number] {
  const cx = geometry.sizePx / 2;
  const cy = geometry.skyPx / 2;
  const half = geometry.sizePx / 2;
  return [cx + (u / AXIS_EXTENT) * half, cy - (v / AXIS_EXTENT) * half];
}

/**
 * The CLI draws stars with matplotlib's `scatter(s = size**2)` at `DPI`. The
 * drawn marker diameter is `size` points = `size * DPI / 72` device pixels —
 * verified against matplotlib at DPI 150 in the Slice-3 investigation
 * (size 0.6→1 px, 5.57→11 px, 14.0→29 px).
 *
 * The parity harness first caught this being treated as pixels (stars far too
 * large), then a `sqrt(s/π)` correction that was too small. This is the
 * geometry matplotlib actually uses.
 */
export const REFERENCE_DPI = SPEC.units.referenceDpi;

/** Star radius in canvas pixels, matching matplotlib's point-based markers. */
function starRadiusPx(star: VisibleStar): number {
  const diameterPx = star.size * (REFERENCE_DPI / 72);
  return diameterPx / 2;
}

/**
 * Convert a matplotlib point size to canvas pixels at the reference DPI.
 *
 * The CLI sets `linewidths`, `fontsize` and the caption sizes in points and
 * renders at DPI 150, so every one of those becomes `pt * DPI / 72` px. Sizing
 * them by canvas ratio instead made labels 2.8 px at `size_px=320` where the
 * CLI draws ~14.6 px — the parity harness showed the browser with 81 rose
 * (label) pixels against the CLI's 1717.
 */
function pointsToPx(points: number): number {
  return points * (REFERENCE_DPI / 72);
}

function drawSegments(
  ctx: CanvasRenderingContext2D,
  model: SkyModel,
  geometry: PosterGeometry,
): void {
  ctx.strokeStyle = withAlpha(SPEC.colors.line, SPEC.constellations.lineAlpha);
  ctx.lineWidth = SPEC.constellations.lineWidth;
  ctx.beginPath();
  for (const seg of model.segments) {
    const a = model.stars[seg.a];
    const b = model.stars[seg.b];
    const [ax, ay] = unitToCanvas(a.unitX, a.unitY, geometry);
    const [bx, by] = unitToCanvas(b.unitX, b.unitY, geometry);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
}

/** Preview-space disc, for mapping figure centroids onto the poster. */
export interface PreviewOrigins {
  diskCx: number;
  diskCy: number;
  diskR: number;
}

/**
 * Draw the focus effect on top of an already-composed poster.
 *
 * The poster is flattened, so per-constellation alpha is no longer possible.
 * Instead: veil the whole disc, then redraw the focused figure's segments and
 * label on top. Visually equivalent to the old per-line dimming, and cheap
 * (one figure is a handful of segments) — no re-composition per hover.
 */
export function drawFocusOverlay(
  ctx: CanvasRenderingContext2D,
  model: SkyModel,
  geometry: PosterGeometry,
  preview: PreviewOrigins,
  focused: number,
  options: SharePayload["options"],
): void {
  const [cx, cy] = unitToCanvas(0, 0, geometry);
  const radius = (1 / AXIS_EXTENT) * (geometry.sizePx / 2);
  if (focused < 0 || focused >= model.figures.length) return;
  const figure = model.figures[focused];

  ctx.save();
  // Veil: dim everything inside the disc.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = withAlpha(SPEC.colors.background, 0.62);
  ctx.fillRect(
    cx - radius,
    cy - radius,
    radius * 2,
    radius * 2,
  );

  // Redraw the focused figure above the veil.
  if (options.constellations) {
    ctx.strokeStyle = withAlpha(
      SPEC.colors.line,
      Math.min(1, SPEC.constellations.lineAlpha + 0.3),
    );
    ctx.lineWidth = SPEC.constellations.lineWidth * 2;
    ctx.beginPath();
    for (const seg of model.segments) {
      if (model.figures[seg.figure] !== figure) continue;
      const a = model.stars[seg.a];
      const b = model.stars[seg.b];
      const [ax, ay] = unitToCanvas(a.unitX, a.unitY, geometry);
      const [bx, by] = unitToCanvas(b.unitX, b.unitY, geometry);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }

  if (options.constellations && options.constellation_labels) {
    const ux = (figure.centroidX - preview.diskCx) / preview.diskR;
    const uy = (preview.diskCy - figure.centroidY) / preview.diskR;
    const [lx, ly] = unitToCanvas(ux, uy, geometry);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${pointsToPx(SPEC.constellations.labelFontSize).toString()}px "Cormorant Garamond", serif`;
    ctx.fillStyle = withAlpha(SPEC.colors.line, 1);
    ctx.fillText(figure.name.toUpperCase(), lx, ly);
  }
  ctx.restore();
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  model: SkyModel,
  geometry: PosterGeometry,
  glowIntensity: number,
): void {
  const alpha = SPEC.stars.glowAlpha * Math.min(glowIntensity, 2.0);
  for (const star of model.stars) {
    if (star.mag >= SPEC.stars.glowMagThreshold) continue;
    const [x, y] = unitToCanvas(star.unitX, star.unitY, geometry);
    const radius = starRadiusPx(star) * SPEC.stars.glowRadiusFactor;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, withAlpha(SPEC.colors.star, alpha));
    gradient.addColorStop(1, withAlpha(SPEC.colors.star, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  model: SkyModel,
  geometry: PosterGeometry,
): void {
  ctx.globalAlpha = SPEC.stars.coreAlpha;
  ctx.fillStyle = SPEC.colors.star;
  for (const star of model.stars) {
    const [x, y] = unitToCanvas(star.unitX, star.unitY, geometry);
    ctx.beginPath();
    ctx.arc(x, y, starRadiusPx(star), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  model: SkyModel,
  geometry: PosterGeometry,
  preview: PreviewGeometry,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = pointsToPx(SPEC.constellations.labelFontSize);
  // The CLI draws labels in the line colour, not the star colour
  // (render/figure.py: `color=render_cfg.LINE_COLOR`). The bundled face is a
  // variable font; pin a normal weight so the browser does not pick a heavier
  // default than matplotlib (parity: label ink was ~3x the CLI's).
  ctx.font = `400 ${size.toString()}px "Cormorant Garamond", serif`;
  ctx.fillStyle = withAlpha(SPEC.colors.line, SPEC.constellations.labelAlpha);
  for (const figure of model.figures) {
    // Figure centroids are stored as preview pixels; map back to the unit
    // disc (the preview's DISK_R) before placing on the poster.
    const ux = (figure.centroidX - preview.diskCx) / preview.diskR;
    const uy = (preview.diskCy - figure.centroidY) / preview.diskR;
    const [x, y] = unitToCanvas(ux, uy, geometry);
    // render-spec pins labelUppercase: true (guarded by spec.test.ts).
    const label = figure.name.toUpperCase();
    ctx.fillText(label, x, y);
  }
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  geometry: PosterGeometry,
): void {
  const [cx, cy] = unitToCanvas(0, 0, geometry);
  const radius = (1 / AXIS_EXTENT) * (geometry.sizePx / 2);
  ctx.strokeStyle = withAlpha(RING_COLOR, SPEC.shape.ringAlpha);
  ctx.lineWidth = pointsToPx(SPEC.shape.ringWidth);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  payload: SharePayload,
  geometry: PosterGeometry,
): void {
  const bandTop = geometry.skyPx;
  const bandMid = bandTop + geometry.bandPx / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const detail = formatDetailLine(
    payload.lat,
    payload.lon,
    payload.place,
    payload.when_utc,
    payload.tz,
  );
  // matplotlib's `fig.text(x, y, …)` takes FIGURE fractions; the CLI's
  // `band_center ± 0.018/0.028` are fractions of the whole canvas, so the
  // offsets become `fraction * canvasHeight` here (they already did), but the
  // font sizes are points, not canvas ratios.
  if (payload.options.title) {
    ctx.font = `${pointsToPx(SPEC.caption.titleFontSize).toString()}px "Cormorant Garamond", serif`;
    ctx.fillStyle = withAlpha(SPEC.colors.star, 1);
    ctx.fillText(
      payload.options.title,
      geometry.sizePx / 2,
      bandMid - 0.018 * geometry.canvasHeight,
    );
    ctx.font = `${pointsToPx(SPEC.caption.detailFontSize).toString()}px "Cormorant Garamond", serif`;
    ctx.fillStyle = withAlpha(SPEC.colors.star, 0.92);
    ctx.fillText(
      detail,
      geometry.sizePx / 2,
      bandMid + 0.028 * geometry.canvasHeight,
    );
  } else {
    // The CLI uses fontsize 11 for the single-line caption (figure.py:227).
    ctx.font = `${pointsToPx(SPEC.caption.singleCaptionFontSize).toString()}px "Cormorant Garamond", serif`;
    ctx.fillStyle = withAlpha(SPEC.colors.star, 0.92);
    ctx.fillText(detail, geometry.sizePx / 2, bandMid);
  }
}

/**
 * Circular alpha mask, mirroring `figure_to_pil` in the CLI.
 *
 * For `shape === "circle"` the CLI paints everything outside the disc with
 * `alpha = 0` (transparent), not the background colour, so the disk reads as
 * a disc rather than a square. The browser must do the same or the parity
 * comparison sees the corners differ (which it did).
 */
function applyCircleMask(
  ctx: CanvasRenderingContext2D,
  geometry: PosterGeometry,
): void {
  const [cx, cy] = unitToCanvas(0, 0, geometry);
  const radius = (1 / AXIS_EXTENT) * (geometry.sizePx / 2);
  ctx.save();
  // `destination-in` keeps the destination only where the new shape is
  // opaque, so the fill colour is irrelevant — but it must be fully opaque
  // for the mask to work. The CLI masks the sky only, so the caption band
  // stays fully opaque.
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.rect(0, geometry.skyPx, geometry.sizePx, geometry.bandPx);
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill("evenodd");
  ctx.restore();
}

/**
 * Compose the poster onto a canvas context.
 *
 * `sizePx` is the width of the sky (and the width of the canvas); the caption
 * band extends the canvas below it, matching the CLI.
 */
export function renderPoster(
  ctx: CanvasRenderingContext2D,
  payload: SharePayload,
  model: SkyModel,
  sizePx: number,
  dpr = 1,
  preview: PreviewGeometry,
): PosterGeometry {
  const geometry = posterGeometry(sizePx);
  geometry.dpr = dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = SPEC.colors.background;
  ctx.fillRect(0, 0, geometry.sizePx, geometry.canvasHeight);

  // Sky is clipped to the disc/square, matching the preview's clip.
  ctx.save();
  const [cx, cy] = unitToCanvas(0, 0, geometry);
  const radius = (1 / AXIS_EXTENT) * (geometry.sizePx / 2);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (payload.options.constellations) {
    drawSegments(ctx, model, geometry);
  }
  if (payload.options.glow && payload.options.glow_intensity > 0) {
    drawGlow(ctx, model, geometry, payload.options.glow_intensity);
  }
  drawStars(ctx, model, geometry);
  if (payload.options.constellations && payload.options.constellation_labels) {
    drawLabels(ctx, model, geometry, preview);
  }
  ctx.restore();

  if (payload.options.shape === "circle") {
    drawRing(ctx, geometry);
    applyCircleMask(ctx, geometry);
  }
  drawCaption(ctx, payload, geometry);

  return geometry;
}

/** Render into a fresh detached canvas (used by tests and the exporters). */
export function renderPosterToCanvas(
  payload: SharePayload,
  model: SkyModel,
  sizePx: number,
  preview: PreviewGeometry,
  dpr = 1,
): HTMLCanvasElement {
  const geometry = posterGeometry(sizePx);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(geometry.sizePx * dpr);
  canvas.height = Math.round(geometry.canvasHeight * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable");
  renderPoster(ctx, payload, model, sizePx, dpr, preview);
  return canvas;
}
