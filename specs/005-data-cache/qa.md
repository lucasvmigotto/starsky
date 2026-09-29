# QA — data-cache

**Risk: Low** (impact Low × likelihood Low). Stable parsers over
upstream-controlled public data, already exercised offline. Coverage is the happy
path plus validation — no charter, no load profile.

## Traceability

| Story / FR / SC | Layer | Test (or planned) |
|---|---|---|
| US1 Hipparcos parse → parquet | unit | `tests/data/test_catalog.py` (fixed-width slices, blank coords, short lines) — **exists** |
| US1 Stellarium parse → parquet | unit | `tests/data/test_constellations.py` — **exists** |
| US1 warm cache short-circuits | integration | CI: second `cache warm` makes no fetch |
| FR-001 cache files under `CATALOG__CACHE_DIR` | integration | CI asserts the parquet files exist after warm |
| FR-002 no ephemeris fetch | unit | import check — no Skyfield anywhere |
| FR-003 mag-sorted output | unit | `test_catalog.py` (sort after load) |
| SC-002 counts above floor | integration | CI (`>8000` stars, `>500` segments) |

## Boundary and negative cases

- Line shorter than the fixed-width record → skipped.
- Blank right ascension or declination → the row is dropped.
- A source host returning an error → no partially-written parquet is treated as
  valid; the next run re-fetches.
- A parquet cache present but empty/corrupt → fail loudly rather than serve a
  partial catalogue.

## Exit criteria

`tests/data/` green offline; CI warm-and-build green with counts above the floor.
No browser surface, so browser e2e does not apply.
