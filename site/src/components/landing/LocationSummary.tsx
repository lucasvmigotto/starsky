/**
 * The chosen place on one line: `<place> • <coordinates>`, or the coordinates alone when
 * there is no name (no reverse geocoding), with "Dropped pin" / "Typed coordinates" for
 * screen readers only.
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
  const named = location.place !== null;
  return (
    <div role="status" className="landing-selected">
      {/* Kept for screen readers: the line below reads "Exploring from <place>, <coordinates>". */}
      <p className="sr-only">{t("landing.selected.label")}</p>
      <p className="landing-selected-line">
        {named ? (
          // The bullet trails the place, never leads the coordinates, so a wrapped line cannot start with it.
          <span className="landing-selected-lead">
            <span className="landing-selected-name">{location.place}</span>
            <span className="landing-selected-coords" aria-hidden="true">
              {"\u00a0•"}
            </span>
          </span>
        ) : (
          // No place name: the coordinates stand alone, and a screen reader still hears what they are.
          <span className="sr-only">{placeName(location)}, </span>
        )}
        {/* The bullet is for the eye; a comma is for the ear. */}
        {named && <span className="sr-only">, </span>}
        <span className="landing-selected-coords">{formatCoords(location.lat, location.lon)}</span>
      </p>
    </div>
  );
}
