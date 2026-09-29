Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: cli (as-is) | Status: Draft, no tasks.md.

- Click group `main(invoke_without_command)` → bare run launches Gradio. [OBSERVED: `cli.py:75-82`]
- `render_cmd` flow: `Settings+setup_log+register_cached_fonts → resolve_coordinates+parse_when+utc_from_local → RenderOptions → cache_key check → load ephemeris/catalog/lines → PNG-hit | vector | raster`. [OBSERVED: `cli.py:129-226`]
- `warm_caches = load_ephemeris+load_hipparcos+load_constellation_lines+ensure_font`. [OBSERVED: `cli.py:38-49`]
- `export-static-data` filters `mag<=mag_limit`, selects `hip,ra,dec,mag` + `abbr,name,hip_a,hip_b`. [OBSERVED: `cli.py:263-281`]
- Tests: `tests/cli/test_cli.py` stubbed pipeline; green in fast suite.
