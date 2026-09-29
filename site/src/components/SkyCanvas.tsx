/**
 * The sky canvas — the poster renderer, interactive.
 *
 * The poster is composed **once** into an offscreen canvas and blitted to the
 * visible one; zoom/pan is a transform on that blit, so the rAF tween never
 * recomposes the sky. Hover draws a focus overlay on top (veil + the focused
 * figure), which needs no recomposition either.
 *
 * The preview renderer that used to live here was deleted with the default flip
 * (BCR-0005/ADR-0003 made the poster the only renderer).
 */
import { useEffect, useMemo, useRef } from "react";
import { drawFocusOverlay, renderPoster } from "../lib/render/poster.ts";
import type { SharePayload } from "../lib/share.ts";
import {
  CANVAS_H,
  CANVAS_W,
  DISK_CX,
  DISK_CY,
  DISK_R,
  SKY_H,
  type SkyModel,
} from "../lib/skymodel.ts";

export interface View {
  scale: number;
  fx: number;
  fy: number;
}

export const HOME_VIEW: View = { scale: 1, fx: DISK_CX, fy: DISK_CY };

const PREVIEW = { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R };

interface Props {
  payload: SharePayload;
  model: SkyModel;
  view: View;
  hovered: number | null;
  selected: number | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onHoverFigure: (index: number | null, clientX: number, clientY: number) => void;
  onSelectFigure: (index: number) => void;
  /** Redraw once the webfont has settled so the caption uses the real face. */
  fontsReady: boolean;
}

export default function SkyCanvas({
  payload,
  model,
  view,
  hovered,
  selected,
  canvasRef,
  onHoverFigure,
  onSelectFigure,
  fontsReady,
}: Props) {
  const activeRef = useRef({ view, hovered, selected });
  activeRef.current = { view, hovered, selected };

  // Compose the poster once per (payload, model, dpr). Recomposing 400+ stars
  // per hover or per zoom frame would blow the render budget; the composition
  // is the expensive part, the blit is not.
  const poster = useMemo(() => {
    if (typeof document === "undefined") return null;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.round(CANVAS_W * dpr);
    offscreen.height = Math.round(CANVAS_H * dpr);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    renderPoster(ctx, payload, model, CANVAS_W, dpr, PREVIEW);
    return offscreen;
    // `fontsReady` is a dependency so the composition re-runs with the real
    // face once the webfont has loaded.
  }, [payload, model, fontsReady]);

  const drawRef = useRef(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas || !poster) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { view: v, hovered: hov, selected: sel } = activeRef.current;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (canvas.width !== poster.width || canvas.height !== poster.height) {
      canvas.width = poster.width;
      canvas.height = poster.height;
    }
    const geometry = {
      sizePx: CANVAS_W,
      skyPx: CANVAS_W,
      bandPx: CANVAS_W * 0.22,
      canvasHeight: CANVAS_H,
      dpr,
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Zoom transform, then a single blit of the composed poster.
    ctx.save();
    ctx.translate(DISK_CX, DISK_CY);
    ctx.scale(v.scale, v.scale);
    ctx.translate(-v.fx, -v.fy);
    ctx.drawImage(
      poster,
      0,
      0,
      CANVAS_W,
      CANVAS_H,
      0,
      0,
      CANVAS_W,
      CANVAS_H,
    );
    ctx.restore();

    // Focus overlay on top of the (unzoomed) blit: the effect is a whole-poster
    // veil, so it must not be scaled by the zoom transform.
    const focus = sel ?? hov;
    if (focus !== null && focus >= 0 && focus < model.figures.length) {
      drawFocusOverlay(ctx, model, geometry, PREVIEW, focus, payload.options);
    }
  };

  useEffect(() => {
    drawRef.current();
  }, [canvasRef, poster, view, hovered, selected, fontsReady]);

  // Hit-testing: nearest segment within tolerance (logical preview pixels).
  const pickFigure = (lx: number, ly: number): number | null => {
    const tol = 12 / view.scale;
    let best: number | null = null;
    let bestD = tol;
    for (const seg of model.segments) {
      const a = model.stars[seg.a];
      const b = model.stars[seg.b];
      const dx = b.px - a.px;
      const dy = b.py - a.py;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((lx - a.px) * dx + (ly - a.py) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = a.px + t * dx;
      const cy = a.py + t * dy;
      const d = Math.hypot(lx - cx, ly - cy);
      if (d < bestD) {
        bestD = d;
        best = seg.figure;
      }
    }
    return best;
  };

  const screenToLogical = (clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * CANVAS_W;
    const sy = ((clientY - rect.top) / rect.height) * CANVAS_H;
    // Invert zoom: screen = C + (logical - f) * scale
    return [
      view.fx + (sx - DISK_CX) / view.scale,
      view.fy + (sy - DISK_CY) / view.scale,
    ];
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${CANVAS_W.toString()} / ${CANVAS_H.toString()}`,
        }}
        className="block rounded-sm"
        role="img"
        aria-label={
          payload.options.title
            ? `Night sky poster titled ${payload.options.title}`
            : "Night sky poster"
        }
        onMouseMove={(e) => {
          const [lx, ly] = screenToLogical(e.clientX, e.clientY);
          const inSky =
            payload.options.shape === "circle"
              ? Math.hypot(lx - DISK_CX, ly - DISK_CY) <= DISK_R + 8
              : lx >= DISK_CX - DISK_R - 8 &&
                lx <= DISK_CX + DISK_R + 8 &&
                ly >= DISK_CY - DISK_R - 8 &&
                ly <= DISK_CY + DISK_R + 8 &&
                ly <= SKY_H;
          if (!inSky || ly > SKY_H) {
            onHoverFigure(null, e.clientX, e.clientY);
            return;
          }
          onHoverFigure(pickFigure(lx, ly), e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          onHoverFigure(null, 0, 0);
        }}
        onClick={(e) => {
          const [lx, ly] = screenToLogical(e.clientX, e.clientY);
          const fig = pickFigure(lx, ly);
          if (fig !== null) onSelectFigure(fig);
        }}
      />
      <span className="sr-only">
        Use the list of figures beside the sky to explore each constellation
        by keyboard.
      </span>
    </div>
  );
}
