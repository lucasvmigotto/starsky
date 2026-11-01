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
import { formatDecimal } from "../i18n/format.ts";
import { type Locale, t } from "../i18n/index.ts";
import { useLocale } from "../i18n/useLocale.ts";
import { Icon } from "./icons.tsx";
import { usePopoverStyle } from "./popover.ts";
import { formatLocalTime, formatCoords } from "../lib/caption.ts";
import type { Projection, SharePayload } from "../lib/share.ts";

interface Props {
  payload: SharePayload;
  /**
   * The link to copy; defaults to the current address. The Studio passes its
   * `#s=` link, so the copy is the finished sky and never the `#studio=` draft.
   */
  getLink?: () => string;
  /** Controlled by the action area, so only one disclosure is open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PROJECTION_KEYS = {
  stereographic: "viewer.share.projection.stereographic",
  fisheye: "viewer.share.projection.fisheye",
} as const satisfies Record<Projection, string>;

/**
 * What the recipient gets: place, moment, and the settings that change the sky.
 * Interface text, so it reads in the active locale (the poster keeps its own).
 */
export function sceneSummary(payload: SharePayload, locale: Locale): string {
  return t("viewer.share.summary", {
    where: payload.place ?? formatCoords(payload.lat, payload.lon),
    when: formatLocalTime(payload.when_utc, payload.tz, locale),
    projection: t(PROJECTION_KEYS[payload.options.projection]),
    mag: formatDecimal(payload.options.magnitude_limit, 1, locale),
  });
}

export default function ShareDialog({ payload, getLink, open: controlled, onOpenChange }: Props) {
  const locale = useLocale();
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean): void => {
    setOwn(next);
    onOpenChange?.(next);
  };
  const [status, setStatus] = useState("");
  const panelId = "share-details";
  const triggerId = "share-trigger";

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getLink ? getLink() : window.location.href);
      setStatus(t("viewer.linkCopied"));
    } catch {
      setStatus(t("viewer.linkFailed"));
    }
  };

  const popover = usePopoverStyle(open, triggerId);
  const label = open ? t("viewer.share.close") : t("viewer.share.open");

  return (
    <div className="atlas-export">
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
        <Icon name="share" />
      </button>

      <div
        id={panelId}
        className="atlas-popover"
        role="group"
        aria-label={t("viewer.share.heading")}
        style={popover}
        hidden={!open}
      >
        <p className="atlas-form-hint">{sceneSummary(payload, locale)}</p>
        <button
          type="button"
          className="atlas-btn-ghost"
          onClick={() => {
            void copyLink();
          }}
        >
          <Icon name="link" />
          {t("viewer.copyLink")}
        </button>
        <p className="atlas-export-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
