import { useEffect, useRef } from "react";
import { formatDetailLine } from "../lib/caption.ts";
import type { SharePayload } from "../lib/share.ts";
import {
  BAND_FRACTION,
  CANVAS_H,
  CANVAS_W,
  DISK_CX,
  DISK_CY,
  DISK_R,
  SKY_H,
  type Figure,
  type SkyModel,
} from "../lib/skymodel.ts";
import { SPEC } from "../lib/spec.ts";

export interface View {
  scale: number;
  fx: number;
  fy: number;
}

export const HOME_VIEW: View = { scale: 1, fx: DISK_CX, fy: DISK_CY };

interface Props {
  payload: SharePayload;
  model: SkyModel;
  view: View;
  hovered: number | null;
  selected: number | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onHoverFigure: (index: number | null, clientX: number, clientY: number) => void;
  onSelectFigure: (index: number) => void;
  fontsReady: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function px(value: number): string {
  return `${value.toString()}px`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${[r, g, b].join(",")},${alpha.toString()})`;
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef({ hovered, selected, view, fontsReady });
  activeRef.current = { hovered, selected, view, fontsReady };

  // Core draw routine (reads latest state via ref so rAF tweens stay smooth).
  const drawRef = useRef(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { hovered: hov, selected: sel, view: v } = activeRef.current;
    const opts = payload.options;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const focus: Figure | null =
      sel !== null
        ? (model.figures[sel] ?? null)
        : hov !== null
          ? (model.figures[hov] ?? null)
          : null;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Paper.
    ctx.fillStyle = SPEC.colors.background;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Zoom transform: focus point maps to disk center.
    ctx.save();
    ctx.translate(DISK_CX, DISK_CY);
    ctx.scale(v.scale, v.scale);
    ctx.translate(-v.fx, -v.fy);

    // Sky clip: circle or the disk's bounding square.
    ctx.beginPath();
    if (opts.shape === "circle") {
      ctx.arc(DISK_CX, DISK_CY, DISK_R, 0, Math.PI * 2);
    } else {
      ctx.rect(DISK_CX - DISK_R, DISK_CY - DISK_R, DISK_R * 2, DISK_R * 2);
    }
    ctx.clip();

    const dimmed = (fig: number) =>
      focus !== null && model.figures[fig] !== focus;

    // Constellation lines.
    if (opts.constellations) {
      for (const seg of model.segments) {
        const a = model.stars[seg.a];
        const b = model.stars[seg.b];
        const isFocus = focus !== null && model.figures[seg.figure] === focus;
        ctx.strokeStyle = withAlpha(
          SPEC.colors.line,
          isFocus ? Math.min(1, SPEC.constellations.lineAlpha + 0.3) : dimmed(seg.figure) ? 0.18 : SPEC.constellations.lineAlpha,
        );
        ctx.lineWidth = isFocus
          ? SPEC.constellations.lineWidth * 2
          : SPEC.constellations.lineWidth;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }

    // Glow halos for bright stars.
    if (opts.glow) {
      for (const s of model.stars) {
        if (s.mag > SPEC.stars.glowMagThreshold) continue;
        const [sx, sy] = [s.px, s.py];
        const radius = (s.size / 2) * SPEC.stars.glowRadiusFactor;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        const cream = withAlpha(
          SPEC.colors.star,
          SPEC.stars.glowAlpha * Math.min(3, opts.glow_intensity),
        );
        g.addColorStop(0, cream);
        g.addColorStop(1, "rgba(245,239,224,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Star cores.
    for (let i = 0; i < model.stars.length; i += 1) {
      const s = model.stars[i];
      ctx.globalAlpha = SPEC.stars.coreAlpha;
      ctx.fillStyle = SPEC.colors.star;
      ctx.beginPath();
      ctx.arc(s.px, s.py, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Labels at figure centroids.
    if (opts.constellations && opts.constellation_labels) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let fi = 0; fi < model.figures.length; fi += 1) {
        const fig = model.figures[fi];
        const isFocus = focus !== null && fig === focus;
        // render-spec pins labelUppercase: true (guarded by spec.test.ts).
        const label = fig.name.toUpperCase();
        ctx.font = `${px(SPEC.constellations.labelFontSize)} Inter, system-ui, sans-serif`;
        ctx.fillStyle = withAlpha(
          SPEC.colors.star,
          isFocus ? 1 : dimmed(fi) ? 0.3 : SPEC.constellations.labelAlpha,
        );
        ctx.fillText(label, fig.centroidX, fig.centroidY - 10);
      }
    }
    ctx.restore();

    // Ring frame.
    ctx.strokeStyle = withAlpha(SPEC.colors.ring, SPEC.shape.ringAlpha);
    ctx.lineWidth = SPEC.shape.ringWidth;
    ctx.beginPath();
    if (opts.shape === "circle") {
      ctx.arc(DISK_CX, DISK_CY, DISK_R, 0, Math.PI * 2);
    } else {
      ctx.strokeRect(
        DISK_CX - DISK_R,
        DISK_CY - DISK_R,
        DISK_R * 2,
        DISK_R * 2,
      );
    }
    ctx.stroke();

    // Caption band (title optional, detail always).
    const bandTop = CANVAS_H * (1 - BAND_FRACTION);
    const bandMid = bandTop + (CANVAS_H - bandTop) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = withAlpha(SPEC.colors.star, 0.92);
    const detail = formatDetailLine(
      payload.lat,
      payload.lon,
      payload.place,
      payload.when_utc,
      payload.tz,
    );
    if (opts.title) {
      ctx.font = `600 ${px(SPEC.caption.titleFontSize)} "Cormorant Garamond", "EB Garamond", serif`;
      ctx.fillText(opts.title, CANVAS_W / 2, bandMid - 20);
      ctx.font = `${px(SPEC.caption.detailFontSize)} Inter, system-ui, sans-serif`;
      ctx.fillStyle = withAlpha(SPEC.colors.star, 0.72);
      ctx.fillText(detail, CANVAS_W / 2, bandMid + 18);
    } else {
      ctx.font = `${px(SPEC.caption.detailFontSize)} Inter, system-ui, sans-serif`;
      ctx.fillStyle = withAlpha(SPEC.colors.star, 0.72);
      ctx.fillText(detail, CANVAS_W / 2, bandMid);
    }
  };

  // Redraw on state change + backing-store sizing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    drawRef.current();
  }, [canvasRef, model, payload, view, hovered, selected, fontsReady]);

  // Hit-testing: nearest segment within tolerance.
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
    <div ref={wrapRef} className="relative">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "auto", aspectRatio: `${CANVAS_W.toString()} / ${CANVAS_H.toString()}` }}
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
