# data-cache seam (OpenAPI N/A)

- `load_hipparcos(settings?) -> DataFrame` [catalog.py:84]
- `load_constellation_lines(cache_dir) -> DataFrame` [constellations.py:71]
- `load_ephemeris(settings?) -> (loader, planets, timescale)` [ephemeris.py:18]
- `ensure_font(cache_dir) -> Path|None` / `register_cached_fonts(cache_dir) -> bool` [fonts.py:27,44]
- `warm_caches(settings) -> {stars, segments, font}` [cli.py:38]
