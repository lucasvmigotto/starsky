/**
 * The landing's form state as one typed reducer (013, FR-003). Search text and
 * results are not here: they belong to the search controller, which owns the
 * timers and the requests in flight.
 */
import { DEFAULTS } from "../scene/defaults.ts";
import {
  type CoordinateCheck,
  type LandingError,
  type LandingInput,
  formatLocalNow,
  normalizeLongitude,
  validateCoordinates,
} from "./payload.ts";

export type PlaceSource = "default" | "search" | "pin" | "typed";

export interface LandingLocation {
  lat: number;
  lon: number;
  place: string | null;
  source: PlaceSource;
}

export type FormError = LandingError | { kind: "coordinates" };

export interface LandingState {
  location: LandingLocation;
  latText: string;
  lonText: string;
  /** The Coordinates switch: latitude and longitude replace the search field. */
  coordsOpen: boolean;
  when: string;
  tz: string;
  mag: number;
  title: string;
  /** Why the map is not usable; the form works either way. */
  mapProblem: "chunk" | "tiles" | null;
  error: FormError | null;
}

export type LandingAction =
  | { type: "place-chosen"; lat: number; lon: number; place: string }
  | { type: "pin-dropped"; lat: number; lon: number }
  | { type: "coordinates-edited"; latText: string; lonText: string }
  | { type: "coordinates-toggled" }
  | { type: "when-changed"; when: string }
  | { type: "tz-changed"; tz: string }
  | { type: "mag-changed"; mag: number }
  | { type: "title-changed"; title: string }
  | { type: "map-problem"; problem: "chunk" | "tiles" | null }
  | { type: "error"; error: FormError | null };

const DECIMALS = 4;

function coordText(value: number): string {
  return value.toFixed(DECIMALS);
}

function round(value: number): number {
  return Number(value.toFixed(DECIMALS));
}

export function createInitialState({ now, zone }: { now: Date; zone: string }): LandingState {
  const lat = Number(DEFAULTS.lat);
  const lon = Number(DEFAULTS.lon);
  return {
    location: { lat, lon, place: DEFAULTS.place, source: "default" },
    latText: coordText(lat),
    lonText: coordText(lon),
    coordsOpen: false,
    when: formatLocalNow(now, zone),
    tz: zone,
    mag: DEFAULTS.magnitudeLimit,
    title: DEFAULTS.title,
    mapProblem: null,
    error: null,
  };
}

function withLocation(state: LandingState, location: LandingLocation): LandingState {
  return {
    ...state,
    location,
    latText: coordText(location.lat),
    lonText: coordText(location.lon),
    error: null,
  };
}

export function landingReducer(state: LandingState, action: LandingAction): LandingState {
  switch (action.type) {
    case "place-chosen":
      return withLocation(state, {
        lat: action.lat,
        lon: action.lon,
        place: action.place,
        source: "search",
      });
    case "pin-dropped":
      return withLocation(state, {
        lat: round(Math.max(-90, Math.min(90, action.lat))),
        lon: round(normalizeLongitude(action.lon)),
        place: null,
        source: "pin",
      });
    case "coordinates-edited": {
      const check = validateCoordinates(action.latText, action.lonText);
      const typed = { ...state, latText: action.latText, lonText: action.lonText, error: null };
      if (check.lat === null || check.lon === null) return typed;
      return {
        ...typed,
        location: { lat: check.lat, lon: check.lon, place: null, source: "typed" },
      };
    }
    case "coordinates-toggled":
      // Either way the fields start from the place, so no half-typed text outlives the switch.
      return {
        ...state,
        coordsOpen: !state.coordsOpen,
        latText: coordText(state.location.lat),
        lonText: coordText(state.location.lon),
        error: null,
      };
    case "when-changed":
      return { ...state, when: action.when, error: null };
    case "tz-changed":
      return { ...state, tz: action.tz, error: null };
    case "title-changed":
      return { ...state, title: action.title, error: null };
    case "mag-changed":
      return { ...state, mag: action.mag };
    case "map-problem":
      return state.mapProblem === action.problem ? state : { ...state, mapProblem: action.problem };
    case "error":
      return { ...state, error: action.error };
  }
}

export function coordinateCheck(state: LandingState): CoordinateCheck {
  return validateCoordinates(state.latText, state.lonText);
}

/** The builder's input, or the coordinate error that stops it. */
export function toLandingInput(
  state: LandingState,
): { ok: true; value: LandingInput } | { ok: false; error: FormError } {
  const check = coordinateCheck(state);
  if (check.latInvalid || check.lonInvalid) return { ok: false, error: { kind: "coordinates" } };
  return {
    ok: true,
    value: {
      lat: state.location.lat,
      lon: state.location.lon,
      place: state.location.place,
      when: state.when,
      tz: state.tz,
      mag: state.mag,
      title: state.title,
    },
  };
}
