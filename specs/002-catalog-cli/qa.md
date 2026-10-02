# QA — catalog-cli

**Risk: Medium** (impact Medium × likelihood Medium). The CLI is the site's only
data source: a quietly wrong export breaks every poster, and nothing in the
browser would say why.

## Traceability

| Story / FR / SC | Layer | Test (or planned) |
|---|---|---|
| US1 writes both JSON files | integration | CI runs `cache warm` + `catalog` and asserts both exist and parse |
| US1 mag filter honoured | unit | `tests/data/test_catalog.py` (parser) + CI assertion on counts |
| US1 constellations shape | unit | `tests/data/test_constellations.py` |
| US1 output dir created | integration | CI writes to a fresh dir |
| US1 no subcommand → help, no socket | integration | **planned** — assert exit 0 and no bound port |
| US2 warm caches | integration | CI `cache warm` reports counts; second run does not re-download |
| FR-002 no render/ephemeris import | unit | CI grep + import check |
| FR-004 JSON shape | unit | CI asserts 4 fields per star and per segment |
| FR-005 no pandas | unit | `tests/test_no_pandas.py` — **exists** |
| SC-001 counts 8870 / 843 | integration | CI asserts `>8000` / `>500` (a hard equality would break on an upstream catalogue update) |
| SC-003 binds nothing | integration | planned |

## Boundary and negative cases

- **Upstream catalogue changes** (a new Hipparcos revision) → counts move; the CI
  threshold is a floor, not an equality, so it does not false-fail; a *drop*
  below the floor fails.
- **Short/garbled lines** → skipped, not crashed (`tests/data/test_catalog.py`).
- **`--mag-limit` extreme** (very low → near-empty catalog) → still valid JSON.
- **Source host unavailable** → the command fails loudly and writes nothing.
- **Re-run over an existing output dir** → overwrites cleanly, no partial file
  left behind.

## e2e journey

**J5 — CI data build** (in `ci.yml`, not a browser journey)
1. `cache warm` on a cold cache → downloads both sources.
2. `catalog --output-dir /tmp/…` → both files present.
3. Parse both; assert ≥8000 stars, ≥500 segments, 4 fields each.
4. Re-run `cache warm` → no network fetch.

## Exit criteria

CI data build green; counts above the floor; no pandas; `python -m starsky` binds
nothing. No browser component, so e2e (browser) does not apply — Verified here
means the CI integration job passes on `main`.
