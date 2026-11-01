import { describe, expect, it } from "bun:test";
import {
  angularDistanceDeg,
  cross,
  dot,
  raDecToVec,
  slerp,
  vecToRaDec,
} from "./vec.ts";

describe("raDecToVec", () => {
  it("places the axes per ADR-0006", () => {
    const x = raDecToVec(0, 0);
    const y = raDecToVec(90, 0);
    const z = raDecToVec(123, 90);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(0, 12);
    expect(y[1]).toBeCloseTo(1, 12);
    expect(y[0]).toBeCloseTo(0, 12);
    expect(z[2]).toBeCloseTo(1, 12);
  });

  it("round-trips RA/Dec", () => {
    for (const [ra, dec] of [
      [0, 0],
      [10.5, -45],
      [359.9, 80],
      [180, -89],
    ] as const) {
      const back = vecToRaDec(raDecToVec(ra, dec));
      expect(back.raDeg).toBeCloseTo(ra, 9);
      expect(back.decDeg).toBeCloseTo(dec, 9);
    }
  });

  it("returns RA in [0, 360)", () => {
    expect(vecToRaDec(raDecToVec(-10, 0)).raDeg).toBeCloseTo(350, 9);
    expect(vecToRaDec([1, -0, 0]).raDeg).toBeGreaterThanOrEqual(0);
  });
});

describe("dot / cross / angularDistanceDeg", () => {
  it("computes basic products", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it("is accurate for tiny and antipodal separations", () => {
    expect(angularDistanceDeg(raDecToVec(0, 0), raDecToVec(0, 1e-6))).toBeCloseTo(1e-6, 12);
    expect(angularDistanceDeg(raDecToVec(0, 0), raDecToVec(180, 0))).toBeCloseTo(180, 9);
    expect(angularDistanceDeg(raDecToVec(350, 0), raDecToVec(10, 0))).toBeCloseTo(20, 9);
  });
});

describe("slerp", () => {
  it("interpolates along the great circle", () => {
    const a = raDecToVec(0, 0);
    const b = raDecToVec(90, 0);
    const mid = slerp(a, b, 0.5);
    expect(vecToRaDec(mid).raDeg).toBeCloseTo(45, 9);
    expect(Math.hypot(...mid)).toBeCloseTo(1, 12);
    expect(slerp(a, b, 0)).toEqual(a);
  });

  it("handles identical endpoints", () => {
    const a = raDecToVec(30, 20);
    const r = slerp(a, a, 0.3);
    expect(angularDistanceDeg(r, a)).toBeCloseTo(0, 9);
  });
});
