/**
 * Poster export controls (BCR-0002, refactor Slice 4).
 *
 * Renders the poster off-screen at export resolution and offers PNG, SVG and
 * true-vector PDF. Every control is a real `<button>` and reports status
 * through a polite live region, so the flow is keyboard- and screen-reader-
 * reachable (constitution VI).
 */
import { useState } from "react";
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

const LABELS: Record<Format, string> = {
  png: "PNG",
  svg: "SVG",
  pdf: "PDF",
};

function safeFilename(payload: SharePayload): string {
  const base = (payload.options.title ?? payload.place ?? "starpy-poster")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "starpy-poster";
}

export default function ExportControls({ payload, model }: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleExport = async (format: Format): Promise<void> => {
    if (busy !== null) return;
    setBusy(format);
    setStatus(`Preparing ${LABELS[format]}…`);
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
      setStatus(`${LABELS[format]} downloaded.`);
    } catch (error) {
      setStatus(
        `${LABELS[format]} export failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="atlas-export">
      <p className="atlas-export-label" id="export-label">
        Export poster
      </p>
      <div
        className="atlas-export-actions"
        role="group"
        aria-labelledby="export-label"
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
            {busy === format ? `Preparing ${LABELS[format]}…` : LABELS[format]}
          </button>
        ))}
      </div>
      <p className="atlas-export-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
