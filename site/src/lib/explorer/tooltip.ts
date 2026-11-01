/**
 * The hover tooltip's two pure parts: when it opens (a rest timer that knows
 * nothing about the page) and where it goes. Picking and drawing live elsewhere.
 * A target is any id, a star (`HIP:<n>`) or a constellation (`CON:<abbr>`); the
 * caller decides which one is under the pointer, a star first (019).
 */

/** A pointer must rest on a star or a constellation this long before the tooltip shows. */
export const HOVER_DELAY_MS = 1500;

export interface HoverOptions {
  setTimer: (callback: () => void, ms: number) => number;
  clearTimer: (handle: number) => void;
  delayMs?: number;
}

export class HoverMachine {
  private shown: string | null = null;
  /** The target the pointer is resting on; it keeps the timer from restarting for moves on it. */
  private candidate: string | null = null;
  private handle: number | null = null;
  private readonly delayMs: number;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: HoverOptions) {
    this.delayMs = options.delayMs ?? HOVER_DELAY_MS;
  }

  /** The star or constellation whose tooltip is showing, or null. */
  get open(): string | null {
    return this.shown;
  }

  /** The pointer is over this target, or over none (null). Call it on every move. */
  over(id: string | null): void {
    if (id === this.candidate) return;
    this.cancelTimer();
    this.candidate = id;
    this.hide();
    if (id === null) return;
    this.handle = this.options.setTimer(() => {
      this.handle = null;
      this.shown = id;
      this.notify();
    }, this.delayMs);
  }

  /** A drag, a zoom or leaving the map: close, and start over from the next move. */
  reset(): void {
    this.cancelTimer();
    this.candidate = null;
    this.hide();
  }

  /**
   * Escape. Returns true when a tooltip was open, so the key is spent on it. It
   * does not reopen for the same target; the pointer has to move to another one.
   */
  escape(): boolean {
    this.cancelTimer();
    return this.hide();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.cancelTimer();
    this.listeners.clear();
  }

  private hide(): boolean {
    if (this.shown === null) return false;
    this.shown = null;
    this.notify();
    return true;
  }

  private cancelTimer(): void {
    if (this.handle !== null) this.options.clearTimer(this.handle);
    this.handle = null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Size {
  /** Width at the right that something else covers, such as the side panel. */
  rightInset: number;
}

const GAP_PX = 14;
const MARGIN_PX = 8;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/**
 * Top-left corner for a tooltip beside a point (a star, or the pointer over a
 * constellation): right of it, else left, below or above; always inside the
 * bounds and clear of the point. In a viewport too small for any side it stays
 * inside and gives up clearing the point.
 */
export function placeTooltip(
  anchor: { x: number; y: number },
  size: Size,
  bounds: Bounds,
): { left: number; top: number } {
  const maxLeft = bounds.width - bounds.rightInset - size.width;
  const maxTop = bounds.height - size.height;
  const across = (x: number): number => clamp(x, MARGIN_PX, Math.max(MARGIN_PX, maxLeft - MARGIN_PX));
  const down = (y: number): number => clamp(y, MARGIN_PX, Math.max(MARGIN_PX, maxTop - MARGIN_PX));
  const right = { left: anchor.x + GAP_PX, top: down(anchor.y - size.height / 2), fits: anchor.x + GAP_PX <= maxLeft - MARGIN_PX };
  const left = {
    left: anchor.x - GAP_PX - size.width,
    top: down(anchor.y - size.height / 2),
    fits: anchor.x - GAP_PX - size.width >= MARGIN_PX,
  };
  const below = { left: across(anchor.x - size.width / 2), top: anchor.y + GAP_PX, fits: anchor.y + GAP_PX <= maxTop - MARGIN_PX };
  const above = {
    left: across(anchor.x - size.width / 2),
    top: anchor.y - GAP_PX - size.height,
    fits: anchor.y - GAP_PX - size.height >= MARGIN_PX,
  };
  const chosen = [right, left, below, above].find((c) => c.fits);
  if (chosen) return { left: chosen.left, top: chosen.top };
  return { left: clamp(right.left, 0, Math.max(0, maxLeft)), top: clamp(right.top, 0, Math.max(0, maxTop)) };
}
