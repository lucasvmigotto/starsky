/**
 * The hover tooltip: a page overlay, not canvas drawing, so showing it paints no
 * frame. It opens when a mouse or pen rests on a star, or on a constellation
 * where no star is (019), and closes on any movement away, a drag, a zoom,
 * leaving the map, or Escape. It repeats facts the inspector already gives, so
 * it is hidden from screen readers.
 */
import { useLayoutEffect, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import type { ExplorerController } from "../../lib/explorer/controller.ts";
import { type ConstellationTip, constellationTip } from "../../lib/explorer/figure.ts";
import { describeStar } from "../../lib/explorer/inspect.ts";
import { HoverMachine, placeTooltip } from "../../lib/explorer/tooltip.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";
import { formatMagnitude } from "./format.ts";

interface Props {
  controller: ExplorerController;
  scene: SkyScene;
  canvas: HTMLCanvasElement | null;
  /** Width at the right that the side panel covers right now. */
  rightInset: () => number;
  /** For tests. */
  delayMs?: number;
}

export default function ExplorerTooltip({ controller, scene, canvas, rightInset, delayMs }: Props): JSX.Element | null {
  const [machine] = useState(
    () =>
      new HoverMachine({
        setTimer: (callback, ms) => window.setTimeout(callback, ms),
        clearTimer: (handle) => {
          window.clearTimeout(handle);
        },
        delayMs,
      }),
  );
  const open = useSyncExternalStore(
    (listener) => machine.subscribe(listener),
    () => machine.open,
  );
  /** Where the tooltip is anchored, as of the last move: the star, or the pointer over a figure. */
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvas) return;
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType === "touch" || e.buttons !== 0) {
        machine.reset();
        return;
      }
      const r = canvas.getBoundingClientRect();
      const hit = controller.tooltipAt(e.clientX - r.left, e.clientY - r.top);
      if (hit) anchor.current = { x: hit.x, y: hit.y };
      machine.over(hit?.id ?? null);
    };
    const close = (): void => {
      machine.reset();
    };
    // Before any other handler: the key is spent on the tooltip, not on the selection.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape" || !machine.escape()) return;
      e.preventDefault();
      e.stopPropagation();
    };
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", close, { passive: true });
    canvas.addEventListener("pointerleave", close, { passive: true });
    canvas.addEventListener("pointercancel", close, { passive: true });
    canvas.addEventListener("wheel", close, { passive: true });
    document.addEventListener("keydown", onKey, true);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", close);
      canvas.removeEventListener("pointerleave", close);
      canvas.removeEventListener("pointercancel", close);
      canvas.removeEventListener("wheel", close);
      document.removeEventListener("keydown", onKey, true);
      machine.dispose();
    };
  }, [canvas, controller, machine]);

  // Placed before paint, once its size is known, so it never flashes in the wrong place.
  useLayoutEffect(() => {
    const node = el.current;
    const at = anchor.current;
    if (!node || !canvas || !at) return;
    const box = canvas.getBoundingClientRect();
    const spot = placeTooltip(
      at,
      { width: node.offsetWidth, height: node.offsetHeight },
      { width: box.width, height: box.height, rightInset: rightInset() },
    );
    node.style.left = `${String(spot.left)}px`;
    node.style.top = `${String(spot.top)}px`;
    node.style.visibility = "visible";
  }, [open, canvas, rightInset]);

  if (open === null) return null;
  const lines = tooltipLines(scene, controller, open);
  if (!lines) return null;
  return (
    <div ref={el} className="explorer-tooltip" aria-hidden="true">
      <p className="explorer-tooltip-detail">{lines[0]}</p>
      {lines[1] !== undefined && <p className="explorer-tooltip-members">{lines[1]}</p>}
    </div>
  );
}

/** A star's one line, or a constellation's one or two. */
function tooltipLines(scene: SkyScene, controller: ExplorerController, id: string): [string, string?] | null {
  const star = describeStar(scene, controller.view.ctx, id);
  if (star) return [t("explorer.tooltip.detail", { name: star.title, mag: formatMagnitude(star.mag) })];
  const tip = constellationTip(scene, id);
  return tip ? constellationLines(tip) : null;
}

/** "{name} • {count} stars", then up to three named stars and "+{rest}" (FR-002). */
function constellationLines(tip: ConstellationTip): [string, string?] {
  const first =
    tip.count === 1
      ? t("explorer.tooltip.constellationOne", { name: tip.name })
      : t("explorer.tooltip.constellation", { name: tip.name, count: tip.count });
  if (tip.named.length === 0) return [first];
  const names = tip.named.join(", ");
  return [first, tip.rest > 0 ? t("explorer.tooltip.namedMore", { names, rest: tip.rest }) : names];
}
