/**
 * Copy the link for the current view, as an icon button in the moment strip.
 * The outcome is announced, never silent: success through the status region
 * and a brief check mark, failure as text.
 */
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { Icon } from "../icons.tsx";

interface Props {
  /** Read at the moment of the click, so it is the view as it is now. */
  getLink: () => string;
  /** How long the check mark stays; for tests. */
  resetMs?: number;
}

type Outcome = "idle" | "copied" | "failed";

export const COPIED_ICON_MS = 2000;

export default function ExplorerCopyLink({ getLink, resetMs = COPIED_ICON_MS }: Props): JSX.Element {
  const [outcome, setOutcome] = useState<Outcome>("idle");

  useEffect(() => {
    if (outcome !== "copied") return;
    const timer = setTimeout(() => {
      setOutcome("idle");
    }, resetMs);
    return () => {
      clearTimeout(timer);
    };
  }, [outcome, resetMs]);

  const copy = (): void => {
    navigator.clipboard.writeText(getLink()).then(
      () => {
        setOutcome("copied");
      },
      () => {
        setOutcome("failed");
      },
    );
  };

  const label = t("explorer.link.copy");
  return (
    <>
      <button
        type="button"
        className="atlas-btn-icon explorer-copy-button"
        aria-label={label}
        title={label}
        data-icon={outcome === "copied" ? "check" : "link"}
        onClick={copy}
      >
        <Icon name={outcome === "copied" ? "check" : "link"} />
      </button>
      <p role="status" className="sr-only">
        {outcome === "copied" ? t("explorer.link.copied") : ""}
      </p>
      {outcome === "failed" && (
        <p role="alert" className="explorer-copy-status">
          {t("explorer.link.failed")}
        </p>
      )}
    </>
  );
}
