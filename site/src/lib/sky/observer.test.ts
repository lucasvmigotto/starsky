import { describe, expect, it } from "bun:test";
import { altAz, gmstDegrees, norm360 } from "../astro.ts";
import { FOV_DEFAULT_DEG, projectToViewport, worldToCamera } from "./camera.ts";
import {
  type ObservationContext,
  horizonStatus,
  initialCamera,
  northHorizonVector,
  observerAltAz,
  zenithVector,
} from "./observer.ts";
import { dot, raDecToVec, vecToRaDec } from "./vec.ts";

const DATES = [
  new Date("1987-04-10T19:21:00Z"),
  new Date("2000-01-01T12:00:00Z"),
  new Date("2026-06-21T03:30:00Z"),
  new Date("2026-12-31T23:59:59Z"),
];

function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

describe("agreement with altAz()", () => {
  it("matches across latitudes -89..89, dates and sky positions", () => {
    let worst = 0;
    for (let lat = -89; lat <= 89; lat += 7) {
      for (const when of DATES) {
        for (const lon of [-170, -77.07, 0, 12.5, 151]) {
          const ctx: ObservationContext = { latDeg: lat, lonDeg: lon, when };
          for (let ra = 0; ra < 360; ra += 41) {
            for (const dec of [-85, -40, 0, 33, 80]) {
              const ref = altAz(ra, dec, lat, lon, when);
              const got = observerAltAz(ctx, raDecToVec(ra, dec));
              worst = Math.max(worst, Math.abs(ref.altDeg - got.altDeg));
              // azimuth is ill-defined within a hair of the zenith/nadir
              if (Math.abs(ref.altDeg) < 89.5) {
                worst = Math.max(worst, angleDiff(ref.azDeg, got.azDeg));
              }
            }
          }
        }
      }
    }
    expect(worst).toBeLessThan(1e-6);
  });
});

describe("Meeus ex. 13.b", () => {
  it("reproduces Venus altitude and azimuth within 0.02 degrees", () => {
    const ctx: ObservationContext = {
      latDeg: 38 + 55 / 60 + 17 / 3600,
      lonDeg: -(77 + 3 / 60 + 56 / 3600),
      when: new Date("1987-04-10T19:21:00Z"),
    };
    const got = observerAltAz(ctx, raDecToVec(347.3193, -6.7198));
    // Meeus measures azimuth from the south (68.0337); from north that is +180.
    expect(Math.abs(got.altDeg - 15.1249)).toBeLessThan(0.02);
    expect(angleDiff(got.azDeg, 248.0337)).toBeLessThan(0.02);
  });
});

describe("zenith, horizon and north", () => {
  const ctx: ObservationContext = {
    latDeg: 40,
    lonDeg: -75,
    when: new Date("2026-03-01T02:00:00Z"),
  };

  it("puts the zenith star at altitude 90 and the nadir at -90", () => {
    const z = zenithVector(ctx);
    expect(observerAltAz(ctx, z).altDeg).toBeCloseTo(90, 9);
    expect(observerAltAz(ctx, [-z[0], -z[1], -z[2]]).altDeg).toBeCloseTo(-90, 9);
    const { raDeg, decDeg } = vecToRaDec(z);
    expect(decDeg).toBeCloseTo(40, 9);
    expect(raDeg).toBeCloseTo(norm360(gmstDegrees(ctx.when) - 75), 9);
  });

  it("classifies above and below the horizon", () => {
    const z = zenithVector(ctx);
    expect(horizonStatus(ctx, z)).toBe("above");
    expect(horizonStatus(ctx, [-z[0], -z[1], -z[2]])).toBe("below");
  });

  it("uses east-positive longitude", () => {
    const east = zenithVector({ ...ctx, lonDeg: 90 });
    const west = zenithVector({ ...ctx, lonDeg: -90 });
    const raE = vecToRaDec(east).raDeg;
    const raW = vecToRaDec(west).raDeg;
    expect(norm360(raE - raW)).toBeCloseTo(180, 9);
    expect(norm360(raE - vecToRaDec(zenithVector({ ...ctx, lonDeg: 0 })).raDeg)).toBeCloseTo(90, 9);
  });

  it("has a north vector perpendicular to the zenith that points to the pole", () => {
    const n = northHorizonVector(ctx);
    expect(Math.hypot(...n)).toBeCloseTo(1, 12);
    expect(dot(n, zenithVector(ctx))).toBeCloseTo(0, 12);
    expect(observerAltAz(ctx, n).azDeg).toBeCloseTo(0, 9);
    expect(dot(n, [0, 0, 1])).toBeGreaterThan(0);
  });

  it("defines north and a finite initial camera at both poles", () => {
    for (const lat of [90, -90]) {
      const c: ObservationContext = { ...ctx, latDeg: lat };
      const n = northHorizonVector(c);
      expect(n.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...n)).toBeCloseTo(1, 12);
      expect(dot(n, zenithVector(c))).toBeCloseTo(0, 12);
      const cam = initialCamera(c);
      expect(Math.hypot(...cam.orientation)).toBeCloseTo(1, 12);
      expect(worldToCamera(cam, zenithVector(c))[2]).toBeCloseTo(-1, 12);
    }
  });
});

describe("initialCamera", () => {
  it("looks at the zenith with local north up and the default fov", () => {
    const ctx: ObservationContext = {
      latDeg: -33.9,
      lonDeg: 151.2,
      when: new Date("2026-09-09T10:00:00Z"),
    };
    const cam = initialCamera(ctx);
    expect(cam.fovDeg).toBe(FOV_DEFAULT_DEG);
    const z = zenithVector(ctx);
    const c = worldToCamera(cam, z);
    expect(c[0]).toBeCloseTo(0, 12);
    expect(c[1]).toBeCloseTo(0, 12);
    expect(c[2]).toBeCloseTo(-1, 12);
    const n = worldToCamera(cam, northHorizonVector(ctx));
    expect(n[1]).toBeCloseTo(1, 12);
    expect(n[0]).toBeCloseTo(0, 12);
    // a point 5 degrees toward north of the zenith appears above center
    const slightlyNorth = projectToViewport(
      cam,
      [
        z[0] + 0.0872 * northHorizonVector(ctx)[0],
        z[1] + 0.0872 * northHorizonVector(ctx)[1],
        z[2] + 0.0872 * northHorizonVector(ctx)[2],
      ],
      800,
      600,
    );
    expect(slightlyNorth?.y).toBeLessThan(300);
  });
});
