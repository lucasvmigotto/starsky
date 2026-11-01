/**
 * The star tooltip: a page overlay, not canvas drawing, so showing it paints no
 * frame. It opens when a mouse or pen rests on a star and closes on any
 * movement away, a drag, a zoom, leaving the map, or Escape. It repeats facts
 * the inspector already gives, so it is hidden from screen readers.
 */
import { useLayoutEffect, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import type { ExplorerController } from "../../lib/explorer/controller.ts";
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
  /** Where the star under the pointer is drawn, as of the last move. */
  const star = useRef<{ x: number; y: number } | null>(null);
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvas) return;
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType === "touch" || e.buttons !== 0) {
        machine.reset();
        return;
      }
      const r = canvas.getBoundingClientRect();
      const hit = controller.starAt(e.clientX - r.left, e.clientY - r.top);
      if (hit) star.current = { x: hit.x, y: hit.y };
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
    const at = star.current;
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
  const detail = describeStar(scene, controller.view.ctx, open);
  if (!detail) return null;
  return (
    <div ref={el} className="explorer-tooltip" aria-hidden="true">
      <p className="explorer-tooltip-detail">
        {t("explorer.tooltip.detail", { name: detail.title, mag: formatMagnitude(detail.mag) })}
      </p>
    </div>
  );
}
