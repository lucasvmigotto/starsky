/**
 * The landing's one collapsed Advanced disclosure: the limiting magnitude, an
 * Explorer setting. Poster options (projection, shape, glow, title and the rest)
 * belong to the Studio and are not offered here.
 */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  mag: number;
  onMag: (mag: number) => void;
}

export default function AdvancedFields({ mag, onMag }: Props): JSX.Element {
  return (
    <details className="atlas-form-details">
      <summary>{t("landing.advanced.legend")}</summary>
      <div className="atlas-form-field">
        <div className="atlas-form-row">
          <label htmlFor="landing-mag">{t("landing.render.magnitude")}</label>
          <output htmlFor="landing-mag" className="atlas-form-value">
            {mag.toFixed(1)}
          </output>
        </div>
        <input
          id="landing-mag"
          type="range"
          className="atlas-form-range"
          min={1}
          max={7}
          step={0.1}
          value={mag}
          onChange={(event) => {
            onMag(Number(event.target.value));
          }}
        />
      </div>
    </details>
  );
}
