/**
 * The page actions, rendered in the site footer (FR-011): Share, Export and the
 * page's own hand-offs as icon-only buttons of one size. Share and Export open
 * a popover above their button, one at a time; Escape closes it and returns
 * focus to the button. Each keeps its own live status region.
 */
import { useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";
import type { SharePayload } from "../lib/share.ts";
import type { SkyModel } from "../lib/skymodel.ts";
import ExportControls from "./ExportControls.tsx";
import ShareDialog from "./ShareDialog.tsx";

interface Props {
  payload: SharePayload;
  model: SkyModel;
  /** The link Share copies; defaults to the current address. */
  getLink?: () => string;
  /** The page's buttons and links, shown in the row after Share and Export. */
  children?: ReactNode;
}

type Panel = "share" | "export" | null;

export default function PosterActions({ payload, model, getLink, children }: Props): JSX.Element {
  const [open, setOpen] = useState<Panel>(null);

  useEffect(() => {
    if (open === null) return;
    const triggerId = open === "share" ? "share-trigger" : "export-trigger";
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(null);
      document.getElementById(triggerId)?.focus();
    };
    const onPointer = (event: PointerEvent): void => {
      if (event.target instanceof Element && event.target.closest(".atlas-actions") === null) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="atlas-actions">
      <ShareDialog
        payload={payload}
        getLink={getLink}
        open={open === "share"}
        onOpenChange={(next) => {
          setOpen(next ? "share" : null);
        }}
      />
      <ExportControls
        payload={payload}
        model={model}
        open={open === "export"}
        onOpenChange={(next) => {
          setOpen(next ? "export" : null);
        }}
      />
      {children}
    </div>
  );
}
