/**
 * Poster export controls (BCR-0002, refactor Slice 4).
 *
 * Renders the poster off-screen at export resolution and offers PNG, SVG and
 * true-vector PDF. Every control is a real `<button>` and reports status
 * through a polite live region, so the flow is keyboard- and screen-reader-
 * reachable (constitution VI).
 */
import { useState } from "react";
import { t } from "../i18n/index.ts";
import type { SharePayload } from "../lib/share.ts";
import type { SkyModel } from "../lib/skymodel.ts";
import { DISK_CX, DISK_CY, DISK_R } from "../lib/skymodel.ts";
import {
  downloadBlob,
  exportPdf,
  exportPng,
  exportSvg,
} from "../lib/render/export.ts";
import type { PosterFormat } from "../lib/render/format.ts";
import { storyGeometry } from "../lib/render/format.ts";
import { renderPosterToCanvas } from "../lib/render/poster.ts";
import { Icon } from "./icons.tsx";
import { usePopoverStyle } from "./popover.ts";

/** Export size in CSS px (the poster's sky width, matching the CLI's default). */
export const EXPORT_SIZE_PX = 1600;

/** The story format's own export width: 1080 px, never the standard size. */
export const STORY_EXPORT_SIZE_PX = storyGeometry().widthPx;

const LAYOUTS: readonly PosterFormat[] = ["standard", "story"];

const LAYOUT_KEYS: Record<PosterFormat, string> = {
  standard: "viewer.export.layout.standard",
  story: "viewer.export.layout.story",
};

interface Props {
  payload: SharePayload;
  model: SkyModel;
  /** Controlled by the action area, so only one disclosure is open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Format = "png" | "svg" | "pdf";

/**
 * Each format's visible name is a catalogue key, not a literal (007 FT007).
 *
 * The same resolved string serves two jobs: the button's own label, and the
 * `{format}` slot in the failure message — so a translator changes "PDF" once
 * and both the button and the error agree.
 */
const LABEL_KEYS: Record<Format, string> = {
  png: "viewer.export.png",
  svg: "viewer.export.svg",
  pdf: "viewer.export.pdf",
};

/** The visible name of a format. */
function labelOf(format: Format): string {
  return t(LABEL_KEYS[format]);
}

function safeFilename(payload: SharePayload, layout: PosterFormat): string {
  const base = (payload.options.title ?? payload.place ?? "starsky-poster")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const name = base.length > 0 ? base : "starsky-poster";
  return layout === "story" ? `${name}-story` : name;
}

export default function ExportControls({ payload, model, open: controlled, onOpenChange }: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [status, setStatus] = useState<string>("");
  /**
   * Collapsed by default (vision principle 3): export is the last step, after
   * reading the map and sharing it. Three permanently-visible buttons made the
   * row the loudest thing on the page after the poster, which inverts
   * principle 2 ("the interface never outshines the poster").
   *
   * **Never persisted.** The hash is the share payload, so writing "expanded"
   * into it would change what a shared link means. It reverts on reload.
   */
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean): void => {
    setOwn(next);
    onOpenChange?.(next);
  };
  /** Never persisted, like `open`: the layout is chosen at export time (BCR-0012). */
  const [layout, setLayout] = useState<PosterFormat>("standard");
  const panelId = "export-formats";
  const triggerId = "export-trigger";

  const handleExport = async (format: Format): Promise<void> => {
    if (busy !== null) return;
    setBusy(format);
    setStatus(t("viewer.export.working"));
    try {
      const filename = `${safeFilename(payload, layout)}.${format}`;
      const sizePx = layout === "story" ? STORY_EXPORT_SIZE_PX : EXPORT_SIZE_PX;
      if (format === "svg") {
        downloadBlob(exportSvg(payload, model, sizePx, layout), filename);
      } else if (format === "pdf") {
        downloadBlob(
          await exportPdf(payload, model, sizePx, layout),
          filename,
        );
      } else {
        const canvas = renderPosterToCanvas(
          payload,
          model,
          sizePx,
          { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R },
          1,
          layout,
        );
        downloadBlob(await exportPng(canvas), filename);
      }
      setStatus(t("viewer.export.done", { filename }));
    } catch (error) {
      setStatus(
        t("viewer.export.failed", {
          format: labelOf(format),
          // The detail is data, not copy: it comes from the exporter or the
          // browser, and the template around it is what the catalogue owns.
          detail: error instanceof Error ? error.message : "unknown error",
        }),
      );
    } finally {
      setBusy(null);
    }
  };

  const popover = usePopoverStyle(open, triggerId);
  const label = open ? t("viewer.export.close") : t("viewer.export.open");

  return (
    <div className="atlas-export">
      {/*
       * One trigger rather than three always-visible buttons. `aria-expanded`
       * + `aria-controls` is the disclosure pattern: the formats are still
       * reachable by Tab once revealed, and no menu keyboard model is needed.
       */}
      <button
        type="button"
        id={triggerId}
        className="atlas-btn-icon"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Icon name="download" />
      </button>

      <div
        id={panelId}
        className="atlas-popover"
        role="group"
        aria-label={t("viewer.export.formats")}
        style={popover}
        hidden={!open}
      >
        <div
          className="atlas-form-radio-row atlas-export-layout"
          role="radiogroup"
          aria-label={t("viewer.export.layout")}
        >
          {LAYOUTS.map((value) => (
            <label key={value} className="atlas-form-radio">
              <input
                type="radio"
                name="export-layout"
                value={value}
                checked={layout === value}
                onChange={() => {
                  setLayout(value);
                }}
              />
              {t(LAYOUT_KEYS[value])}
            </label>
          ))}
        </div>
        {(["png", "svg", "pdf"] as const).map((format) => (
          <button
            key={format}
            type="button"
            className="atlas-btn-ghost"
            onClick={() => {
              void handleExport(format);
            }}
            disabled={busy !== null}
            aria-busy={busy === format}
          >
            {busy === format
              ? t("viewer.export.preparing", { format: labelOf(format) })
              : labelOf(format)}
          </button>
        ))}
        <p className="atlas-export-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
