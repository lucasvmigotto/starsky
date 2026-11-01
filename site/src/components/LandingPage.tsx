/**
 * The first page (013-location-first): one question, "where do you want to
 * explore the sky from?", answered by search, the map or coordinates. The form
 * state is one reducer in `lib/landing`; this component only wires it to the
 * controls. Poster choices live in the Studio. The form is kept in `#c=` (replaceState,
 * debounced), so the address bar is the link to share; it is read once, on arrival.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { JSX } from "react";
import { t } from "../i18n/index.ts";
import { creationFragmentFromHash, decodeCreation, encodeCreation } from "../lib/landing/creation.ts";
import { defaultTimezone, exploreHash, undrawableTitleCharacter } from "../lib/landing/payload.ts";
import {
  type FormError,
  createInitialState,
  creationOf,
  landingReducer,
  toLandingInput,
} from "../lib/landing/state.ts";
import { unsupportedCharacterMessage } from "../lib/render/glyphs.ts";
import { fragmentFromHash } from "../lib/share.ts";
import { randomSampleFragment } from "../lib/site.ts";
import SiteFooter from "./SiteFooter.tsx";
import SiteHeader from "./SiteHeader.tsx";
import AdvancedFields from "./landing/AdvancedFields.tsx";
import CoordinateFields from "./landing/CoordinateFields.tsx";
import CoordinateSwitch from "./landing/CoordinateSwitch.tsx";
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
    case "title":
      // Shown beside the Title field, which names the character.
      return null;
    case "coordinates":
      // The fields beside it say which one; the page does not repeat them.
      return null;
  }
}

function goToSample() {
  window.location.hash = `#s=${randomSampleFragment(fragmentFromHash(window.location.hash))}`;
}

/** How long the form rests before `#c=` follows it. */
export const CREATION_SYNC_MS = 300;

export default function LandingPage(): JSX.Element {
  const [arrival] = useState(() => {
    const fragment = creationFragmentFromHash(window.location.hash);
    return fragment === null ? null : decodeCreation(fragment);
  });
  const [state, dispatch] = useReducer(landingReducer, undefined, () =>
    createInitialState({
      now: new Date(),
      zone: defaultTimezone(),
      ...(arrival?.status === "ok" ? { creation: arrival.creation } : {}),
    }),
  );
  const { location } = state;
  const titleCharacter = undrawableTitleCharacter(state.title);
  const message = state.error === null ? null : errorText(state.error);

  const fragment = useMemo(() => encodeCreation(creationOf(state)), [state]);
  const baseline = useRef<string | null>(null);
  useEffect(() => {
    // What the page opened with is already in the address (or is the plain landing).
    baseline.current ??= fragment;
    if (fragment === baseline.current) return;
    const timer = window.setTimeout(() => {
      window.history.replaceState(window.history.state, "", `#c=${fragment}`);
    }, CREATION_SYNC_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [fragment]);

  const explore = (): void => {
    const input = toLandingInput(state);
    if (!input.ok) {
      dispatch({ type: "error", error: input.error });
      return;
    }
    const hash = exploreHash(input.value);
    if (!hash.ok) {
      dispatch({ type: "error", error: hash.error });
      return;
    }
    window.location.hash = hash.value;
  };

  return (
    <div className="atlas-page landing-page">
      <SiteHeader />
      <main className="atlas-main landing-main">
        <div className="atlas-form-wrap">
          <div className="atlas-moment">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">{t("landing.title")}</h1>
          </div>

          <div className="atlas-panel atlas-form landing-card">
            {arrival?.status === "invalid" && (
              <p role="status" className="atlas-form-hint landing-card-notice">
                {t("landing.creation.invalid")}
              </p>
            )}
            <div className="landing-place">
              <div className="landing-place-row">
                <div className="landing-place-field">
                  {state.coordsOpen ? (
                    <CoordinateFields
                      latText={state.latText}
                      lonText={state.lonText}
                      onEdit={(latText, lonText) => {
                        dispatch({ type: "coordinates-edited", latText, lonText });
                      }}
                    />
                  ) : (
                    <PlaceSearch
                      fieldText={location.source === "search" ? (location.place ?? "") : ""}
                      onChoose={(place) => {
                        dispatch({ type: "place-chosen", lat: place.lat, lon: place.lon, place: place.short });
                      }}
                    />
                  )}
                </div>
                <CoordinateSwitch
                  on={state.coordsOpen}
                  onToggle={() => {
                    dispatch({ type: "coordinates-toggled" });
                  }}
                />
              </div>
              <LocationMapPanel
                problem={state.mapProblem}
                lat={location.lat}
                lon={location.lon}
                focus={location.source === "pin" ? "keep" : "place"}
                onPick={(lat, lon) => {
                  dispatch({ type: "pin-dropped", lat, lon });
                }}
                onProblem={(problem) => {
                  dispatch({ type: "map-problem", problem });
                }}
              />
            </div>
            <div className="landing-side">
              <LocationSummary location={location} />
              <MomentFields
                title={state.title}
                titleError={titleCharacter === null ? null : unsupportedCharacterMessage(titleCharacter)}
                onTitle={(title) => {
                  dispatch({ type: "title-changed", title });
                }}
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
              {message !== null && (
              <p role="alert" className="atlas-form-error">
                {message}
              </p>
            )}

            <div className="landing-foot">
              <AdvancedFields
                mag={state.mag}
                onMag={(mag) => {
                  dispatch({ type: "mag-changed", mag });
                }}
              />
              <div className="landing-actions">
                <button
                  type="button"
                  className="atlas-btn"
                  onClick={() => {
                    explore();
                  }}
                >
                  {t("landing.explore")}
                </button>
              </div>
            </div>
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
