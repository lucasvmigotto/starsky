# Plan: catalog-cli (as-is) | Status: Draft.

- `starsky catalog` → `build_static_data(mag_limit, output_dir, settings)`: loads
  Hipparcos + lines, filters `mag <= mag_limit`, writes the two JSON files.
- `starsky cache warm` → `warm_caches(settings)`: `load_hipparcos` +
  `load_constellation_lines`, returns counts.
- Bare `python -m starsky` prints help (`invoke_without_command`).
- Settings: `CatalogSettings.CACHE_DIR` (`STARSKY__CATALOG__CACHE_DIR`), `LogSettings`.
- Dependencies: click, httpx, polars, pydantic, pydantic-settings. No Skyfield,
  no matplotlib, no Pillow, no numpy/scipy, no pandas.
- Tests: `tests/data/` (parsers), `tests/test_no_pandas.py`. CI additionally runs
  a real `cache warm` + `catalog` and asserts the JSON shape and counts.
