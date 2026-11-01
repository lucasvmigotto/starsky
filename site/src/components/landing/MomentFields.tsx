/**
 * The moment: date and time beside the timezone and its Detect button, one row
 * on wide screens and stacked on phones. Wall-clock text is read in the zone
 * when the Explorer opens, so the two always agree.
 */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  when: string;
  tz: string;
  onWhen: (when: string) => void;
  onTz: (tz: string) => void;
  onDetect: () => void;
}

export default function MomentFields({ when, tz, onWhen, onTz, onDetect }: Props): JSX.Element {
  return (
    <div className="atlas-form-pair">
      <div className="atlas-form-field">
        <label htmlFor="landing-when">{t("landing.moment.legend")}</label>
        <input
          id="landing-when"
          type="datetime-local"
          className="atlas-form-input"
          required
          value={when}
          onChange={(event) => {
            onWhen(event.target.value);
          }}
        />
      </div>
      <div className="atlas-form-field">
        <label htmlFor="landing-tz">{t("landing.tz.label")}</label>
        <div className="atlas-form-row">
          <input
            id="landing-tz"
            type="text"
            className="atlas-form-input"
            value={tz}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              onTz(event.target.value);
            }}
          />
          <button type="button" className="atlas-btn-ghost" onClick={onDetect}>
            {t("landing.tz.detect")}
          </button>
        </div>
      </div>
    </div>
  );
}
