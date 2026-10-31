/**
 * The side panel's tab: a small handle on the right edge, or on the panel's
 * left edge once it is open. Phones use the sheet's own handle instead, so the
 * CSS hides this one there. It is small to look at and 44 px to hit.
 */
import type { JSX, RefObject } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  open: boolean;
  /** The id of the panel body it expands and collapses. */
  controls: string;
  onToggle: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}

export default function ExplorerPanelTab({ open, controls, onToggle, buttonRef }: Props): JSX.Element {
  const label = t(open ? "explorer.inspector.collapse" : "explorer.inspector.expand");
  return (
    <button
      ref={buttonRef}
      type="button"
      className="explorer-tab"
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
      data-chevron={open ? "right" : "left"}
      onClick={onToggle}
    >
      <span className="explorer-tab-face" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d={open ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
        </svg>
      </span>
    </button>
  );
}
