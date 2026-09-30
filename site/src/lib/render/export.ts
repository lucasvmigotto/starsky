/**
 * Poster exporters: PNG, SVG and true-vector PDF (BCR-0002).
 *
 * All three build from the *same* composed canvas/SVG so the exported poster
 * matches what the visitor sees. PDF goes through `svg2pdf.js` + jsPDF so the
 * text stays selectable and the artwork stays vector — never a raster page.
 */
import type { SharePayload } from "../share.ts";
import type { jsPDF } from "jspdf";
import type { SkyModel } from "../skymodel.ts";
import { SPEC } from "../spec.ts";
import { captionLines } from "./poster.ts";
import {
  captionMaxWidth,
  estimateTextWidth,
  SVG_LENGTH_ADJUST,
} from "./caption.ts";
import {
  AXIS_EXTENT,
  REFERENCE_DPI,
  posterGeometry,
  unitToCanvas,
} from "./poster.ts";

/** matplotlib point -> SVG user-unit pixels at the reference DPI. */
function pointsToPx(points: number): number {
  return points * (REFERENCE_DPI / 72);
}

export type ExportFormat = "png" | "svg" | "pdf";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the poster as a standalone SVG string.
 *
 * Text is real `<text>` (selectable, vector) and the font family is named, so
 * the exported file renders with the bundled face when opened in a browser.
 */
export function buildPosterSvg(
  payload: SharePayload,
  model: SkyModel,
  sizePx: number,
  /**
   * Measures text at a given font size (BCR-0010). SVG has no `maxWidth`, so
   * the caption has to be fitted here rather than left to clip at the viewBox
   * edge — but this function is pure and has no canvas, so the caller supplies
   * the measurement. `measureCaptionWidth` in `poster.ts` is the intended one,
   * and both renderers then share `captionLines`, so they cannot disagree.
   *
   * Defaults to a rough average-glyph estimate so an SVG can still be built
   * headlessly (tests, CLI-style use); the estimate is deliberately
   * conservative, erring toward shrinking text that would have fit.
   */
  measure: (text: string, fontSizePx: number) => number = estimateTextWidth,
): string {
  const geometry = posterGeometry(sizePx);
  const [cx, cy] = unitToCanvas(0, 0, geometry);
  const radius = (1 / AXIS_EXTENT) * (sizePx / 2);
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx.toString()}" height="${geometry.canvasHeight.toFixed(1)}" viewBox="0 0 ${sizePx.toString()} ${geometry.canvasHeight.toFixed(1)}">`,
  );
  parts.push(
    `<rect width="100%" height="100%" fill="${SPEC.colors.background}"/>`,
  );

  // Sky group, clipped to the disc.
  parts.push(`<g clip-path="url(#disc)">`);
  if (payload.options.constellations) {
    parts.push(
      `<g stroke="${SPEC.colors.line}" stroke-opacity="${SPEC.constellations.lineAlpha.toString()}" stroke-width="${(pointsToPx(SPEC.constellations.lineWidth)).toFixed(2)}">`,
    );
    for (const seg of model.segments) {
      const a = model.stars[seg.a];
      const b = model.stars[seg.b];
      const [ax, ay] = unitToCanvas(a.unitX, a.unitY, geometry);
      const [bx, by] = unitToCanvas(b.unitX, b.unitY, geometry);
      parts.push(
        `<line x1="${ax.toFixed(2)}" y1="${ay.toFixed(2)}" x2="${bx.toFixed(2)}" y2="${by.toFixed(2)}"/>`,
      );
    }
    parts.push(`</g>`);
  }
  parts.push(`<g fill="${SPEC.colors.star}" fill-opacity="${SPEC.stars.coreAlpha.toString()}">`);
  for (const star of model.stars) {
    const [x, y] = unitToCanvas(star.unitX, star.unitY, geometry);
    const r = pointsToPx(star.size) / 2;
    parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`);
  }
  parts.push(`</g>`);
  if (payload.options.constellations && payload.options.constellation_labels) {
    parts.push(
      `<g fill="${SPEC.colors.star}" fill-opacity="${SPEC.constellations.labelAlpha.toString()}" font-family="Cormorant Garamond, serif" font-size="${(pointsToPx(SPEC.constellations.labelFontSize)).toFixed(2)}" text-anchor="middle">`,
    );
    const previewCx = 400;
    const previewCy = 400;
    const previewR = 368;
    for (const figure of model.figures) {
      const ux = (figure.centroidX - previewCx) / previewR;
      const uy = (previewCy - figure.centroidY) / previewR;
      const [x, y] = unitToCanvas(ux, uy, geometry);
      const label = figure.name.toUpperCase();
      parts.push(
        `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" dominant-baseline="middle">${escapeXml(label)}</text>`,
      );
    }
    parts.push(`</g>`);
  }
  parts.push(`</g>`);

  if (payload.options.shape === "circle") {
    parts.push(
      `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="${SPEC.colors.ring}" stroke-opacity="${SPEC.shape.ringAlpha.toString()}" stroke-width="${(pointsToPx(SPEC.shape.ringWidth)).toFixed(2)}"/>`,
    );
  }

  // Caption. BCR-0010: fitted to the band so a long place name or IANA zone
  // cannot be clipped. The *decision* (how wide, which size) comes from
  // `captionLines`, shared with the canvas renderer, so a PNG and an SVG of one
  // moment cannot disagree.
  const bandTop = geometry.skyPx;
  const bandMid = bandTop + geometry.bandPx / 2;
  const maxWidth = captionMaxWidth(sizePx);
  const caption = captionLines(payload, geometry, measure);
  const twoLines = caption.length > 1;
  parts.push(
    `<g font-family="Cormorant Garamond, serif" text-anchor="middle" fill="${SPEC.colors.star}">`,
  );
  for (const [index, line] of caption.entries()) {
    const dy = twoLines
      ? (index === 0 ? -0.018 : 0.028) * geometry.canvasHeight
      : 0;
    // `textLength` + `lengthAdjust` is SVG's equivalent of canvas `maxWidth`;
    // without it a long caption runs past the viewBox and is clipped.
    const fit = ` textLength="${maxWidth.toFixed(2)}" lengthAdjust="${SVG_LENGTH_ADJUST}"`;
    const opacity =
      line.opacity === 1 ? "" : ` fill-opacity="${line.opacity.toString()}"`;
    parts.push(
      `<text x="${(sizePx / 2).toString()}" y="${(bandMid + dy).toFixed(2)}" font-size="${line.fontSizePx.toFixed(2)}"${opacity} dominant-baseline="middle"${fit}>${escapeXml(line.text)}</text>`,
    );
  }
  parts.push(`</g>`);

  parts.push(
    `<defs><clipPath id="disc"><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}"/></clipPath></defs>`,
  );
  parts.push(`</svg>`);
  return parts.join("");
}

