import { describe, expect, it } from "bun:test";
import { altAz } from "../astro.ts";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import { prepareObserverView } from "./observerView.ts";

describe("prepareObserverView", () => {
  it("agrees with altAz() for every star", () => {
    const { scene, view } = sceneOf([
      { hip: 1, dir: dirAt(60, 10), mag: 1 },
      { hip: 2, dir: dirAt(-30, 200), mag: 2 },
      { hip: 3, dir: dirAt(0.5, 90), mag: 3 },
    ]);
    scene.stars.forEach((star, i) => {
      const ref = altAz(star.raDeg, star.decDeg, CTX.latDeg, CTX.lonDeg, CTX.when);
      expect(Math.abs((view.altitudesDeg[i] ?? NaN) - ref.altDeg)).toBeLessThan(1e-6);
    });
  });

  it("is computed once per place and time and is reproducible", () => {
    const { scene, view } = sceneOf([{ hip: 1, dir: dirAt(10, 0), mag: 1 }]);
    expect(prepareObserverView(scene, CTX).altitudesDeg).toEqual(view.altitudesDeg);
    expect(view.altitudesDeg).toBeInstanceOf(Float64Array);
    expect(view.altitudesDeg.length).toBe(scene.stars.length);
  });

  it("exposes an orthonormal horizon frame", () => {
    const { view } = sceneOf([]);
    const [zx, zy, zz] = view.zenith;
    expect(Math.hypot(zx, zy, zz)).toBeCloseTo(1, 12);
    const dotNE = view.north[0] * view.east[0] + view.north[1] * view.east[1] + view.north[2] * view.east[2];
    expect(Math.abs(dotNE)).toBeLessThan(1e-12);
  });
});
