/**
 * Renderer abstraction (branch-by-abstraction, `docs/product/refactor.md` §5).
 *
 * The preview canvas is the existing implementation; the poster renderer is
 * the new one, selected by the `?renderer=poster` flag until the parity
 * harness proves it. Nothing else in the app needs to know which is active.
 */
import type { SharePayload } from "../share.ts";
import type { SkyModel } from "../skymodel.ts";
import { renderPosterToCanvas, type PreviewGeometry } from "./poster.ts";

export type RendererKind = "preview" | "poster";

/**
 * Which renderer to use. Default stays `preview` until refactor Slice 5 flips
 * it; `?renderer=poster` opts in for the parity harness and manual review.
 */
export function selectedRenderer(search: string): RendererKind {
  const params = new URLSearchParams(search);
  return params.get("renderer") === "poster" ? "poster" : "preview";
}

/**
 * A renderer turns a sky model into a canvas. Poster rendering needs the
 * preview's disk geometry only to map figure centroids (the model stores
 * them in preview pixels).
 */
export interface Renderer {
  readonly kind: RendererKind;
  render(
    payload: SharePayload,
    model: SkyModel,
    sizePx: number,
    preview: PreviewGeometry,
  ): HTMLCanvasElement;
}

export const posterRenderer: Renderer = {
  kind: "poster",
  render: (payload, model, sizePx, preview) =>
    renderPosterToCanvas(payload, model, sizePx, preview),
};
