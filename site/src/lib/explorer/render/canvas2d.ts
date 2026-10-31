/**
 * Canvas 2D backend (ADR-0007). It draws a `FramePlan` and decides nothing:
 * stars go in one path per class, with no per-star blur or gradient.
 * Colors come from the `explorer` tokens as plain strings, read once.
 */

import { explorer } from "../../../design/tokens.ts";
import type { FramePlan, LabelMark, Polyline, SelectionMark } from "../frame.ts";
import type { ExplorerRenderer, RenderViewport } from "./types.ts";

const MAX_DPR = 2;
/** About 4096 x 4096: past this a phone would pay for pixels nobody can see. */
export const MAX_BACKING_PIXELS = 4096 * 4096;
const TAU = Math.PI * 2;

export class Canvas2dRenderer implements ExplorerRenderer {
  private ctx: CanvasRenderingContext2D | null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  render(plan: FramePlan, viewport: RenderViewport): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = viewport;
    if (!(width > 0) || !(height > 0)) return;
    const { sx, sy } = this.fitBackingStore(viewport);
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = explorer.background;
    ctx.fillRect(0, 0, width, height);

    this.drawPolylines(ctx, plan.grid, explorer.grid, explorer.width.grid, explorer.alpha.grid);
    this.drawPolylines(ctx, plan.horizon, explorer.horizon, explorer.width.horizon, 1);
    this.drawLines(ctx, plan);
    this.drawStars(ctx, plan);
    for (const mark of plan.marks) this.drawMark(ctx, mark);
    this.drawLabels(ctx, plan.labels);
    this.drawCardinals(ctx, plan);
    ctx.globalAlpha = 1;
  }

  dispose(): void {
    this.ctx = null;
  }

  /** Resizing clears the canvas and resets its state, so only touch it when the size changes. */
  private fitBackingStore({ width, height, dpr }: RenderViewport): { sx: number; sy: number } {
    let scale = Math.min(Math.max(dpr, 1), MAX_DPR);
    const area = width * height * scale * scale;
    if (area > MAX_BACKING_PIXELS) scale *= Math.sqrt(MAX_BACKING_PIXELS / area);
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    return { sx: w / width, sy: h / height };
  }

  private drawPolylines(
    ctx: CanvasRenderingContext2D,
    lines: readonly Polyline[],
    color: string,
    lineWidth: number,
    alpha: number,
  ): void {
    if (lines.length === 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    for (const { xy } of lines) {
      ctx.moveTo(xy[0] ?? 0, xy[1] ?? 0);
      for (let i = 2; i < xy.length; i += 2) ctx.lineTo(xy[i] ?? 0, xy[i + 1] ?? 0);
    }
    ctx.stroke();
  }

  private drawLines(ctx: CanvasRenderingContext2D, plan: FramePlan): void {
    for (const batch of plan.lines) {
      ctx.globalAlpha = batch.dim ? explorer.alpha.dim : 1;
      ctx.strokeStyle = batch.selected ? explorer.lineSelected : explorer.line;
      ctx.lineWidth = batch.selected ? explorer.width.lineSelected : explorer.width.line;
      ctx.beginPath();
      for (let i = 0; i < batch.xy.length; i += 4) {
        ctx.moveTo(batch.xy[i] ?? 0, batch.xy[i + 1] ?? 0);
        ctx.lineTo(batch.xy[i + 2] ?? 0, batch.xy[i + 3] ?? 0);
      }
      ctx.stroke();
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D, plan: FramePlan): void {
    ctx.fillStyle = explorer.star;
    for (const batch of plan.stars) {
      const alpha = batch.alpha * (batch.dim ? explorer.alpha.dim : 1);
      if (batch.glow) {
        // A restrained second circle for the brightest stars only.
        ctx.globalAlpha = alpha * explorer.alpha.glow;
        this.fillCircles(ctx, batch.xy, batch.radius * explorer.glowScale);
      }
      ctx.globalAlpha = alpha;
      this.fillCircles(ctx, batch.xy, batch.radius);
    }
  }

  private fillCircles(ctx: CanvasRenderingContext2D, xy: readonly number[], radius: number): void {
    ctx.beginPath();
    for (let i = 0; i < xy.length; i += 2) {
      const x = xy[i] ?? 0;
      ctx.moveTo(x + radius, xy[i + 1] ?? 0);
      ctx.arc(x, xy[i + 1] ?? 0, radius, 0, TAU);
    }
    ctx.fill();
  }

  private drawMark(ctx: CanvasRenderingContext2D, mark: SelectionMark): void {
    ctx.globalAlpha = mark.dim ? Math.max(explorer.alpha.dim, 0.6) : 1;
    ctx.strokeStyle = explorer.selection;
    ctx.lineWidth = mark.kind === "selected" ? explorer.width.ring : explorer.width.hoverRing;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.radius, 0, TAU);
    ctx.stroke();
    if (mark.label !== null) {
      ctx.globalAlpha = 1;
      ctx.font = explorer.font.labelSelected;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      this.text(ctx, mark.label, mark.x + mark.radius + explorer.labelGap, mark.y, explorer.labelSelected);
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D, labels: readonly LabelMark[]): void {
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of labels) {
      ctx.font = label.selected ? explorer.font.labelSelected : explorer.font.label;
      const color = label.selected
        ? explorer.labelSelected
        : label.dim
          ? explorer.labelBelow
          : explorer.label;
      this.text(ctx, label.text, label.x, label.y, color);
    }
  }

  private drawCardinals(ctx: CanvasRenderingContext2D, plan: FramePlan): void {
    if (plan.cardinals.length === 0) return;
    ctx.globalAlpha = 1;
    ctx.font = explorer.font.cardinal;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const c of plan.cardinals) this.text(ctx, c.text, c.x, c.y - explorer.labelGap, explorer.cardinal);
  }

  /** Text over stars and lines gets a soft halo of the sky colour so it stays legible. */
  private text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string): void {
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * explorer.alpha.halo;
    ctx.strokeStyle = explorer.halo;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(value, x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
}
