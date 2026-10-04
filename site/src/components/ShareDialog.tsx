/**
 * Share controls (proposal §§25–26).
 *
 * Principle 3: a shared link is the primary artifact, so share sits above
 * export in the Viewer. Same disclosure shape as `ExportControls`: one
 * trigger, details hidden until opened, status reported in place through
 * a polite live region.
 *
 * Copy-image is deliberately absent: PNG/SVG/PDF already keep the file,
 * and a clipboard-image path would duplicate the exporter. This control
 * shares the *scene* — the link that reproduces it exactly.
 */
import { useState } from "react";
import { t } from "../i18n/index.ts";
import { formatLocalTime, formatCoords } from "../lib/caption.ts";
import type { SharePayload } from "../lib/share.ts";

interface Props {
  payload: SharePayload;
}

/** What the recipient gets: place, moment, and the settings that change the sky. */
function sceneSummary(payload: SharePayload): string {
  const where = payload.place ?? formatCoords(payload.lat, payload.lon);
  const when = formatLocalTime(payload.when_utc, payload.tz);
  return `${where} · ${when} · ${payload.options.projection} projection · mag ${payload.options.magnitude_limit.toFixed(1)}`;
}

export default function ShareDialog({ payload }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const panelId = "share-details";
  const triggerId = "share-trigger";

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus(t("viewer.linkCopied"));
    } catch {
      setStatus(t("viewer.linkFailed"));
    }
  };

  return (
    <div className="atlas-export">
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
        {open ? t("viewer.share.close") : t("viewer.share.open")}
      </button>

      <div
        id={panelId}
        className="atlas-export-actions"
        role="group"
        aria-label={t("viewer.share.heading")}
        hidden={!open}
      >
        <p className="atlas-form-hint">{sceneSummary(payload)}</p>
        <button
          type="button"
          className="atlas-export-button"
          onClick={() => {
            void copyLink();
          }}
        >
          {t("viewer.copyLink")}
        </button>
      </div>
      <p className="atlas-export-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
