/** Copy the link for the current view. The outcome is announced, never silent. */
import { useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  /** Read at the moment of the click, so it is the view as it is now. */
  getLink: () => string;
}

type Outcome = "idle" | "copied" | "failed";

export default function ExplorerCopyLink({ getLink }: Props): JSX.Element {
  const [outcome, setOutcome] = useState<Outcome>("idle");

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

  return (
    <div className="explorer-copy">
      <button type="button" className="explorer-pin" onClick={copy}>
        {t("explorer.link.copy")}
      </button>
      <p role="status" className="explorer-copy-status">
        {outcome === "copied" ? t("explorer.link.copied") : ""}
      </p>
      {outcome === "failed" && (
        <p role="alert" className="explorer-copy-status">
          {t("explorer.link.failed")}
        </p>
      )}
    </div>
  );
}
