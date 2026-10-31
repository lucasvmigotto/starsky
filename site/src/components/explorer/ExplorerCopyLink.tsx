/**
 * Copy the link for the current view, as an icon button in the moment strip.
 * The outcome is announced, never silent: success through the status region
 * and a brief check mark, failure as text.
 */
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  /** Read at the moment of the click, so it is the view as it is now. */
  getLink: () => string;
  /** How long the check mark stays; for tests. */
  resetMs?: number;
}

type Outcome = "idle" | "copied" | "failed";

export const COPIED_ICON_MS = 2000;

const LINK_PATHS = [
  "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
];
const CHECK_PATHS = ["M20 6 9 17l-5-5"];

function Icon({ paths }: { paths: readonly string[] }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

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
        className="explorer-pin explorer-icon-button explorer-copy-button"
        aria-label={label}
        title={label}
        data-icon={outcome === "copied" ? "check" : "link"}
        onClick={copy}
      >
        <Icon paths={outcome === "copied" ? CHECK_PATHS : LINK_PATHS} />
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
