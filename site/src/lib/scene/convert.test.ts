import { describe, expect, it } from "bun:test";
import { initialCamera } from "../sky/observer.ts";
import { DEFAULT_LAYERS } from "../explorer/layers.ts";
import { layersToPayload } from "../explorer/link.ts";
import { type ExplorerPayload, decodeExplorer, encodeExplorer } from "../sky/payload.ts";
import { encodePayload } from "../encode.ts";
import { type SharePayload, decodeShareFragment, validateOptions } from "../share.ts";
import { DEFAULTS } from "./defaults.ts";
import { explorerToPoster, posterToExplorer } from "./convert.ts";

const EXPLORER: ExplorerPayload = {
  v: 1,
  lat: -33.8688,
  lon: 151.2093,
  place: "Sydney",
  tz: "Australia/Sydney",
  when_utc: "2025-12-25T11:00:00Z",
  title: "Summer solstice",
  mag: 4.5,
  q: [0.1, 0.2, 0.3, 0.9],
  fov: 42,
  layers: { ...layersToPayload(DEFAULT_LAYERS), equatorialGrid: true },
  sel: "HIP:32349",
};

const POSTER: SharePayload = {
  v: 1,
  lat: 64.1466,
  lon: -21.9426,
  place: "Reykjavik",
  when_utc: "2026-02-03T04:05:06Z",
  tz: "Atlantic/Reykjavik",
  options: {
    projection: "fisheye",
    fisheye_strength: 1.6,
    min_separation: 0.02,
    magnitude_limit: 3.2,
    glow: false,
    glow_intensity: 2,
    constellations: false,
    constellation_labels: false,
    shape: "square",
    title: "Aurora season",
  },
};

describe("explorerToPoster", () => {
  it("carries the scene and takes poster defaults for composition", () => {
    const poster = explorerToPoster(EXPLORER);
    expect(poster.lat).toBe(EXPLORER.lat);
    expect(poster.lon).toBe(EXPLORER.lon);
    expect(poster.place).toBe("Sydney");
    expect(poster.tz).toBe("Australia/Sydney");
    expect(poster.when_utc).toBe("2025-12-25T11:00:00Z");
    expect(poster.options.title).toBe("Summer solstice");
    expect(poster.options.magnitude_limit).toBe(4.5);
    expect(poster.options.projection).toBe(DEFAULTS.projection);
    expect(poster.options.fisheye_strength).toBe(DEFAULTS.fisheyeStrength);
    expect(poster.options.min_separation).toBe(DEFAULTS.minSeparation);
    expect(poster.options.glow).toBe(DEFAULTS.glow);
    expect(poster.options.glow_intensity).toBe(DEFAULTS.glowIntensity);
    expect(poster.options.constellations).toBe(DEFAULTS.constellations);
    expect(poster.options.constellation_labels).toBe(DEFAULTS.constellationLabels);
    expect(poster.options.shape).toBe(DEFAULTS.shape);
  });

  it("respects nullable place and title", () => {
    const poster = explorerToPoster({ ...EXPLORER, place: null, title: null });
    expect(poster.place).toBeNull();
    expect(poster.options.title).toBeNull();
    expect(explorerToPoster({ ...EXPLORER, title: "" }).options.title).toBeNull();
  });

  it("clamps the explorer's wider magnitude to what a share link accepts", () => {
    expect(explorerToPoster({ ...EXPLORER, mag: 12 }).options.magnitude_limit).toBe(7);
    expect(explorerToPoster({ ...EXPLORER, mag: -2 }).options.magnitude_limit).toBe(1);
    expect(explorerToPoster({ ...EXPLORER, mag: 0.99 }).options.magnitude_limit).toBe(1);
    for (const mag of [-2, 0.5, 1, 5.8, 7, 7.01, 12]) {
      const poster = explorerToPoster({ ...EXPLORER, mag });
      expect(() => {
        validateOptions(poster);
      }).not.toThrow();
      expect(() => decodeShareFragment(encodePayload(poster))).not.toThrow();
    }
  });

  it("clamp bounds are the share validation's: it accepts 1 and 7 and rejects beyond", () => {
    const at = (m: number): SharePayload => ({ ...POSTER, options: { ...POSTER.options, magnitude_limit: m } });
    expect(() => {
      validateOptions(at(1));
    }).not.toThrow();
    expect(() => {
      validateOptions(at(7));
    }).not.toThrow();
    expect(() => {
      validateOptions(at(0.99));
    }).toThrow();
    expect(() => {
      validateOptions(at(7.01));
    }).toThrow();
  });
});

