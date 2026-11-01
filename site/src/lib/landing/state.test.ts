import { describe, expect, it } from "bun:test";
import {
  type LandingState,
  coordinateCheck,
  createInitialState,
  landingReducer,
  toLandingInput,
} from "./state.ts";

const NOW = new Date("2026-03-01T12:30:00Z");

function start(): LandingState {
  return createInitialState({ now: NOW, zone: "UTC" });
}

describe("initial state", () => {
  it("starts at the default place, now, the given zone, with the map and coordinates closed", () => {
    const s = start();
    expect(s.location).toMatchObject({ lat: 40.758, lon: -73.9855, source: "default" });
    expect(s.when).toBe("2026-03-01T12:30");
    expect(s.tz).toBe("UTC");
    expect(s.mag).toBe(5.8);
    expect(s.mapOpen).toBe(false);
    expect(s.mapExpanded).toBe(false);
    expect(s.coordsOpen).toBe(false);
    expect(s.error).toBeNull();
    expect(s.latText).toBe("40.7580");
    expect(s.lonText).toBe("-73.9855");
  });
});

describe("choosing a place", () => {
  it("a search result sets the place and syncs the coordinate text", () => {
    const s = landingReducer(start(), { type: "place-chosen", lat: 48.8584, lon: 2.2945, place: "Eiffel Tower, Paris" });
    expect(s.location).toEqual({ lat: 48.8584, lon: 2.2945, place: "Eiffel Tower, Paris", source: "search" });
    expect(s.latText).toBe("48.8584");
    expect(s.lonText).toBe("2.2945");
  });

  it("a dropped pin has no place name and rounds to four decimals", () => {
    const s = landingReducer(start(), { type: "pin-dropped", lat: -33.868812, lon: 151.209301 });
    expect(s.location).toEqual({ lat: -33.8688, lon: 151.2093, place: null, source: "pin" });
    expect(s.latText).toBe("-33.8688");
  });

  it("a pin wraps a longitude panned around the world", () => {
    const s = landingReducer(start(), { type: "pin-dropped", lat: 10, lon: 190 });
    expect(s.location.lon).toBeCloseTo(-170, 4);
  });

  it("a pin keeps a latitude inside the poles", () => {
    expect(landingReducer(start(), { type: "pin-dropped", lat: 95, lon: 0 }).location.lat).toBe(90);
  });
});

describe("typing coordinates", () => {
  it("a valid pair moves the location and drops the place name", () => {
    let s = landingReducer(start(), { type: "place-chosen", lat: 1, lon: 1, place: "Somewhere" });
    s = landingReducer(s, { type: "coordinates-edited", latText: "-12.5", lonText: "130.25" });
    expect(s.location).toEqual({ lat: -12.5, lon: 130.25, place: null, source: "typed" });
    expect(s.latText).toBe("-12.5");
  });

  it("an invalid pair keeps the last good location but keeps the text", () => {
    const before = start();
    const s = landingReducer(before, { type: "coordinates-edited", latText: "95", lonText: "10" });
    expect(s.location).toEqual(before.location);
    expect(s.latText).toBe("95");
    expect(coordinateCheck(s)).toMatchObject({ latInvalid: true, lonInvalid: false });
  });

  it("toggles open and closed", () => {
    const open = landingReducer(start(), { type: "coordinates-toggled" });
    expect(open.coordsOpen).toBe(true);
    expect(landingReducer(open, { type: "coordinates-toggled" }).coordsOpen).toBe(false);
  });
});

describe("the map", () => {
  it("opens and closes, and closing shrinks it too", () => {
    let s = landingReducer(start(), { type: "map-toggled" });
    expect(s.mapOpen).toBe(true);
    s = landingReducer(s, { type: "map-expand-toggled" });
    expect(s.mapExpanded).toBe(true);
    s = landingReducer(s, { type: "map-toggled" });
    expect(s).toMatchObject({ mapOpen: false, mapExpanded: false });
  });

  it("only expands while open", () => {
    expect(landingReducer(start(), { type: "map-expand-toggled" }).mapExpanded).toBe(false);
  });

  it("Escape shrinks an expanded map and does nothing else", () => {
    let s = landingReducer(start(), { type: "map-toggled" });
    s = landingReducer(s, { type: "map-expand-toggled" });
    s = landingReducer(s, { type: "map-escape" });
    expect(s).toMatchObject({ mapOpen: true, mapExpanded: false });
    expect(landingReducer(s, { type: "map-escape" })).toBe(s);
  });

  it("records a map problem without touching the form", () => {
    const s = landingReducer(start(), { type: "map-problem", problem: "tiles" });
    expect(s.mapProblem).toBe("tiles");
    expect(s.location).toEqual(start().location);
  });
});

describe("moment and advanced", () => {
  it("stores the wall clock, zone and magnitude", () => {
    let s = landingReducer(start(), { type: "when-changed", when: "2026-06-01T22:00" });
    s = landingReducer(s, { type: "tz-changed", tz: "Asia/Tokyo" });
    s = landingReducer(s, { type: "mag-changed", mag: 4.2 });
    expect(s).toMatchObject({ when: "2026-06-01T22:00", tz: "Asia/Tokyo", mag: 4.2 });
  });
});

describe("toLandingInput", () => {
  it("passes the location, moment and magnitude", () => {
    const r = toLandingInput(start());
    expect(r).toEqual({
      ok: true,
      value: { lat: 40.758, lon: -73.9855, place: "Times Square, New York, NY", when: "2026-03-01T12:30", tz: "UTC", mag: 5.8 },
    });
  });

  it("refuses while the coordinate text is invalid", () => {
    const s = landingReducer(start(), { type: "coordinates-edited", latText: "x", lonText: "10" });
    expect(toLandingInput(s)).toEqual({ ok: false, error: { kind: "coordinates" } });
  });
});

describe("errors", () => {
  it("are set explicitly and cleared by an edit", () => {
    let s = landingReducer(start(), { type: "error", error: { kind: "when" } });
    expect(s.error).toEqual({ kind: "when" });
    s = landingReducer(s, { type: "when-changed", when: "2026-06-01T22:00" });
    expect(s.error).toBeNull();
  });
});
