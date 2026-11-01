/**
 * The first page (013-location-first): one question, "where do you want to
 * explore the sky from?", answered by search, the map or coordinates. The form
 * state is one reducer in `lib/landing`; this component only wires it to the
 * controls. Poster choices live in the Studio.
 */
import { useReducer } from "react";
import type { JSX } from "react";
import { t } from "../i18n/index.ts";
import { type Built, type LandingInput, defaultTimezone, exploreHash, studioHash } from "../lib/landing/payload.ts";
import {
  type FormError,
  createInitialState,
  landingReducer,
  toLandingInput,
} from "../lib/landing/state.ts";
import { fragmentFromHash } from "../lib/share.ts";
import { randomSampleFragment } from "../lib/site.ts";
import SiteFooter from "./SiteFooter.tsx";
import SiteHeader from "./SiteHeader.tsx";
import AdvancedFields from "./landing/AdvancedFields.tsx";
import CoordinateFields, { COORDS_TOGGLE_ID } from "./landing/CoordinateFields.tsx";
import LocationMapPanel from "./landing/LocationMapPanel.tsx";
import LocationSummary from "./landing/LocationSummary.tsx";
import MomentFields from "./landing/MomentFields.tsx";
import PlaceSearch from "./landing/PlaceSearch.tsx";

function errorText(error: FormError): string | null {
  switch (error.kind) {
    case "when":
      return t("landing.error.when");
    case "timezone":
      return t("landing.error.timezone", { zone: JSON.stringify(error.zone) });
    case "coordinates":
      // The fields beside it say which one; the page does not repeat them.
      return null;
  }
}

function goToSample() {
  window.location.hash = `#s=${randomSampleFragment(fragmentFromHash(window.location.hash))}`;
}

export default function LandingPage(): JSX.Element {
  const [state, dispatch] = useReducer(landingReducer, undefined, () =>
    createInitialState({ now: new Date(), zone: defaultTimezone() }),
  );
  const { location } = state;
  const message = state.error === null ? null : errorText(state.error);

  const leave = (build: (input: LandingInput) => Built<string>): void => {
    const input = toLandingInput(state);
    if (!input.ok) {
      if (!state.coordsOpen) dispatch({ type: "coordinates-toggled" });
      dispatch({ type: "error", error: input.error });
      return;
    }
    const hash = build(input.value);
    if (!hash.ok) {
      dispatch({ type: "error", error: hash.error });
      return;
    }
    window.location.hash = hash.value;
  };

  return (
    <div className="atlas-page">
      <SiteHeader />
      <main className="atlas-main">
        <div className="atlas-form-wrap">
          <div className="atlas-moment">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">{t("landing.title")}</h1>
            <p className="mt-2 text-sm text-text-muted">{t("landing.subtitle")}</p>
          </div>

          <div className="atlas-panel atlas-form">
            <PlaceSearch
              fieldText={location.source === "search" ? (location.place ?? "") : ""}
              onChoose={(place) => {
                dispatch({ type: "place-chosen", lat: place.lat, lon: place.lon, place: place.short });
              }}
            />
            <LocationSummary location={location} />
            <LocationMapPanel
              open={state.mapOpen}
              expanded={state.mapExpanded}
              problem={state.mapProblem}
              lat={location.lat}
              lon={location.lon}
              focus={location.source === "pin" ? "keep" : "place"}
              skipToId={COORDS_TOGGLE_ID}
              onToggle={() => {
                dispatch({ type: "map-toggled" });
              }}
              onExpandToggle={() => {
                dispatch({ type: "map-expand-toggled" });
              }}
              onEscape={() => {
                dispatch({ type: "map-escape" });
              }}
              onPick={(lat, lon) => {
                dispatch({ type: "pin-dropped", lat, lon });
              }}
              onProblem={(problem) => {
                dispatch({ type: "map-problem", problem });
              }}
            />
            <CoordinateFields
              open={state.coordsOpen}
              latText={state.latText}
              lonText={state.lonText}
              onToggle={() => {
                dispatch({ type: "coordinates-toggled" });
              }}
              onEdit={(latText, lonText) => {
                dispatch({ type: "coordinates-edited", latText, lonText });
              }}
            />
            <MomentFields
              when={state.when}
              tz={state.tz}
              onWhen={(when) => {
                dispatch({ type: "when-changed", when });
              }}
              onTz={(tz) => {
                dispatch({ type: "tz-changed", tz });
              }}
              onDetect={() => {
                dispatch({ type: "tz-changed", tz: defaultTimezone() });
              }}
            />
            <AdvancedFields
              mag={state.mag}
              onMag={(mag) => {
                dispatch({ type: "mag-changed", mag });
              }}
            />

            {message !== null && (
              <p role="alert" className="atlas-form-error">
                {message}
              </p>
            )}

            <div className="landing-actions">
              <button
                type="button"
                className="atlas-btn"
                onClick={() => {
                  leave(exploreHash);
                }}
              >
                {t("landing.explore")}
              </button>
              <button
                type="button"
                className="atlas-btn-ghost"
                onClick={() => {
                  leave(studioHash);
                }}
              >
                {t("landing.poster")}
              </button>
            </div>
          </div>

          <p className="atlas-form-alt">
            {t("landing.browse")}{" "}
            <button type="button" className="atlas-link atlas-form-linkbtn" onClick={goToSample}>
              {t("landing.browse.action")}
            </button>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
