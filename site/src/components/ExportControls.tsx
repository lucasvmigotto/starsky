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
import { renderPosterToCanvas } from "../lib/render/poster.ts";

/** Export size in CSS px (the poster's sky width, matching the CLI's default). */
export const EXPORT_SIZE_PX = 1600;

interface Props {
  payload: SharePayload;
  model: SkyModel;
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

function safeFilename(payload: SharePayload): string {
  const base = (payload.options.title ?? payload.place ?? "starsky-poster")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "starsky-poster";
}

export default function ExportControls({ payload, model }: Props) {
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
  const [open, setOpen] = useState(false);
  const panelId = "export-formats";
  const triggerId = "export-trigger";

  const handleExport = async (format: Format): Promise<void> => {
    if (busy !== null) return;
    setBusy(format);
    setStatus(t("viewer.export.working"));
    try {
      const filename = `${safeFilename(payload)}.${format}`;
      if (format === "svg") {
        downloadBlob(exportSvg(payload, model, EXPORT_SIZE_PX), filename);
      } else if (format === "pdf") {
        downloadBlob(
          await exportPdf(payload, model, EXPORT_SIZE_PX),
          filename,
        );
      } else {
        const canvas = renderPosterToCanvas(
          payload,
          model,
          EXPORT_SIZE_PX,
          { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R },
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
        className="atlas-export-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {open ? t("viewer.export.close") : t("viewer.export.open")}
      </button>

      <div
        id={panelId}
        className="atlas-export-actions"
        role="group"
        aria-labelledby={triggerId}
        hidden={!open}
      >
        {(["png", "svg", "pdf"] as const).map((format) => (
          <button
            key={format}
            type="button"
            className="atlas-export-button"
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
      </div>
      <p className="atlas-export-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
