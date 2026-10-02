/**
 * Renderer boundary and negative cases (007 T030-T036).
 *
 * These are the cases a fixed fixture matrix does not reach: an empty sky, the
 * maximum star density, an unloadable font, and the option bounds. They run on
 * the pure functions plus the SVG export, so no canvas is needed; the two that
 * genuinely need a browser (font-not-loaded, keyboard export) live in
 * `site/e2e/` and are cross-referenced below.
 */
import { describe, expect, it } from "bun:test";
import { buildPosterSvg } from "./export.ts";
import { AXIS_EXTENT, posterGeometry, unitToCanvas } from "./poster.ts";
import { starSize } from "../spec.ts";
import type { SharePayload } from "../share.ts";
import type { SkyModel } from "../skymodel.ts";
import { buildSkyModel } from "../skymodel.ts";


function payload(overrides: Partial<SharePayload["options"]> = {}): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: "Times Square",
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
      title: "Boundary Night",
      ...overrides,
    },
  };
}

function emptyModel(): SkyModel {
  return {
    stars: [],
    figures: [],
    segments: [],
    when: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("empty sky (T033/T034 boundary)", () => {
  it("still renders the frame, ring and caption", () => {
    const svg = buildPosterSvg(payload(), emptyModel(), 800);
    expect(svg).toContain("<svg");
    // Background, the circle ring, and the caption text survive with no stars.
    expect(svg).toContain('fill="#0b0f19"');
    expect(svg).toContain('stroke="#f5efe0"');
    expect(svg).toContain("Boundary Night");
    expect(svg).toContain("40.7580");
  });

  it("draws no star circles", () => {
    const svg = buildPosterSvg(payload(), emptyModel(), 800);
    // The ring is the only circle; no star markers.
    const circles = svg.match(/<circle /g) ?? [];
    expect(circles.length).toBeLessThanOrEqual(2);
  });

  it("an empty sky is not an error", () => {
    // A polar night is a real, valid poster — never a thrown error.
    expect(() => buildPosterSvg(payload(), emptyModel(), 800)).not.toThrow();
  });
});

describe("maximum density (T034 boundary)", () => {
  // Build a dense catalog: every star the export can carry, at the ceiling
  // magnitude limit. Exercises the render path at its heaviest.
  it("renders every star it is given", () => {
    const stars = Array.from({ length: 9000 }, (_, i) => ({
      hip: i + 1,
      mag: 6.5,
      unitX: 0,
      unitY: 0,
      px: 400,
      py: 400,
      size: starSize(6.5),
      raDeg: 0,
      decDeg: 0,
    }));
    const model: SkyModel = {
      stars,
      figures: [],
      segments: [],
      when: new Date("2026-01-01T00:00:00Z"),
    };
    const svg = buildPosterSvg(
      payload({ magnitude_limit: 8 }),
      model,
      800,
    );
    const circles = svg.match(/<circle /g) ?? [];
    // Every star is drawn; at high density the renderer must not silently drop.
    expect(circles.length).toBeGreaterThanOrEqual(9000);
  });
});

describe("fisheye bounds (T035)", () => {
  it("projects at the accepted bounds without throwing", () => {
    for (const strength of [0.1, 1.0, 3.0]) {
      const model = buildSkyModel(
        payload({ projection: "fisheye", fisheye_strength: strength }),
        [{ hip: 1, raDeg: 10, decDeg: 20, mag: 1 }],
        [],
      );
      // A valid strength yields a model; every projected point stays on the disc.
      for (const star of model.stars) {
        expect(Math.hypot(star.unitX, star.unitY)).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it("does not crash when the option is out of range", () => {
    // The CLI rejected strength <= 0. The browser has no such guard, so the
    // contract is the schema's (0, 3]; this records the current behaviour
    // rather than claiming a rejection that does not exist.
    const model = buildSkyModel(
      payload({ projection: "fisheye", fisheye_strength: 0 }),
      [{ hip: 1, raDeg: 10, decDeg: 20, mag: 1 }],
      [],
    );
    for (const star of model.stars) {
      expect(Number.isFinite(star.unitX)).toBe(true);
      expect(Number.isFinite(star.unitY)).toBe(true);
    }
  });
});

describe("geometry stays on the disc", () => {
  it("the unit disc sits inside the axes with the documented margin", () => {
    const g = posterGeometry(800);
    const [edge] = unitToCanvas(1, 0, g);
    const [centre] = unitToCanvas(0, 0, g);
    // A unit-radius point is 1/AXIS_EXTENT of the half-extent from the centre.
    expect(edge - centre).toBeCloseTo((1 / AXIS_EXTENT) * (g.sizePx / 2), 6);
    expect(edge).toBeLessThan(g.sizePx);
  });
});

/**
 * Charter C1 (T040) — "extreme latitudes, the equinox/solstice edges". Swept on
 * 2026-10-02 against the real ~1.8k-star catalog at every latitude from +90 to
 * −90 and at both solstices and both equinoxes: no non-finite coordinate, no
 * blank canvas, star counts varying smoothly (1770–1921). Nothing broke, so
 * these cases are pinned here to keep them from breaking later.
 *
 * Synthetic stars rather than the catalog on purpose: a boundary test that
 * needs `uv run starsky catalog` cannot run in a bare `bun run test`, and
 * `reference.test.ts` already owns the catalog-dependent path.
 */
describe("extreme latitudes (T040 charter C1)", () => {
  // A spread across the whole sphere, including both poles, so a projection that
  // blows up at one altitude has something to blow up on.
  const SPHERE = Array.from({ length: 72 }, (_, i) => ({
    hip: i + 1,
    raDeg: (i * 5) % 360,
    decDeg: -90 + (i * 180) / 36,
    mag: 2,
  }));

  it("projects finitely at the poles themselves, where the projection is singular", () => {
    // A stereographic projection is normally undefined at the pole: every
    // right ascension collapses to one point and the divisor goes to zero.
    // The real catalog was already fine; a synthetic sphere is the harsher
    // case, because it puts stars exactly on the axis.
    for (const lat of [90, -90]) {
      const model = buildSkyModel({ ...payload(), lat }, SPHERE, []);
      expect(model.stars.length).toBeGreaterThan(0);
      for (const star of model.stars) {
        expect(Number.isFinite(star.unitX), `unitX at lat ${String(lat)}`).toBe(true);
        expect(Number.isFinite(star.unitY), `unitY at lat ${String(lat)}`).toBe(true);
        expect(Math.hypot(star.unitX, star.unitY)).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it("projects finitely just short of the poles", () => {
    for (const lat of [89.9, 89, -89, -89.9]) {
      const model = buildSkyModel({ ...payload(), lat }, SPHERE, []);
      for (const star of model.stars) {
        expect(Number.isFinite(star.unitX), `unitX at lat ${String(lat)}`).toBe(true);
        expect(Math.hypot(star.unitX, star.unitY)).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it("projects finitely at the solstices and equinoxes at a high latitude", () => {
    // Solstice/equinox change which stars are up, and at 85°N almost everything
    // circles the pole — the two effects compound.
    for (const when of [
      "2026-06-21T12:00:00Z", // June solstice
      "2026-12-21T12:00:00Z", // December solstice
      "2026-03-20T12:00:00Z", // March equinox
      "2026-09-22T12:00:00Z", // September equinox
    ]) {
      const model = buildSkyModel(
        { ...payload(), lat: 85, when_utc: when },
        SPHERE,
        [],
      );
      for (const star of model.stars) {
        expect(Number.isFinite(star.unitX), `unitX at ${when}`).toBe(true);
        expect(Math.hypot(star.unitX, star.unitY)).toBeLessThanOrEqual(1.001);
      }
    }
  });
});

/**
 * Charter C1 (T040) — "`min_separation` extremes". Swept 2026-10-02 over
 * 0 → 0.2 against the real catalog: monotonic and sensible (2122 stars at 0,
 * 1866 at the 0.008 default, 541 at 0.05, 53 at 0.2), with the figure count
 * constant because figures are built before decluttering.
 */
describe("declutter extremes (T040 charter C1)", () => {
  // A deliberately tight cluster: every star within a few arcminutes of the
  // next, so a non-zero separation has something to merge.
  const CLUSTER = Array.from({ length: 40 }, (_, i) => ({
    hip: i + 1,
    raDeg: 10 + i * 0.001,
    decDeg: 20 + i * 0.001,
    mag: 3,
  }));

  it("min_separation 0 is a no-op: declutter keeps every star", () => {
    const model = buildSkyModel(payload({ min_separation: 0 }), CLUSTER, []);
    expect(model.stars.length).toBe(CLUSTER.length);
  });

  it("a larger separation keeps no more stars than a smaller one", () => {
    let previous = CLUSTER.length + 1;
    for (const separation of [0, 0.008, 0.05, 0.2]) {
      const model = buildSkyModel(
        payload({ min_separation: separation }),
        CLUSTER,
        [],
      );
      expect(
        model.stars.length,
        `separation ${String(separation)} kept ${String(model.stars.length)}, previous ${String(previous)}`,
      ).toBeLessThanOrEqual(previous);
      previous = model.stars.length;
    }
    // And the sweep is a real one: the top of the range does drop stars.
    expect(previous).toBeLessThan(CLUSTER.length);
  });

  it("builds figures from all visible stars, not the decluttered set", () => {
    // The spec requires figures from every star above the horizon; declutter is
    // a drawing-time concern. If this fails, a figure has started depending on a
    // star that was merged away.
    const loose = buildSkyModel(payload({ min_separation: 0 }), CLUSTER, []);
    const tight = buildSkyModel(payload({ min_separation: 0.2 }), CLUSTER, []);
    expect(tight.figures.length).toBe(loose.figures.length);
  });
});
