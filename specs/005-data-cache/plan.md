Re-scoped by project:refactor on 2026-09-29 (BCR-0005): ephemeris, font and render caches removed.

# Plan: data-cache | Status: Draft.

- `load_hipparcos(settings: CatalogSettings | None)` → parquet cache at
  `CACHE_DIR/hipparcos.parquet`, mag-sorted. [OBSERVED: `data/catalog.py`]
- `load_constellation_lines(cache_dir)` → `constellations.parquet`.
  [OBSERVED: `data/constellations.py`]
- `CatalogSettings.CACHE_DIR` default `/tmp/starsky-cache/catalog`; env
  `STARSKY__CATALOG__CACHE_DIR`.
- Downloads use `httpx` with explicit timeouts; hosts: CDS `hip_main.dat`,
  Stellarium `modern_iau/index.json`.
- Gone with the renderer: `de421.bsp`/Skyfield, the matplotlib font download,
  the geocode cache and the render cache.
