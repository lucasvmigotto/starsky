import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { julianDate } from "../astro.ts";
import { angularDistanceDeg, raDecToVec, vecToRaDec } from "./vec.ts";
import { present } from "../testing.ts";

/**
 * Precision of the app's uncorrected positions (ADR-0006 "Precision").
 *
 * The catalog is Hipparcos at epoch J1991.25 (ICRS, axes within milliarcseconds
 * of J2000). The app uses those RA/Dec as if they were mean coordinates of the
 * date: no proper motion, no precession. The helpers below build an independent
 * "truth" for a date and measure the angular separation from the app's position.
 * See specs/009-sky-domain/finding-precision.md.
 */

const DEG = Math.PI / 180;
const ARCSEC = 1 / 3600;
const HIPPARCOS_EPOCH = 1991.25;

/** Meeus ch. 21 (IAU 1976), rigorous, from J2000.0 (T = 0) to Julian date `jd`. */
function precessFromJ2000(raDeg: number, decDeg: number, jd: number): { raDeg: number; decDeg: number } {
  const t = (jd - 2_451_545.0) / 36_525;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * ARCSEC * DEG;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * ARCSEC * DEG;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * ARCSEC * DEG;
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const a = Math.cos(dec) * Math.sin(ra + zeta);
  const b = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
  const c = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);
  let outRa = (Math.atan2(a, b) + z) / DEG;
  outRa = ((outRa % 360) + 360) % 360;
  return { raDeg: outRa, decDeg: Math.asin(Math.max(-1, Math.min(1, c))) / DEG };
}

/** Linear proper motion in the tangent plane (pmRaStar = mu_alpha cos delta, mas/yr). */
function applyProperMotion(
  raDeg: number,
  decDeg: number,
  pmRaStarMas: number,
  pmDecMas: number,
  years: number,
): { raDeg: number; decDeg: number } {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const mas = (ARCSEC / 1000) * DEG * years; // radians per (mas/yr) over the interval
  const p = raDecToVec(raDeg, decDeg);
  const eRa = [-Math.sin(ra), Math.cos(ra), 0];
  const eDec = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const moved: [number, number, number] = [
    p[0] + mas * (pmRaStarMas * (eRa[0] ?? 0) + pmDecMas * (eDec[0] ?? 0)),
    p[1] + mas * (pmRaStarMas * (eRa[1] ?? 0) + pmDecMas * (eDec[1] ?? 0)),
    p[2] + mas * (pmRaStarMas * (eRa[2] ?? 0) + pmDecMas * (eDec[2] ?? 0)),
  ];
  return vecToRaDec(moved);
}

function yearOf(jd: number): number {
  return 2000 + (jd - 2_451_545.0) / 365.25;
}

describe("helper sanity (Meeus ex. 21.b, Theta Persei)", () => {
  it("reproduces RA 41.547214, Dec 49.348483 within 0.001 degrees", () => {
    const ra0 = 15 * (2 + 44 / 60 + 11.986 / 3600);
    const dec0 = 49 + 13 / 60 + 42.48 / 3600;
    const jd = 2_462_088.69;
    const years = (jd - 2_451_545.0) / 365.25;
    // Meeus gives mu_alpha = +0.03425 s/yr (a rate in RA itself); convert to mu_alpha*.
    const pmRaStarMas = 0.03425 * 15 * Math.cos(dec0 * DEG) * 1000;
    const moved = applyProperMotion(ra0, dec0, pmRaStarMas, -89.5, years);
    const out = precessFromJ2000(moved.raDeg, moved.decDeg, jd);
    expect(Math.abs(out.raDeg - 41.547214)).toBeLessThan(0.001);
    expect(Math.abs(out.decDeg - 49.348483)).toBeLessThan(0.001);
  });

  it("leaves a position alone at J2000", () => {
    const out = precessFromJ2000(101.3, -16.7, 2_451_545.0);
    expect(angularDistanceDeg(raDecToVec(out.raDeg, out.decDeg), raDecToVec(101.3, -16.7))).toBeLessThan(1e-9);
  });
});

interface StarCase {
  hip: number;
  name: string;
  raDeg: number;
  decDeg: number;
  pmRaStarMas: number;
  pmDecMas: number;
}

/**
 * Catalog positions and proper motions are the Hipparcos Main Catalogue values
 * (hip_main.dat, the file the data build reads), checked field by field.
 */
const STARS: StarCase[] = [
  { hip: 32349, name: "Sirius", raDeg: 101.28854105, decDeg: -16.71314306, pmRaStarMas: -546.01, pmDecMas: -1223.08 },
  { hip: 69673, name: "Arcturus", raDeg: 213.91811403, decDeg: 19.18726997, pmRaStarMas: -1093.45, pmDecMas: -1999.4 },
  { hip: 11767, name: "Polaris", raDeg: 37.94614689, decDeg: 89.26413805, pmRaStarMas: 44.22, pmDecMas: -11.74 },
  { hip: 91262, name: "Vega", raDeg: 279.23410832, decDeg: 38.78299311, pmRaStarMas: 201.02, pmDecMas: 287.46 },
  // The 1997 reduction; the 2007 re-reduction lists 4133.05 / 3201.78.
  { hip: 104214, name: "61 Cyg A", raDeg: 316.71181258, decDeg: 38.74149446, pmRaStarMas: 4155.1, pmDecMas: 3258.9 },
];

