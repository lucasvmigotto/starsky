Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: geocoding-time

**Feature Branch**: `feat/geocoding-time` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: `src/starpy/geocoding/nominatim.py`, `src/starpy/astro/observer.py`, `src/starpy/schemas/inputs/{location,observation}.py`.

## User Scenarios & Testing

### User Story 1 - Place → coordinates (Priority: P1)

Free text → `{display_name, place_short, lat, lon}` via Nominatim `GET {BASE_URL}/search?q&format=jsonv2&limit=1&addressdetails=1`, required `User-Agent`, 1 req/s throttle, JSON cache `{v:1,at,result}` TTL 30d. [OBSERVED: `nominatim.py:85-139`]

**Acceptance Scenarios**:

1. **Given** empty query, **When** geocoding, **Then** `ValueError`; missing `USER_AGENT` fails fast. [OBSERVED: `nominatim.py:95-98`]
2. **Given** no items, **When** geocoding, **Then** `LookupError`. [OBSERVED: `nominatim.py:123-124`]
3. **Given** valid cache entry, **When** geocoding, **Then** return copy without network. [OBSERVED: `nominatim.py:99-108`]

### User Story 2 - Correct moment + timezone (Priority: P1)

Naive local + tz → UTC (`ZoneInfo`); UTC → `strftime("%Y-%m-%d %H:%M")` local; tz auto-detect `TimezoneFinder().timezone_at`, `None → LookupError`; caption suffix `tz_label` (`UTC±HH:MM`, prefixed by name unless UTC). [OBSERVED: `observer.py:7-17`; `nominatim.py:142-150`; `render/figure.py:54-62`]

**Independent Test**: `tests/geocoding/test_nominatim.py`, `tests/astro/test_observer.py` green (respx offline). [OBSERVED: fast suite]

## Requirements

- **FR-001**: MUST enforce lat [-90,90], lon [-180,180]. [OBSERVED: `location.py:13-21`]
- **FR-002**: MUST build `short_place_name` (road + city-of-5-keys + state/country dedup, else 80-char display slice). [OBSERVED: `nominatim.py:34-57`]
- **FR-003**: MUST `sleep(RATE_LIMIT_S=1.0)` after live fetch and credit OSM. [OBSERVED: `nominatim.py:138`; GUI footer]

## Success Criteria

- **SC-001**: Offline geocode/time tests green; live smoke (CI, gated on `STARPY_USER_AGENT_CONTACT`) renders a `--place` poster.
