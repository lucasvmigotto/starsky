import { describe, expect, it } from "bun:test";
import { displayHeadingTitle } from "./heading.ts";
import type { SharePayload } from "./share.ts";

function payload(title: string | null, place: string | null): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place,
    when_utc: "2026-01-01T00:00:00Z",
    tz: "UTC",
    options: {
      projection: "stereographic",
      fisheye_strength: 1.0,
      min_separation: 0.008,
      magnitude_limit: 5.8,
      glow: true,
      glow_intensity: 1.0,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title,
    },
  };
}

const t = (
  key: string,
  args?: Readonly<Partial<Record<string, string | number>>>,
): string => {
  if (key === "viewer.heading.abovePlace") return `Night sky above ${String(args?.["place"] ?? "")}`;
  return "This night sky";
};

describe("displayHeadingTitle", () => {
  it("prefers an explicit title", () => {
    expect(displayHeadingTitle(payload("Our Night", "Giza"), t)).toBe("Our Night");
  });

  it("names the place when untitled", () => {
    expect(displayHeadingTitle(payload(null, "Giza"), t)).toBe("Night sky above Giza");
  });

  it("falls back to the default with neither", () => {
    expect(displayHeadingTitle(payload(null, null), t)).toBe("This night sky");
  });
});
