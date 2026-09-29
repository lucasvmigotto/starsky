Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: data-cache

**Feature Branch**: `feat/data-cache` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: `src/starpy/data/*`, `src/starpy/settings/{ephemeris,render}.py`.

## User Scenarios & Testing

### User Story 1 - One-command warm (Priority: P1)

`cache warm` downloads once then serves from parquet/BSP/font caches. [OBSERVED: `cli.py:38-49`]

**Acceptance Scenarios**:

1. **Given** cold cache, **When** loading Hipparcos, **Then** `GET hip_main.dat (timeout 120) → parse slices → write parquet → sort(mag)`. [OBSERVED: `data/catalog.py:76-100`]
2. **Given** cold cache, **When** loading lines, **Then** `GET IAU index.json (timeout 60) → consecutive-HIP pairs → parquet`. [OBSERVED: `data/constellations.py:63-80`]
3. **Given** cold cache, **When** loading ephemeris, **Then** Skyfield `Loader(CACHE_DIR)` fetches `de421.bsp` once + `loader.timescale()`. [OBSERVED: `data/ephemeris.py:18-30`]
4. **Given** cold cache, **When** ensuring font, **Then** `GET CormorantGaramond[wght].ttf (timeout 120)` or `None` on `HTTPError`; register via `fontManager.addfont` or `False`. [OBSERVED: `data/fonts.py:27-55`]

### Edge Cases

- Short lines `<76 chars` skipped; blank coords → `None`. [OBSERVED: `catalog.py:41-56`]
- Font download failure degrades to DejaVu/serif fallback. [INFERRED: fallback stack in `figure.py:50` + `False` path; confirm visually.]

## Requirements

- **FR-001**: MUST cache under `EPHEMERIS__CACHE_DIR` (`hipparcos.parquet`, `constellations.parquet`, `de421.bsp`, `CormorantGaramond.ttf`). [OBSERVED]
- **FR-002**: MUST sort catalog by mag after load. [OBSERVED: `catalog.py:96-100`]
- **FR-003**: MUST honor `MAGNITUDE_CUTOFF 6.5` setting where used. [OBSERVED: `settings/ephemeris.py:11-14`]

## Success Criteria

- **SC-001**: `tests/data/*` green offline; `cache warm` echoes counts.
