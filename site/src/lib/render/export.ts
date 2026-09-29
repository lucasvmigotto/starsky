/**
 * Poster exporters: PNG, SVG and true-vector PDF (BCR-0002).
 *
 * All three build from the *same* composed canvas/SVG so the exported poster
 * matches what the visitor sees. PDF goes through `svg2pdf.js` + jsPDF so the
 * text stays selectable and the artwork stays vector — never a raster page.
 */
import type { SharePayload } from "../share.ts";
import type { SkyModel } from "../skymodel.ts";
import { formatDetailLine } from "../caption.ts";
import { SPEC } from "../spec.ts";
import { AXIS_EXTENT, posterGeometry, unitToCanvas } from "./poster.ts";

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
): string {
  const geometry = posterGeometry(sizePx);
  const scale = sizePx / 800;
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
      `<g stroke="${SPEC.colors.line}" stroke-opacity="${SPEC.constellations.lineAlpha.toString()}" stroke-width="${(SPEC.constellations.lineWidth * scale).toFixed(2)}">`,
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
    const r = (star.size / 2) * (sizePx / 2 / AXIS_EXTENT);
    parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`);
  }
  parts.push(`</g>`);
  if (payload.options.constellations && payload.options.constellation_labels) {
    parts.push(
      `<g fill="${SPEC.colors.star}" fill-opacity="${SPEC.constellations.labelAlpha.toString()}" font-family="Cormorant Garamond, serif" font-size="${(SPEC.constellations.labelFontSize * scale).toFixed(2)}" text-anchor="middle">`,
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
      `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="${SPEC.colors.ring}" stroke-opacity="${SPEC.shape.ringAlpha.toString()}" stroke-width="${(SPEC.shape.ringWidth * scale).toFixed(2)}"/>`,
    );
  }

  // Caption.
  const bandTop = geometry.skyPx;
  const bandMid = bandTop + geometry.bandPx / 2;
  const detail = formatDetailLine(
    payload.lat,
    payload.lon,
    payload.place,
    payload.when_utc,
    payload.tz,
  );
  parts.push(
    `<g font-family="Cormorant Garamond, serif" text-anchor="middle" fill="${SPEC.colors.star}">`,
  );
  if (payload.options.title) {
    parts.push(
      `<text x="${(sizePx / 2).toString()}" y="${(bandMid - 0.018 * geometry.canvasHeight).toFixed(2)}" font-size="${(SPEC.caption.titleFontSize * scale).toFixed(2)}" dominant-baseline="middle">${escapeXml(payload.options.title)}</text>`,
    );
    parts.push(
      `<text x="${(sizePx / 2).toString()}" y="${(bandMid + 0.028 * geometry.canvasHeight).toFixed(2)}" font-size="${(SPEC.caption.detailFontSize * scale).toFixed(2)}" fill-opacity="0.92" dominant-baseline="middle">${escapeXml(detail)}</text>`,
    );
  } else {
    parts.push(
      `<text x="${(sizePx / 2).toString()}" y="${bandMid.toFixed(2)}" font-size="${(11 * scale).toFixed(2)}" fill-opacity="0.92" dominant-baseline="middle">${escapeXml(detail)}</text>`,
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
  const parser = new DOMParser();
  const element = parser.parseFromString(svg, "image/svg+xml")
    .documentElement;
  await svg2pdf(element, doc, { x: 0, y: 0, width: sizePx, height: geometry.canvasHeight });
  return doc.output("blob");
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
