# Feature Specification: catalog-cli

**Feature Branch**: `feat/catalog-cli`

**Created**: 2026-09-29

**Status**: Draft

**Input**: BCR-0005. The CLI's product is the sky data the browser consumes
(`src/starsky/cli.py`, `src/starsky/data/`); it no longer renders (ADR-0003).

## User Scenarios & Testing

### User Story 1 - Build the sky data (Priority: P1)

`starsky catalog` writes `catalog.json` (stars) and `constellations.json`
(segments) for the site, from the cached Hipparcos and Stellarium sources.

**Why this priority**: this is the CLI's entire reason to exist after BCR-0005;
the site cannot render without it.

**Independent Test**: run `uv run python -m starsky catalog --output-dir /tmp/x`
and assert both files exist, parse, and carry the expected shape.

**Acceptance Scenarios**:

1. **Given** warm caches, **When** `starsky catalog` runs, **Then** it writes
   `catalog.json` with `{"stars": [[hip, ra_deg, dec_deg, mag], …]}` filtered by
   `--mag-limit` (default 6.5). [OBSERVED: `cli.py`]
2. **Given** warm caches, **When** `starsky catalog` runs, **Then** it writes
   `constellations.json` with `{"segments": [[abbr, name, hip_a, hip_b], …]}`.
   [OBSERVED: `cli.py`]
3. **Given** `--output-dir` pointing at a missing directory, **When** it runs,
   **Then** the directory is created.
4. **Given** no arguments, **When** `python -m starsky` runs, **Then** it prints
   help and **opens no socket**. [BCR-0005; constitution I]

### User Story 2 - Warm the caches (Priority: P2)

`starsky cache warm` downloads the Hipparcos catalogue (`hip_main.dat`, parsed to
parquet) and the Stellarium IAU lines (`index.json`, parsed to parquet) into the
cache dir, and reports counts. No ephemeris: the browser computes alt/az itself.

**Independent Test**: `cache warm` on a cold cache reports `>8000` stars and
`>500` segments and leaves both parquet files present.

**Acceptance Scenarios**:

1. **Given** a cold cache, **When** `cache warm` runs, **Then** both parquet
   files exist under `STARSKY__CATALOG__CACHE_DIR`.
2. **Given** a warm cache, **When** it runs again, **Then** it does not
   re-download.

### Edge Cases

- Short or malformed `hip_main.dat` lines are skipped; blank coordinates are
  dropped. [OBSERVED: `tests/data/test_catalog.py`]
- The source hosts are unavailable → the command fails loudly; it never writes a
  partial or empty JSON file.

## Requirements

### Functional Requirements

- **FR-001**: `starsky catalog` MUST be the promoted default subcommand, with
  `--mag-limit` (6.5) and `--output-dir` (`site/public/data`).
- **FR-002**: The CLI MUST NOT import a rendering or ephemeris library, and MUST
  NOT open a listening socket (constitution I). [BCR-0005]
- **FR-003**: `cache warm` MUST NOT fetch the JPL ephemeris — it is no longer
  needed by any component.
- **FR-004**: Output JSON MUST keep the documented shape; the browser parses it
  positionally (`stars: [hip, ra, dec, mag]`, `segments: [abbr, name, a, b]`).
- **FR-005**: Data MUST NOT use pandas (constitution/CI guard).

### Key Entities

- **StarCatalog**: `hip` (int), `ra_deg`, `dec_deg`, `mag` (float), mag-sorted.
- **ConstellationLines**: `abbr`, `name` (str), `hip_a`, `hip_b` (int).
- **CatalogJson** / **ConstellationsJson**: the two exported files.

## Success Criteria

- **SC-001**: `starsky catalog` on `main` produces the same counts as the
  reference run: **8870 stars, 843 segments** at mag ≤ 6.5 (2026-09-29).
- **SC-002**: CI builds the data on every push and fails if the shape or the
  minimum counts regress.
- **SC-003**: `python -m starsky` binds nothing.

## Assumptions

- [ASSUMPTION] The mag ≤ 6.5 default remains right for the bundle budget
  (~250 KB brotli); raising it is a deliberate change with a budget check.