const DATES: [string, Date][] = [
  ["1900", new Date("1900-01-01T00:00:00Z")],
  ["1998", new Date("1998-01-01T00:00:00Z")],
  ["2026", new Date("2026-01-01T00:00:00Z")],
  ["2100", new Date("2100-01-01T00:00:00Z")],
];

interface Errors {
  precession: number;
  properMotion: number;
  both: number;
}

function measure(star: StarCase, when: Date): Errors {
  const jd = julianDate(when);
  const years = yearOf(jd) - HIPPARCOS_EPOCH;
  const app = raDecToVec(star.raDeg, star.decDeg);
  const dist = (p: { raDeg: number; decDeg: number }): number =>
    angularDistanceDeg(app, raDecToVec(p.raDeg, p.decDeg));
  const pm = applyProperMotion(star.raDeg, star.decDeg, star.pmRaStarMas, star.pmDecMas, years);
  return {
    precession: dist(precessFromJ2000(star.raDeg, star.decDeg, jd)),
    properMotion: dist(pm),
    both: dist(precessFromJ2000(pm.raDeg, pm.decDeg, jd)),
  };
}

describe("independent check of the catalog epoch", () => {
  it("moves Sirius from J1991.25 to the published J2000 position", () => {
    // SIMBAD/ICRS J2000: 06h45m08.917s, -16d42m58.02s (recalled, not fetched).
    const sirius = STARS.find((s) => s.hip === 32349);
    if (sirius === undefined) throw new Error("missing Sirius");
    const moved = applyProperMotion(sirius.raDeg, sirius.decDeg, sirius.pmRaStarMas, sirius.pmDecMas, 2000 - HIPPARCOS_EPOCH);
    expect(Math.abs(moved.raDeg - 101.287155)).toBeLessThan(0.0005);
    expect(Math.abs(moved.decDeg - -16.716116)).toBeLessThan(0.0005);
  });

  it("agrees with site/public/data/catalog.json when it has been built", () => {
    const path = new URL("../../../public/data/catalog.json", import.meta.url);
    if (!existsSync(path)) return;
    const rows = (JSON.parse(readFileSync(path, "utf8")) as { stars: number[][] }).stars;
    for (const star of STARS) {
      const row = rows.find((r) => r[0] === star.hip);
      expect(row?.[1]).toBeCloseTo(star.raDeg, 7);
      expect(row?.[2]).toBeCloseTo(star.decDeg, 7);
    }
  });
});

/** Upper bounds in degrees over the five stars, about 10% above what was measured. */
const BOUNDS: Record<string, Errors> = {
  "1900": { precession: 1.3, properMotion: 0.15, both: 1.3 },
  "1998": { precession: 0.03, properMotion: 0.012, both: 0.03 },
  "2026": { precession: 0.35, properMotion: 0.06, both: 0.35 },
  "2100": { precession: 1.3, properMotion: 0.18, both: 1.3 },
};

describe("measured error of the uncorrected position", () => {
  for (const [label, when] of DATES) {
    it(`stays within the pinned bounds for ${label}`, () => {
      const bound = present(BOUNDS[label], `a pinned bound for ${label}`);
      for (const star of STARS) {
        const e = measure(star, when);
        expect(e.precession).toBeLessThan(bound.precession);
        expect(e.properMotion).toBeLessThan(bound.properMotion);
        expect(e.both).toBeLessThan(bound.both);
      }
    });
  }

  it("is smallest near the catalog epoch and grows with distance from it", () => {
    for (const star of STARS) {
      const at = (label: string): number => measure(star, new Date(`${label}-01-01T00:00:00Z`)).both;
      expect(at("1998")).toBeLessThan(at("2026"));
      expect(at("2026")).toBeLessThan(at("2100"));
      expect(at("2026")).toBeLessThan(at("1900"));
    }
  });

  it("keeps present-day (2026) error under ADR-0006's 0.5 degrees, and 2100 over it", () => {
    const worst = (when: Date): number => Math.max(...STARS.map((s) => measure(s, when).both));
    expect(worst(new Date("2026-01-01T00:00:00Z"))).toBeLessThan(0.5);
    expect(worst(new Date("2100-01-01T00:00:00Z"))).toBeGreaterThan(0.5);
  });

  it("is dominated by precession, not proper motion, for these stars", () => {
    for (const star of STARS) {
      const e = measure(star, new Date("2026-01-01T00:00:00Z"));
      expect(e.properMotion).toBeLessThan(e.precession);
    }
  });
});
