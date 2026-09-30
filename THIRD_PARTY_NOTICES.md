# Third-Party Notices (starsky)

Every bundled/downloaded third-party asset, its license, and GPL-3.0
compatibility. `starsky` itself is GPL-3.0-only (`LICENSE`).

## Star catalog — Hipparcos Main Catalogue (ESA 1997, CDS I/239)

- Source: `https://cdsarc.cds.unistra.fr/ftp/cats/I/239/hip_main.dat`
  (same file Skyfield uses), downloaded at first run into the ephemeris
  cache dir, parsed without pandas, re-cached as parquet.
- License: public domain (U.S. Government/ESA mission data product
  distributed freely for scientific use; no additional restrictions).
- GPL-3.0 compatibility: yes (public domain, no conditions).

## Ephemeris — JPL DE421 (`de421.bsp`)

- Source: downloaded on first run by Skyfield's `Loader` into the
  ephemeris cache dir.
- License: public domain (U.S. Government work, NASA/JPL).
- GPL-3.0 compatibility: yes.

## Constellation lines — Stellarium `modern_iau` skyculture

- Source: `skycultures/modern_iau/index.json` from
  `https://github.com/Stellarium/stellarium` (IAU asterisms, HIP-indexed
  polylines), downloaded at `cache warm` into the ephemeris cache dir,
  re-cached as parquet.
- Authors: Stellarium team. License: **CC BY-SA 4.0**.
- GPL-3.0 compatibility: yes — CC BY-SA 4.0 §2(a)(5)(B) permits
  adaptation under GPL-3.0 (one-way compatibility). Attribution is given
  here, in the README, and in the Gradio footer.
- Deviation note: the brief named the legacy `western/constellationship.fab`
  file, which no longer exists upstream (skycultures migrated to
  `index.json`); `modern_iau` carries the same IAU line figures.

## Font — Cormorant Garamond (SIL Open Font License 1.1)

- Source: `https://github.com/google/fonts` (`ofl/cormorantgaramond/`).
- **Vendored in this repository** at `assets/fonts/` (`CormorantGaramond.ttf`
  for the Python renderer, `CormorantGaramond.woff2` for the browser, plus
  `OFL.txt`); the site serves its copy from `site/public/fonts/`. It is no
  longer downloaded at runtime and there is no fallback face (BCR-0004).
- License: SIL OFL 1.1 (permissive; allows bundling with attribution).
- GPL-3.0 compatibility: yes (OFL fonts used as unmodified assets alongside
  GPL software; no copyleft conflict for document output).

## Geocoding — OpenStreetMap Nominatim

- Runtime API (not bundled). Usage policy: descriptive `User-Agent`
  (required, fail-fast), 1 req/s throttle, local cache. Attribution
  "© OpenStreetMap contributors" shown in UI footer and README.

## Timezone lookup — `timezonefinder` (MIT), `zoneinfo` (stdlib/PSF)

- No bundled tz-boundary data beyond the package's own wheels.
