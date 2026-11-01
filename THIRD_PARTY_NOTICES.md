# Third-Party Notices (starsky)

Every bundled/downloaded third-party asset, its license, and GPL-3.0
compatibility. `starsky` itself is GPL-3.0-only (`LICENSE`).

## Star catalog — Hipparcos Main Catalogue (ESA 1997, CDS I/239)

- Source: `https://cdsarc.cds.unistra.fr/ftp/cats/I/239/hip_main.dat`
  (same file Skyfield uses), or its VizieR mirror at
  `https://vizier.cfa.harvard.edu/ftp/cats/I/239/hip_main.dat`, verified by
  SHA-256, downloaded at first run into the ephemeris
  cache dir, parsed without pandas, re-cached as parquet.
- License: public domain (U.S. Government/ESA mission data product
  distributed freely for scientific use; no additional restrictions).
- GPL-3.0 compatibility: yes (public domain, no conditions).

## Constellation lines — Stellarium `modern_iau` skyculture

- Source: `skycultures/modern_iau/index.json` from
  `https://github.com/Stellarium/stellarium` (IAU asterisms, HIP-indexed
  polylines), downloaded at `cache warm` into the ephemeris cache dir,
  re-cached as parquet.
- Authors: Stellarium team. License: **CC BY-SA 4.0**.
- GPL-3.0 compatibility: yes — CC BY-SA 4.0 §2(a)(5)(B) permits
  adaptation under GPL-3.0 (one-way compatibility). Attribution is given
  here, in the README, and in the site footer.
- Deviation note: the brief named the legacy `western/constellationship.fab`
  file, which no longer exists upstream (skycultures migrated to
  `index.json`); `modern_iau` carries the same IAU line figures.

## Star names — Stellarium `modern_iau` skyculture

- Source: the same `skycultures/modern_iau/index.json` as the constellation
  lines above (its `common_names` section, HIP-keyed entries only),
  downloaded at `cache warm`, re-cached as parquet, and written to
  `names.json` for the Sky Explorer.
- Authors: Stellarium team. License: **CC BY-SA 4.0**; GPL-3.0
  compatibility and attribution as for the constellation lines.

## Font — Cormorant Garamond (SIL Open Font License 1.1)

- Source: `https://github.com/google/fonts` (`ofl/cormorantgaramond/`).
- **Vendored in this repository** at `assets/fonts/` (`CormorantGaramond.ttf`
  for the Python renderer, `CormorantGaramond.woff2` for the browser, plus
  `OFL.txt`); the site serves its copy from `site/public/fonts/`. It is no
  longer downloaded at runtime and there is no fallback face (BCR-0004).
- License: SIL OFL 1.1 (permissive; allows bundling with attribution).
- GPL-3.0 compatibility: yes (OFL fonts used as unmodified assets alongside
  GPL software; no copyleft conflict for document output).

## Font — Inter (SIL Open Font License 1.1)

- Source: npm `@fontsource-variable/inter` 5.3.0, bundled into the site build
  as woff2 (interface text only; posters use Cormorant Garamond).
- License: SIL OFL 1.1. GPL-3.0 compatibility: yes, as for Cormorant Garamond.

## Map library — Leaflet 1.9.4 (BSD-2-Clause)

- Source: npm `leaflet`, bundled as a lazy chunk loaded only by the landing
  map, with its CSS and marker images served locally.
- License: BSD-2-Clause. GPL-3.0 compatibility: yes (permissive).

## Map tiles and place search — OpenStreetMap (ODbL 1.0)

- Runtime services, not bundled: `tile.openstreetmap.org` (landing map,
  visible view only) and Nominatim search (on explicit submit or leaving the
  field, never as you type; per-session cache; at least 1 s between
  requests). Browsers cannot set `User-Agent`, so requests identify the app by
  the automatic `Referer`. See the usage policies at
  https://operations.osmfoundation.org/policies/tiles/ and
  https://operations.osmfoundation.org/policies/nominatim/.
- Data © OpenStreetMap contributors, ODbL 1.0. Attribution is always visible on
  the map, in the site footer and in the README. The landing tells visitors
  that OpenStreetMap sees their IP address.

## Retired

- JPL DE421 ephemeris and Skyfield: removed with the Python renderer
  (BCR-0005). Nothing downloads or bundles them.
- `timezonefinder`: removed. The browser uses the platform's IANA zones.
