/** The Coordinates switch beside the place search: on, latitude and longitude replace it. */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  on: boolean;
  onToggle: () => void;
}

export default function CoordinateSwitch({ on, onToggle }: Props): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="landing-switch"
      onClick={onToggle}
    >
      <span className="landing-switch-track" aria-hidden="true">
        <span className="landing-switch-thumb" />
      </span>
      {t("landing.coords.toggle")}
    </button>
  );
}
