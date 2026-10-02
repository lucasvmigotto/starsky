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
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n/index.ts";
import { formatDetailLine } from "../lib/caption.ts";
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

  /**
   * Device pixels per CSS pixel, capped like the composition.
   *
   * State rather than a fresh `window.devicePixelRatio` read, because browser
   * zoom changes the ratio *without* reloading — and a poster composed for the
   * old ratio is then blitted under the new one. The listener below is what
   * makes zooming the browser re-render the map instead of breaking it until
   * the next reload.
   */
  const [dpr, setDpr] = useState(() =>
    typeof window === "undefined"
      ? 1
      : Math.min(3, window.devicePixelRatio || 1),
  );

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const resubscribe = () => {
      setDpr(Math.min(3, window.devicePixelRatio || 1));
      mq?.removeEventListener("change", resubscribe);
      // A query on the *current* ratio fires exactly when the ratio stops
      // being current, so re-subscribing on every fire tracks zoom in both
      // directions with no polling.
      mq = window.matchMedia(
        `(resolution: ${window.devicePixelRatio.toString()}dppx)`,
      );
      mq.addEventListener("change", resubscribe);
    };
    resubscribe();
    return () => {
      mq?.removeEventListener("change", resubscribe);
    };
  }, []);

  /**
   * The caption as plain text, for the screen-reader copy (T036).
   *
   * Built from the same `formatDetailLine` the poster renders with, so the
   * spoken caption and the drawn one cannot disagree — the UI and the artifact
   * showing different coordinates is exactly what vision principle 4 forbids.
   */
  const caption = formatDetailLine(
    payload.lat,
    payload.lon,
    payload.place,
    payload.when_utc,
    payload.tz,
  );

  /** The focused figure's name, so "showing Orion" is announced and readable. */
  const focusedName =
    selected !== null ? (model.figures[selected]?.name ?? null) : null;

  // Compose the poster once per (payload, model, dpr). Recomposing 400+ stars
  // per hover or per zoom frame would blow the render budget; the composition
  // is the expensive part, the blit is not.
  const poster = useMemo(() => {
    if (typeof document === "undefined") return null;
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.round(CANVAS_W * dpr);
    offscreen.height = Math.round(CANVAS_H * dpr);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    renderPoster(ctx, payload, model, CANVAS_W, dpr, PREVIEW);
    return offscreen;
    // `fontsReady` is a dependency so the composition re-runs with the real
    // face once the webfont has loaded; `dpr` so a browser-zoom change
    // recomposes instead of blitting stale pixels until the next reload.
  }, [payload, model, fontsReady, dpr]);

  const drawRef = useRef(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas || !poster) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { view: v, hovered: hov, selected: sel } = activeRef.current;

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
    //
    // The source rect is the *whole offscreen in device pixels*. It used to
    // read `0, 0, CANVAS_W, CANVAS_H` — logical pixels — which is the full
    // image only at dpr 1. Anywhere else it cropped the top-left 1/dpr of the
    // poster and stretched it over the frame, so HiDPI and browser-zoomed
    // visitors got a map "zoomed into the left upper corner" on first paint.
    // The destination stays logical: the `setTransform(dpr, …)` above maps it
    // back to device pixels.
    ctx.save();
    ctx.translate(DISK_CX, DISK_CY);
    ctx.scale(v.scale, v.scale);
    ctx.translate(-v.fx, -v.fy);
    ctx.drawImage(
      poster,
      0,
      0,
      poster.width,
      poster.height,
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
        /*
          The caption and the focused figure are exposed as *text* below, not
          only in this label (000-design-system T036, DS-A11Y-006). An
          `aria-label` replaces the element's content, so a caption rendered
          inside the figure would be invisible to a screen reader; keeping it as
          sibling text is what makes the map's own words reachable.
        */
        aria-label={
          payload.options.title
            ? t("viewer.canvasLabel", { title: payload.options.title })
            : t("viewer.canvasLabel.untitled")
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
      <span className="sr-only">{t("figures.hint")}</span>
      {/*
        The caption as text (T036). Visually hidden because the poster already
        draws it, but a screen reader gets the coordinates, the place and the
        moment as words — which is the only way the map's identity is legible
        to anyone who cannot see it.
      */}
      <span className="sr-only">{caption}</span>
      {focusedName !== null && (
        <span className="sr-only">
          {t("viewer.announced.figureSelected", { name: focusedName })}
        </span>
      )}
    </div>
  );
}
