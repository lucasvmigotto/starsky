/**
 * The moment: date and time beside the timezone and its Detect button, one row
 * on wide screens and stacked on phones. Wall-clock text is read in the zone
 * when the Explorer opens, so the two always agree.
 */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { Icon } from "../icons.tsx";
import { MAX_TEXT_CHARS } from "../../lib/landing/payload.ts";

interface Props {
  title: string;
  /** Why the title was refused, shown beside it. */
  titleError: string | null;
  onTitle: (title: string) => void;
  when: string;
  tz: string;
  onWhen: (when: string) => void;
  onTz: (tz: string) => void;
  onDetect: () => void;
}

export default function MomentFields({ title, titleError, onTitle, when, tz, onWhen, onTz, onDetect }: Props): JSX.Element {
  return (
    <>
      <div className="atlas-form-field">
        <label htmlFor="landing-title">{t("studio.title.label")}</label>
        <input
          id="landing-title"
          type="text"
          className="atlas-form-input"
          value={title}
          maxLength={MAX_TEXT_CHARS}
          placeholder={t("studio.title.placeholder")}
          aria-invalid={titleError === null ? undefined : true}
          aria-describedby={titleError === null ? undefined : "landing-title-error"}
          autoComplete="off"
          onChange={(event) => {
            onTitle(event.target.value);
          }}
        />
        {titleError !== null && (
          <p id="landing-title-error" role="alert" className="atlas-form-error">
            {titleError}
          </p>
        )}
      </div>
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
          <button
            type="button"
            className="atlas-btn-icon"
            aria-label={t("landing.tz.detect")}
            title={t("landing.tz.detect")}
            onClick={onDetect}
          >
            <Icon name="locate" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
