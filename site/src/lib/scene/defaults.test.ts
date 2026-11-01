import { describe, expect, it } from "bun:test";
import { DEFAULTS, FALLBACK_LOCATION, resolveDefaultLocation } from "./defaults.ts";

const SET = { VITE_DEFAULT_PLACE: "Lisbon, Portugal", VITE_DEFAULT_LAT: "38.7223", VITE_DEFAULT_LON: "-9.1393" };

describe("default location (build-time)", () => {
  it("falls back to São Bernardo do Campo when the build sets nothing", () => {
    expect(resolveDefaultLocation({})).toEqual(FALLBACK_LOCATION);
    expect(FALLBACK_LOCATION.place).toBe("São Bernardo do Campo, SP, Brazil");
    expect(DEFAULTS.place).toBe(FALLBACK_LOCATION.place);
  });

  it("takes the three variables when all are set and valid", () => {
    expect(resolveDefaultLocation(SET)).toEqual({ place: "Lisbon, Portugal", lat: "38.7223", lon: "-9.1393" });
  });

  it("ignores a half-set trio", () => {
    expect(resolveDefaultLocation({ VITE_DEFAULT_PLACE: "Lisbon" })).toEqual(FALLBACK_LOCATION);
    expect(resolveDefaultLocation({ ...SET, VITE_DEFAULT_LON: undefined })).toEqual(FALLBACK_LOCATION);
  });

  it("ignores blank, non-numeric and out-of-range values", () => {
    for (const bad of [
      { VITE_DEFAULT_PLACE: "  " },
      { VITE_DEFAULT_LAT: "north" },
      { VITE_DEFAULT_LAT: "91" },
      { VITE_DEFAULT_LON: "-181" },
      { VITE_DEFAULT_LAT: "" },
    ]) {
      expect(resolveDefaultLocation({ ...SET, ...bad })).toEqual(FALLBACK_LOCATION);
    }
  });
});
