/**
 * Latitude and longitude as plain inputs. When the Coordinates switch is on they
 * take the search field's place, and they are the map's keyboard equivalent and
 * its fallback: they work with no map, no tiles and no network. Each field is
 * checked on its own and says what is wrong.
 */
import { useId } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { validateCoordinates } from "../../lib/landing/payload.ts";

interface Props {
  latText: string;
  lonText: string;
  onEdit: (latText: string, lonText: string) => void;
}

export default function CoordinateFields({ latText, lonText, onEdit }: Props): JSX.Element {
  const base = useId();
  const check = validateCoordinates(latText, lonText);

  return (
    <div className="atlas-form-grid">
      <div className="atlas-form-field">
        <label htmlFor="landing-lat">{t("landing.coords.lat")}</label>
        <input
          id="landing-lat"
          type="number"
          inputMode="decimal"
          className="atlas-form-input"
          min={-90}
          max={90}
          step="any"
          value={latText}
          aria-invalid={check.latInvalid}
          aria-describedby={check.latInvalid ? `${base}-lat-error` : undefined}
          onChange={(event) => {
            onEdit(event.target.value, lonText);
          }}
        />
        {check.latInvalid && (
          <p id={`${base}-lat-error`} role="alert" className="atlas-form-error">
            {t("landing.error.lat")}
          </p>
        )}
      </div>
      <div className="atlas-form-field">
        <label htmlFor="landing-lon">{t("landing.coords.lon")}</label>
        <input
          id="landing-lon"
          type="number"
          inputMode="decimal"
          className="atlas-form-input"
          min={-180}
          max={180}
          step="any"
          value={lonText}
          aria-invalid={check.lonInvalid}
          aria-describedby={check.lonInvalid ? `${base}-lon-error` : undefined}
          onChange={(event) => {
            onEdit(latText, event.target.value);
          }}
        />
        {check.lonInvalid && (
          <p id={`${base}-lon-error`} role="alert" className="atlas-form-error">
            {t("landing.error.lon")}
          </p>
        )}
      </div>
    </div>
  );
}
