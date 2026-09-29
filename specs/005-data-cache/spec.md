Reconstructed by project:introspec on 2026-09-29; re-scoped by project:refactor (BCR-0005) so the ephemeris, font and render caches are gone.

# Feature Specification: data-cache

**Feature Branch**: `feat/data-cache` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: `src/starpy/data/*`, `src/starpy/settings/catalog.py`.

## User Scenarios & Testing

### User Story 1 - Warm the two sources (Priority: P1)

`cache warm` downloads the star catalogue and the constellation lines once, then
serves them from parquet caches on later runs. [OBSERVED: `src/starpy/cli.py`]

**Why this priority**: it feeds `starpy catalog`, which is the CLI's only
product after BCR-0005.

**Acceptance Scenarios**:

1. **Given** a cold cache, **When** loading Hipparcos, **Then** `GET hip_main.dat
   (timeout 120) → parse fixed-width slices → write parquet → sort(mag)`.
   [OBSERVED: `data/catalog.py`]
2. **Given** a cold cache, **When** loading lines, **Then** `GET IAU index.json
   (timeout 60) → consecutive-HIP pairs → parquet`. [OBSERVED: `data/constellations.py`]
3. **Given** a warm cache, **When** the command runs again, **Then** neither
   source is re-downloaded.
4. **Given** the cache directory does not exist, **When** loading runs, **Then**
   it is created.

### Edge Cases

- Lines shorter than the fixed-width record are skipped; blank coordinates are
  dropped. [OBSERVED: `tests/data/test_catalog.py`]
- A source host is unavailable → the failure is loud; no partial parquet is left
  as if it were valid.

## Requirements

### Functional Requirements

- **FR-001**: MUST cache `hipparcos.parquet` and `constellations.parquet` under
  `STARPY__CATALOG__CACHE_DIR`.
- **FR-002**: MUST NOT fetch the JPL ephemeris (BCR-0005): nothing consumes it.
- **FR-003**: MUST sort the catalogue by magnitude after loading.
- **FR-004**: MUST NOT use pandas.

### Key Entities

- **StarCatalog** / **ConstellationLines** — see `002-catalog-cli/data-model.md`.
- **CatalogCache** — the on-disk parquet pair.

## Success Criteria

- **SC-001**: `tests/data/` green offline (parsers + frame assembly).
- **SC-002**: `cache warm` reports `>8000` stars and `>500` segments on the real
  sources.
- **SC-003**: No network access after a warm cache.

## Assumptions

- [ASSUMPTION] The two upstream URLs (CDS `hip_main.dat`, Stellarium
  `modern_iau/index.json`) stay stable; a move is a data-source change.
