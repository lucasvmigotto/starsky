# Finding: precision of the uncorrected catalog positions

Feature: `009-sky-domain` | Measured by `site/src/lib/sky/precision.test.ts` | Task: T007

## Question

ADR-0006 says: "The catalog is epoch J1991.25, proper motion is ignored and no precession or nutation is applied. Positions may be off by up to about 0.5 degrees for present-day dates, and more further from 1991." Is that true?

## Method

The app draws the catalog RA/Dec as given, as if they were mean coordinates of the date. For each star and date, an independent position was computed and its angular separation from the app's was measured (angular separation, not RA difference, so Polaris near the pole is handled correctly):

- **Precession alone**: catalog position precessed from J2000 to the date (IAU 1976, Meeus ch. 21 rigorous formulas, zeta, z, theta).
- **Proper motion alone**: catalog position moved linearly in the tangent plane from J1991.25 to the date, with the Hipparcos proper motion.
- **Both**: proper motion first, then precession.

Dates are 1 January 00:00 UT of each year. The catalog axes (ICRS) are treated as J2000 axes, which they match to milliarcseconds.

Checks on the method:

- The helper reproduces Meeus example 21.b (Theta Persei, J2000 to 2028-11-13.19 TD, proper motion included) within 0.001 degrees (test: RA 41.547214, Dec 49.348483).
- Moving Sirius from J1991.25 to J2000 with its proper motion lands within 0.0005 degrees of its J2000 position (06h45m08.917s, -16d42m58.02s, recalled from memory, not fetched), which also confirms the catalog epoch.
- Catalog RA/Dec and proper motions were read from the Hipparcos Main Catalogue file the data build uses (`hip_main.dat`, a copy already on disk from an earlier run; no new download), and RA/Dec match `site/public/data/catalog.json`.

Proper motions used (mas/yr, mu_alpha cos delta, mu_delta): Sirius HIP 32349 (-546.01, -1223.08); Arcturus HIP 69673 (-1093.45, -1999.40); Polaris HIP 11767 (44.22, -11.74); Vega HIP 91262 (201.02, 287.46). **61 Cyg A HIP 104214 differs from the values in the task**: the catalog file has (4155.10, 3258.90), the 1997 reduction; (4133.05, 3201.78) is the 2007 re-reduction. The file's values were used because they belong to the catalog the app is built from. The difference is a few arcseconds per century and does not change any conclusion.

Not modelled: radial velocity (negligible for these dates), nutation (at most 17 arcseconds), annual aberration (about 20 arcseconds), parallax, atmospheric refraction.

## Measured error, degrees

| Date | Star | Precession alone | Proper motion alone | Both |
|---|---|---|---|---|
| 1900 | Sirius | 1.075 | 0.034 | 1.065 |
| 1900 | Arcturus | 1.200 | 0.058 | 1.195 |
| 1900 | Polaris | 0.567 | 0.001 | 0.568 |
| 1900 | Vega | 0.660 | 0.009 | 0.666 |
| 1900 | 61 Cyg A | 0.861 | 0.134 | 0.994 |
| 1998 | Sirius | 0.022 | 0.003 | 0.022 |
| 1998 | Arcturus | 0.024 | 0.004 | 0.025 |
| 1998 | Polaris | 0.011 | 0.000 | 0.011 |
| 1998 | Vega | 0.013 | 0.001 | 0.013 |
| 1998 | 61 Cyg A | 0.017 | 0.010 | 0.008 |
| 2026 | Sirius | 0.280 | 0.013 | 0.276 |
| 2026 | Arcturus | 0.312 | 0.022 | 0.311 |
| 2026 | Polaris | 0.147 | 0.000 | 0.148 |
| 2026 | Vega | 0.172 | 0.003 | 0.174 |
| 2026 | 61 Cyg A | 0.224 | 0.051 | 0.274 |
| 2100 | Sirius | 1.076 | 0.041 | 1.064 |
| 2100 | Arcturus | 1.201 | 0.069 | 1.196 |
| 2100 | Polaris | 0.567 | 0.001 | 0.568 |
| 2100 | Vega | 0.661 | 0.011 | 0.668 |
| 2100 | 61 Cyg A | 0.862 | 0.160 | 1.019 |

Worst case over the five stars, "both": 1900 1.195, 1998 0.025, 2026 0.311, 2100 1.196 degrees.

## What the app's accuracy is

- **1998**: about 0.03 degrees (under 2 arcminutes). Close to the catalog epoch.
- **2026**: up to about 0.3 degrees (about 19 arcminutes) in absolute position, almost all of it precession. Proper motion adds at most 0.05 degrees for these stars, and 0.01 to 0.02 for the bright ones.
- **1900 and 2100**: up to about 1.2 degrees. Precession is about 50 arcseconds per year, so the error grows roughly linearly with distance from 2000; proper motion stays under 0.16 degrees even for 61 Cyg A (5 arcseconds per year).

Precession moves every star by a nearly common rotation, so the shapes of constellations and the distances between stars are preserved: what is wrong is where the whole pattern sits against the horizon and the celestial coordinates. Altitude and azimuth are computed from the same RA/Dec, so they inherit the same angular error: at 2026 a displayed altitude or azimuth can be off by up to about 0.3 degrees, and RA/Dec shown for a star are of epoch J1991.25, not of the date.

## Does ADR-0006's "up to about 0.5 degrees for present-day dates" hold?

Yes, for the present day. The worst measured "both" error for 2026 is 0.311 degrees. Precession displaces a star at most 50.3 arcseconds per year times the sine of its angular distance from the ecliptic pole, so 0.36 degrees by 2026 for any star, plus up to about 0.05 degrees of proper motion among the visible stars; a bound of about 0.4 degrees holds for 2026 and 0.5 degrees until about 2030. The ADR's number is conservative for 2026 and correct as an order of magnitude. Its "more further from 1991" is also borne out: 1.2 degrees at 1900 and 2100.

What the ADR does not say is that "to 0.1 degrees" for altitude and azimuth display (its Precision paragraph) is a display resolution, not an accuracy: at 2026 the true error is about three times that. Labelling altitude and azimuth "approximate" is right; showing a value as accurate to 0.1 degrees would overstate it. Correcting positions is out of scope for this feature and would be a separate decision.
