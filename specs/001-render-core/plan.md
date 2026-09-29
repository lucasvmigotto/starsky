Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: render-core (as-is technical context)

Status: Draft. No `tasks.md` (nothing planned).

## Stack

Python 3.14, `skyfield` alt/az, `numpy/scipy` projection + `cKDTree` declutter, `polars` frames, `matplotlib` Agg + `pillow`. [OBSERVED: `pyproject.toml:8-21`; `render/figure.py:44`]

## Pipeline

`filter mag → altaz_for_stars (per-star Star(ra/15,dec), earth+wgs84, timescale.from_datetime, observe.apparent.altaz) → alt>0 → stereographic|fisheye → declutter → compose_figure → PIL|vector`. [OBSERVED: `render/figure.py:1-10,65-111`; `astro/positions.py:35-50`]

## Key files

- `src/starpy/render/figure.py:50-51,54-380` (tokens, tz_label, project/compose/cache/export)
- `src/starpy/render/{caption,mask,glow,density,constellations}.py`
- `src/starpy/astro/{observer,positions,projection}.py`
- `src/starpy/schemas/inputs/render.py:10-20`, `enums/{projection,shape}.py`

## Tests (observed runs 2026-09-29)

- Fast suite `76 passed, 2 deselected` includes `tests/render/*`, `tests/astro/*`. [OBSERVED: pytest output]
- `tests/integration/test_smoke.py:34-74` asserts `catalog>90000`, `lines>500`, byte-determinism at 320px — timed out locally (cold BSP cache); CI runs with warm cache. Status stays Implemented, not Verified.
- `ty` + `ruff check/format` clean. [OBSERVED: run outputs]
