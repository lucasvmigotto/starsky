/**
 * Where an action popover goes: fixed, right-aligned to its action row (else its
 * trigger) so it lines up with the panel it belongs to, opening
 * upward, then clamped so it stays inside the viewport (FR-011). Measured when
 * it opens and again on resize and scroll; nothing is measured while closed.
 */
import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";

const MARGIN_PX = 8;
const MAX_WIDTH_PX = 360;

export function usePopoverStyle(open: boolean, triggerId: string): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open) return;
    const place = (): void => {
      const trigger = document.getElementById(triggerId);
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const row = trigger.closest(".atlas-actions");
      const right = row ? row.getBoundingClientRect().right : rect.right;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const width = Math.min(MAX_WIDTH_PX, vw - 2 * MARGIN_PX);
      const left = Math.min(Math.max(right - width, MARGIN_PX), vw - width - MARGIN_PX);
      setStyle({
        left,
        width,
        bottom: vh - rect.top + MARGIN_PX,
        maxHeight: Math.max(120, rect.top - 2 * MARGIN_PX),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerId]);
  return open ? style : undefined;
}
