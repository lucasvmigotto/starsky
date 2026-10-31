/**
 * Share control for the Studio: the same disclosure, summary and live status as
 * `ShareDialog`, but the link it copies is the finished sky (`#s=`), never the
 * editing session (`#studio=`). `ShareDialog` copies `window.location.href`,
 * which here would be the draft, so this one is given the link to copy.
 */
import { useState } from "react";
import { t } from "../../i18n/index.ts";
import { formatCoords, formatLocalTime } from "../../lib/caption.ts";
import type { SharePayload } from "../../lib/share.ts";

interface Props {
  payload: SharePayload;
  /** The `#s=` link for the current draft. */
  getLink: () => string;
}

function sceneSummary(payload: SharePayload): string {
  const where = payload.place ?? formatCoords(payload.lat, payload.lon);
  const when = formatLocalTime(payload.when_utc, payload.tz);
  return `${where} · ${when} · ${payload.options.projection} projection · mag ${payload.options.magnitude_limit.toFixed(1)}`;
}

export default function StudioShare({ payload, getLink }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const panelId = "share-details";

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getLink());
      setStatus(t("viewer.linkCopied"));
    } catch {
      setStatus(t("viewer.linkFailed"));
    }
  };

  return (
    <div className="atlas-export">
      <button
        type="button"
        id="share-trigger"
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
