# BCR-0005 — Remove the Python poster renderer; the browser is the sole renderer

Status: accepted (2026-09-29)
Owner: you
Date: 2026-09-29
From: `project:refactor`, branch `refactor/static-first-client`

## Current behavior

- Two renderers implement one poster: Python/matplotlib (`src/starpy/render/figure.py:259`)
  and the browser (`site/src/lib/render/poster.ts`), kept aligned by a parity
  harness and a tolerance.
- The CLI exposes `starpy render` for headless PNG/SVG/PDF (`src/starpy/cli.py:85-226`).
- `site/render-spec.json` was written as a two-way contract ("both renderers
  conform"; ADR-0003), and the CLI's output was pinned byte-stable by a golden
  hash added in refactor Slice 0.
- The CLI's `export-static-data` reads only the Hipparcos and Stellarium parquet
  caches — no Skyfield, no `de421.bsp` (`src/starpy/cli.py:253-282`). The browser
  computes alt/az itself in TypeScript (`site/src/lib/astro.ts:32-49`).

## Proposed behavior

- **The browser is the only renderer.** The poster is defined by what the site
  produces; `render-spec.json` is the browser's normative contract, not a
  two-implementation agreement.
- **Delete the Python render path**: `src/starpy/render/`, `src/starpy/astro/`,
  `src/starpy/share/`, the `render` command, the golden/parity harness and their
  tests. The byte-stability pin is dropped with the renderer it protected.
- **The CLI's product becomes data preparation**: `starpy catalog` (promoted from
  `export-static-data`) emits the two JSON files the browser consumes, with
  `starpy cache warm` as its companion.
- **Drop the dependencies that only served rendering** — Skyfield, JPL DE421,
  matplotlib, Pillow, numpy, scipy, timezonefinder — and the 1.2 MB TTF that
  existed for matplotlib. The browser keeps the woff2.
- No parity tolerance is needed because there is nothing to compare against.

## Why

The poster is the product and the browser ships it; a second renderer that must
be kept in lockstep is pure maintenance cost, and it was already drifting (the
label-clipping difference that blocked the default flip). Removing it deletes
roughly two-thirds of the Python package, the whole ephemeris machinery and a
30 MB cold start, and eliminates the tolerance negotiation entirely.

## Impacts

- **Users**: no CLI poster rendering. Anyone scripting `starpy render` loses it;
  the browser and its PNG/SVG/PDF exports cover the need. Accepted 2026-09-29.
- **Data**: none. The export format is unchanged; `catalog.json` /
  `constellations.json` keep their shape.
- **Integrations**: JPL DE421 leaves the project entirely; Hipparcos and
  Stellarium remain (build-time only).
- **Docs/specs**: `001-render-core` deleted; `002-cli` re-scoped to the data
  pipeline; ADR-0003 rewritten; architecture topology and dependency lists shrink.
- **CI**: the Python job loses the golden/integration render steps; the data
  export step remains.

## Data migration

None — no persisted data; the exported JSON is regenerated per release and the
browser's share payload (`v1`) is unaffected.

## Tests that will prove it

- `grep` finds no `matplotlib`/`skyfield`/`PIL` import outside removed files; the
  dependency list contains none of them.
- `starpy catalog` writes both JSON files with the same star/segment counts as
  before (8870 stars, 843 segments at mag ≤ 6.5 on 2026-09-29).
- The browser renders the fixture matrix and exports PNG/SVG/PDF with no Python
  involved.
- `python -m starpy` prints help and opens no socket.
