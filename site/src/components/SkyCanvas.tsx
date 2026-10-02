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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DRAG_SLOP,
  HOME_VIEW,
  panBy,
  type View,
  zoomAt,
} from "../lib/view.ts";

export { HOME_VIEW };
export type { View };

/**
 * Zoom per wheel pixel. Exponential, because a wheel reports distance rather
 * than steps and a linear rate makes a slow scroll feel like it did nothing
 * while a fast flick overshoots. 0.0016 puts a 100px notch at ~15%, about a
 * quarter turn of the way to the next zoom step.
 */
const WHEEL_ZOOM_RATE = 0.0016;

/** Keyboard pan, in poster pixels per press; shift is the coarse pass. */
const KEY_PAN_STEP = 60;
const KEY_PAN_STEP_COARSE = 240;

/** Keyboard and button zoom, as a factor rather than a rate. */
const ZOOM_STEP = 1.5;

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
  /** A manual pan, zoom or pinch. Direct: the pointer is the easing curve. */
  onViewGesture: (next: View) => void;
  /** Return to the whole poster, as `Escape` and the controls both do. */
  onResetView: () => void;
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
  onViewGesture,
  onResetView,
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

    /*
     * One transform, blit and focus overlay.
     *
     * The overlay belongs inside it: the veil is a disc and the redrawn figure
     * a set of segments, both positioned in poster coordinates. Drawn outside
     * the transform they stay put while the poster moves under them, so a
     * zoomed view shows the veil covering only part of the frame and the
     * focused figure's name drawn twice, slightly offset. The canvas clips to
     * its own bounds, so nothing needs clipping here when zoomed in.
     *
     * The source rect is the *whole offscreen in device pixels*. It used to
     * read `0, 0, CANVAS_W, CANVAS_H` — logical pixels — which is the full
     * image only at dpr 1. Anywhere else it cropped the top-left 1/dpr of the
     * poster and stretched it over the frame. The destination stays logical:
     * the `setTransform(dpr, …)` above maps it back to device pixels.
     */
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

    const focus = sel ?? hov;
    if (focus !== null && focus >= 0 && focus < model.figures.length) {
      drawFocusOverlay(ctx, model, geometry, PREVIEW, focus, payload.options);
    }
    ctx.restore();
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

  /**
   * Viewport pixels to poster-screen pixels — the 800x1000 space the transform
   * works in. Every gesture is expressed in these, not in client pixels, so the
   * feel is identical whatever width the canvas is laid out at.
   */
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [0, 0];
      return [
        ((clientX - rect.left) / rect.width) * CANVAS_W,
        ((clientY - rect.top) / rect.height) * CANVAS_H,
      ];
    },
    [canvasRef],
  );

  const screenToLogical = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const [sx, sy] = clientToCanvas(clientX, clientY);
      // Invert zoom: screen = C + (logical - f) * scale
      const { view: v } = activeRef.current;
      return [
        v.fx + (sx - DISK_CX) / v.scale,
        v.fy + (sy - DISK_CY) / v.scale,
      ];
    },
    [clientToCanvas],
  );

  /*
   * Gesture state, in a ref rather than in React state.
   *
   * Pointer moves arrive far faster than it is worth re-rendering for, and the
   * handlers read this synchronously mid-event. `startView` is captured when
   * the gesture begins and every move is computed from it, so the view tracks
   * the pointer exactly instead of accumulating rounding a little further off
   * the target with each frame.
   */
  const gestureRef = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    mode: "idle" | "pan" | "pinch";
    startView: View;
    startCanvas: [number, number];
    startSpread: number;
    moved: boolean;
  }>({
    pointers: new Map(),
    mode: "idle",
    startView: HOME_VIEW,
    startCanvas: [0, 0],
    startSpread: 0,
    moved: false,
  });
  const [dragging, setDragging] = useState(false);

  const beginGesture = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const g = gestureRef.current;
    // `setPointerCapture` throws for a pointer id the browser no longer counts
    // as active. An exception here would abort the gesture before any of it is
    // set up, leaving a canvas that accepts presses and does nothing with them.
    try {
      canvasRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Not fatal. The listeners are on the element regardless; capture only
      // buys us moves that continue past its edge.
    }
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.moved = false;

    if (g.pointers.size === 1) {
      g.mode = "pan";
      g.startView = activeRef.current.view;
      g.startCanvas = clientToCanvas(event.clientX, event.clientY);
      setDragging(true);
    } else if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.mode = "pinch";
      // Zero when both fingers land on the same pixel; a factor of 1 is the
      // honest reading of that, and dividing by it would be not.
      g.startSpread = Math.hypot(a.x - b.x, a.y - b.y);
      g.startCanvas = clientToCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
      setDragging(true);
    }

    // A tooltip trailing the pointer while it drags reads as a glitch, and the
    // figure it names is about to move out from under it anyway.
    onHoverFigure(null, 0, 0);
  };

  const endGesture = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    const g = gestureRef.current;
    g.pointers.delete(event.pointerId);
    if (g.pointers.size === 0) {
      g.mode = "idle";
      setDragging(false);
      return;
    }
    // Two fingers down to one: rebase onto the remaining pointer, or the view
    // jumps the whole remaining distance on its next move.
    const [only] = [...g.pointers.values()];
    g.mode = "pan";
    g.startView = activeRef.current.view;
    g.startCanvas = clientToCanvas(only.x, only.y);
  };

  const drag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const g = gestureRef.current;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (g.mode === "pinch" && g.pointers.size < 2) {
      // Defensive: a pinch that lost a finger somewhere other than `endGesture`
      // would otherwise pan from the old midpoint and jump the view.
      g.mode = "pan";
      g.startView = activeRef.current.view;
      g.startCanvas = clientToCanvas(event.clientX, event.clientY);
    }

    if (g.mode === "pinch" && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      const [mx, my] = clientToCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
      // Pan by the midpoint's travel, then zoom about it: one two-finger
      // gesture moving and scaling at once, which is what a map is expected
      // to do and what neither a drag nor a wheel can express.
      const panned = panBy(g.startView, mx - g.startCanvas[0], my - g.startCanvas[1]);
      onViewGesture(
        zoomAt(panned, mx, my, g.startSpread > 0 ? spread / g.startSpread : 1),
      );
      g.moved = true;
      return;
    }

    g.mode = "pan";
    const [cx, cy] = clientToCanvas(event.clientX, event.clientY);
    const dx = cx - g.startCanvas[0];
    const dy = cy - g.startCanvas[1];
    if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) g.moved = true;
    onViewGesture(panBy(g.startView, dx, dy));
  };

  /*
   * Wheel zoom, on a listener rather than React's `onWheel`.
   *
   * React registers its wheel handler passively at the root, where
   * `preventDefault` is ignored — so with `onWheel` the page scrolls away
   * underneath the zoom and it looks like nothing happened at all. The
   * listener has to be registered non-passive for the map to keep the pointer.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      // Ctrl+wheel is the browser's own page zoom; taking it would break the
      // one zoom the visitor may actually need.
      if (event.ctrlKey) return;
      event.preventDefault();
      // deltaMode: 0 is pixels, 1 is lines, 2 is pages. A mouse reporting
      // lines would otherwise arrive as a ~3px nudge and feel broken.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const factor = Math.exp(-event.deltaY * unit * WHEEL_ZOOM_RATE);
      const [ax, ay] = clientToCanvas(event.clientX, event.clientY);
      onViewGesture(zoomAt(activeRef.current.view, ax, ay, factor));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [canvasRef, clientToCanvas, onViewGesture]);

  const trackHover = useCallback(
    (clientX: number, clientY: number): void => {
      const [lx, ly] = screenToLogical(clientX, clientY);
      const inSky =
        payload.options.shape === "circle"
          ? Math.hypot(lx - DISK_CX, ly - DISK_CY) <= DISK_R + 8
          : lx >= DISK_CX - DISK_R - 8 &&
            lx <= DISK_CX + DISK_R + 8 &&
            ly >= DISK_CY - DISK_R - 8 &&
            ly <= DISK_CY + DISK_R + 8 &&
            ly <= SKY_H;
      if (!inSky || ly > SKY_H) {
        onHoverFigure(null, clientX, clientY);
        return;
      }
      onHoverFigure(pickFigure(lx, ly), clientX, clientY);
    },
    // `pickFigure` closes over `view.scale` through the render, so this tracks
    // the current render rather than a stale one.
    [screenToLogical, payload.options.shape, model.segments, model.stars, view.scale, onHoverFigure],
  );

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${CANVAS_W.toString()} / ${CANVAS_H.toString()}`,
          /*
           * `touch-action: none` hands every gesture to us. Without it the
           * browser claims one-finger vertical drags to scroll the page, and
           * on a phone the poster fills most of the viewport — so panning the
           * map would be impossible exactly where it is most wanted.
           */
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
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
        aria-describedby="sky-gesture-hint"
        /*
          Focusable so the map is operable without a pointer. The figure list
          beside it is the richer keyboard path — it names what it holds —
          but "drag with the mouse" that only works with a mouse is not an
          equivalent, so the poster itself answers to the keyboard too.
        */
        tabIndex={0}
        onPointerDown={beginGesture}
        onPointerMove={(e) => {
          if (gestureRef.current.pointers.has(e.pointerId)) {
            drag(e);
            return;
          }
          trackHover(e.clientX, e.clientY);
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onPointerLeave={() => {
          // Pointer capture keeps delivering moves outside the element during
          // a drag; clearing the hover then would flash the tooltip off.
          if (gestureRef.current.mode !== "idle") return;
          onHoverFigure(null, 0, 0);
        }}
        onKeyDown={(e) => {
          const { view: v } = activeRef.current;
          const step = e.shiftKey ? KEY_PAN_STEP_COARSE : KEY_PAN_STEP;
          switch (e.key) {
            case "ArrowLeft":
              onViewGesture(panBy(v, -step, 0));
              break;
            case "ArrowRight":
              onViewGesture(panBy(v, step, 0));
              break;
            case "ArrowUp":
              onViewGesture(panBy(v, 0, -step));
              break;
            case "ArrowDown":
              onViewGesture(panBy(v, 0, step));
              break;
            case "+":
            case "=":
              onViewGesture(zoomAt(v, DISK_CX, DISK_CY, ZOOM_STEP));
              break;
            case "-":
            case "_":
              onViewGesture(zoomAt(v, DISK_CX, DISK_CY, 1 / ZOOM_STEP));
              break;
            case "0":
              onResetView();
              break;
            default:
              return;
          }
          // Arrow keys scroll the page unless the element claims them, which
          // would mean arrowing the map scrolls the map out of view.
          e.preventDefault();
        }}
        onClick={(e) => {
          // Every drag ends in a click. Without this, letting go over a
          // constellation selects it — so panning the map would keep opening
          // figures you were only moving past.
          if (gestureRef.current.moved) {
            gestureRef.current.moved = false;
            return;
          }
          const [lx, ly] = screenToLogical(e.clientX, e.clientY);
          const fig = pickFigure(lx, ly);
          if (fig !== null) onSelectFigure(fig);
        }}
      />
      <span className="sr-only" id="sky-gesture-hint">
        {t("viewer.canvasHint")}
      </span>
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
