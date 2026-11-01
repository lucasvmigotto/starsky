/**
 * The chosen place, always in words and coordinates: the geocoder's name, or
 * "Dropped pin" / "Typed coordinates" when there is none (no reverse geocoding).
 * A polite status region, so a pin dropped on the map is announced.
 */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { formatCoords } from "../../lib/caption.ts";
import type { LandingLocation } from "../../lib/landing/state.ts";

export function placeName(location: LandingLocation): string {
  if (location.place !== null) return location.place;
  return location.source === "typed" ? t("landing.selected.typed") : t("landing.selected.pin");
}

export default function LocationSummary({ location }: { location: LandingLocation }): JSX.Element {
  return (
    <div role="status" className="landing-selected">
      <p className="atlas-form-hint">{t("landing.selected.label")}</p>
      <p className="landing-selected-name">{placeName(location)}</p>
      <p className="atlas-form-hint">{formatCoords(location.lat, location.lon)}</p>
    </div>
  );
}
