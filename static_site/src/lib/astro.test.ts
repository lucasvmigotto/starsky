import { describe, expect, it } from "vitest";
import {
  altAz,
  gmstDegrees,
  julianDate,
  norm360,
  projectFisheye,
  projectStereographic,
} from "./astro.ts";

describe("norm360", () => {
  it("wraps angles into [0, 360)", () => {
    expect(norm360(370)).toBeCloseTo(10, 9);
    expect(norm360(-10)).toBeCloseTo(350, 9);
    expect(norm360(360)).toBeCloseTo(0, 9);
  });
});

describe("julianDate / gmstDegrees", () => {
  it("matches the J2000 epoch", () => {
    // 2000-01-01T12:00:00Z == JD 2451545.0 by definition.
    expect(julianDate(new Date("2000-01-01T12:00:00Z"))).toBeCloseTo(
      2_451_545.0,
      6,
    );
    // GMST at J2000 is ~280.46061837 deg.
    expect(gmstDegrees(new Date("2000-01-01T12:00:00Z"))).toBeCloseTo(
      280.46061837,
      4,
    );
  });
});

describe("altAz", () => {
  it("puts the celestial pole at altitude == latitude (time-independent)", () => {
    for (const when of [
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-07-01T12:00:00Z"),
    ]) {
      const { altDeg } = altAz(0, 90, 40.758, -73.9855, when);
      expect(altDeg).toBeCloseTo(40.758, 6);
    }
  });

  it("keeps ranges sane and culminates south of zenith when dec < lat", () => {
    const when = new Date("2026-01-01T00:00:00Z");
    const { altDeg, azDeg } = altAz(100, 20, 40.758, -73.9855, when);
    expect(altDeg).toBeGreaterThanOrEqual(-90);
    expect(altDeg).toBeLessThanOrEqual(90);
    expect(azDeg).toBeGreaterThanOrEqual(0);
    expect(azDeg).toBeLessThan(360);
  });
});

describe("projectStereographic", () => {
  it("maps zenith to center and horizon to unit radius", () => {
    expect(projectStereographic(90, 0).r).toBeCloseTo(0, 9);
    expect(projectStereographic(0, 0).r).toBeCloseTo(1, 9);
  });

  it("is north-up (az=0 projects upward, az=90 eastward)", () => {
    const north = projectStereographic(45, 0);
    const east = projectStereographic(45, 90);
    expect(north.x).toBeCloseTo(0, 9);
    expect(north.y).toBeLessThan(0);
    expect(east.y).toBeCloseTo(0, 9);
    expect(east.x).toBeGreaterThan(0);
  });
});

describe("projectFisheye", () => {
  it("maps zenith to 0 and horizon to 1 regardless of strength", () => {
    for (const strength of [0.5, 1, 2]) {
      expect(projectFisheye(90, 0, strength).r).toBeCloseTo(0, 9);
      expect(projectFisheye(0, 0, strength).r).toBeCloseTo(1, 9);
    }
  });

  it("strength 1 is linear in zenith distance", () => {
    expect(projectFisheye(45, 0, 1).r).toBeCloseTo(0.5, 9);
  });
});
