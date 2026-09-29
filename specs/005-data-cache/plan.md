Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: data-cache (as-is) | Status: Draft, no tasks.md.

- `build_loader(settings) = Loader(str(CACHE_DIR), verbose=False)`. [OBSERVED: `ephemeris.py:11-15`]
- Sources (hosts only): CDS `hip_main.dat`, Stellarium `modern_iau/index.json`, Google Fonts Cormorant, JPL DE421 via Skyfield. No values copied.
- `RenderSettings(DPI 150, SIZE_PX 1600, colors, CACHE_DIR, defaults mag 5.8 / fisheye 1.0 / sep 0.008 / glow 1.0)`. [OBSERVED: `settings/render.py:16-32`]
- Integration `ensure_bsp_cached` tries `ssd.jpl` then `naif.jpl` mirrors, skips on outage. [OBSERVED: `tests/integration/_helpers.py:19-75`]