describe("posterToExplorer", () => {
  it("opens at the initial camera with default layers, nothing selected", () => {
    const explorer = posterToExplorer(POSTER);
    const camera = initialCamera({
      latDeg: POSTER.lat,
      lonDeg: POSTER.lon,
      when: new Date(POSTER.when_utc),
    });
    expect(explorer.q).toEqual(camera.orientation);
    expect(explorer.fov).toBe(camera.fovDeg);
    expect(explorer.layers).toEqual(layersToPayload(DEFAULT_LAYERS));
    expect(explorer.sel).toBeNull();
    expect(explorer.mag).toBe(3.2);
    expect(explorer.title).toBe("Aurora season");
    expect(explorer.place).toBe("Reykjavik");
  });

  it("uses a given camera instead", () => {
    const camera = { orientation: [0, 0, 0, 1] as [number, number, number, number], fovDeg: 30 };
    const explorer = posterToExplorer(POSTER, camera);
    expect(explorer.q).toEqual([0, 0, 0, 1]);
    expect(explorer.fov).toBe(30);
  });

  it("produces a payload the explorer codec accepts", () => {
    expect(() => decodeExplorer(encodeExplorer(posterToExplorer(POSTER)))).not.toThrow();
  });

  it("respects null place and title", () => {
    const explorer = posterToExplorer({ ...POSTER, place: null, options: { ...POSTER.options, title: null } });
    expect(explorer.place).toBeNull();
    expect(explorer.title).toBeNull();
  });

  it("normalises a moment written with milliseconds to the explorer's form", () => {
    const explorer = posterToExplorer({ ...POSTER, when_utc: "2026-02-03T04:05:06.000Z" });
    expect(explorer.when_utc).toBe("2026-02-03T04:05:06Z");
    expect(() => decodeExplorer(encodeExplorer(explorer))).not.toThrow();
  });

  it("shortens text the explorer link would reject (200 characters)", () => {
    const long = "x".repeat(300);
    const explorer = posterToExplorer({ ...POSTER, place: long, options: { ...POSTER.options, title: long } });
    expect(explorer.title?.length).toBe(200);
    expect(explorer.place?.length).toBe(200);
    expect(() => encodeExplorer(explorer)).not.toThrow();
  });

  it("rejects a moment that is not a date", () => {
    expect(() => posterToExplorer({ ...POSTER, when_utc: "soon" })).toThrow();
  });
});

describe("round trip of scene fields", () => {
  const scene = (p: { lat: number; lon: number; place: string | null; tz: string; when_utc: string }) => ({
    lat: p.lat,
    lon: p.lon,
    place: p.place,
    tz: p.tz,
    when_utc: p.when_utc,
  });

  it("poster -> explorer -> poster keeps place, moment, title and magnitude", () => {
    const back = explorerToPoster(posterToExplorer(POSTER));
    expect(scene(back)).toEqual(scene(POSTER));
    expect(back.options.title).toBe(POSTER.options.title);
    expect(back.options.magnitude_limit).toBe(POSTER.options.magnitude_limit);
  });

  it("explorer -> poster -> explorer keeps the scene", () => {
    const back = posterToExplorer(explorerToPoster(EXPLORER));
    expect(scene(back)).toEqual(scene(EXPLORER));
    expect(back.title).toBe(EXPLORER.title);
    expect(back.mag).toBe(EXPLORER.mag);
  });
});