/** Export the poster as a PNG blob. */
export async function exportPng(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed"));
    }, "image/png");
  });
}

/** Export the poster as an SVG blob. */
export function exportSvg(
  payload: SharePayload,
  model: SkyModel,
  sizePx: number,
): Blob {
  return new Blob([buildPosterSvg(payload, model, sizePx)], {
    type: "image/svg+xml",
  });
}

/** Export the poster as a true-vector PDF blob. */
export async function exportPdf(
  payload: SharePayload,
  model: SkyModel,
  sizePx: number,
): Promise<Blob> {
  const svg = buildPosterSvg(payload, model, sizePx);
  const { jsPDF } = await import("jspdf");
  const { svg2pdf } = await import("svg2pdf.js");
  const geometry = posterGeometry(sizePx);
  const doc = new jsPDF({
    orientation: geometry.canvasHeight > sizePx ? "portrait" : "landscape",
    unit: "px",
    format: [sizePx, geometry.canvasHeight],
  });

  // Embed the poster's own face (BCR-0006). Without this jsPDF falls back to the
  // 14 standard PDF fonts and the caption renders as Times on every reader,
  // which the export contract forbids. The subset is ~108 KB of the 1.2 MB
  // variable TTF, covering every glyph the poster can draw.
  await registerPosterFontForPdf(doc);

  const parser = new DOMParser();
  const element = parser.parseFromString(svg, "image/svg+xml")
    .documentElement;
  await svg2pdf(element, doc, {
    x: 0,
    y: 0,
    width: sizePx,
    height: geometry.canvasHeight,
  });
  return doc.output("blob");
}

/**
 * The family name the SVG asks for, and the names jsPDF needs.
 *
 * `buildPosterSvg` writes `font-family="Cormorant Garamond, serif"`, and
 * `svg2pdf` resolves that string against jsPDF's registered fonts — so the
 * family must be registered under exactly this name or the substitution
 * silently continues.
 */
const PDF_FONT_FAMILY = "Cormorant Garamond";
const PDF_FONT_VFS_NAME = "CormorantGaramond-subset.ttf";
const PDF_FONT_URL = "fonts/CormorantGaramond-subset.ttf";

/** Fetched once per session; the subset is small but not free. */
let pdfFontBase64: Promise<string> | null = null;

function loadPosterFontBase64(): Promise<string> {
  pdfFontBase64 ??= (async (): Promise<string> => {
    const url = `${import.meta.env.BASE_URL}${PDF_FONT_URL}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `could not load the PDF font at ${url} (HTTP ${response.status.toString()})`,
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    // jsPDF's VFS takes a binary string, so convert in chunks to avoid
    // blowing the argument limit on a large array.
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
      );
    }
    return btoa(binary);
  })();
  return pdfFontBase64;
}

/** Register the bundled subset with jsPDF under the SVG's family name. */
async function registerPosterFontForPdf(doc: jsPDF): Promise<void> {
  const base64 = await loadPosterFontBase64();
  doc.addFileToVFS(PDF_FONT_VFS_NAME, base64);
  // Identity-H: a composite font carrying exactly the subset's glyphs. The
  // poster's text includes a degree sign and an em dash, which WinAnsi cannot
  // represent faithfully.
  doc.addFont(
    PDF_FONT_VFS_NAME,
    PDF_FONT_FAMILY,
    "normal",
    undefined,
    "Identity-H",
  );
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
