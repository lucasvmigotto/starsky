Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# starpy — architecture (as-is)

Status: Draft

## Topology

Single Python service with two front doors sharing one functional core. [OBSERVED: README.md:3-6]

```
CLI (click: render | cache warm | export-static-data; bare `python -m starpy` → Gradio)
  └→ Gradio app (gui/pages + callbacks/skymap) ─┐
                                                 ├→ render_sky_map (render/figure.py:259)
Static explorer (site/ viewer, render-spec.json) → share links (#s= payload)
Data loaders → /tmp/starpy-cache/{ephemeris,geocode.json,renders}
```

- `python -m starpy` shim → click group; `invoke_without_command` launches Gradio. [OBSERVED: src/starpy/__main__.py:3-5; src/starpy/cli.py:75-82]
- `launch_app()` composes `Settings → setup_envvars/setup_log → register_cached_fonts → load_ephemeris/load_hipparcos/load_constellation_lines → SkyMapCallback → build_app/build_sky → app.launch(**GRADIO.config)`. [OBSERVED: src/starpy/main.py:17-43]
- HF Space runs `app.py` (`sys.path` shim, honors `$PORT` → `STARPY__GRADIO__SERVER_PORT`, default 7860). [OBSERVED: app.py:10-23]
- No REST API, no broker, no database. [OBSERVED: repo-wide grep for RestController/route/app.get found none; settings only file-cache paths]

## Stack

- Python >= 3.14 (`3.14` in `.python-version`). [OBSERVED: pyproject.toml:6; .python-version:1]
- Core: `skyfield` (positions/ephemeris), `numpy` + `scipy` (projection/declutter via `cKDTree`), `polars` (catalogs), `matplotlib` Agg + `pillow` (compose), `httpx` (downloads/Nominatim), `timezonefinder` + `zoneinfo`, `pydantic`/`pydantic-settings` + `click`, `gradio>=6.3`. [OBSERVED: pyproject.toml:8-21; src/starpy/render/figure.py:44]
- Static site: Vite + TypeScript (`site/package.json`), Vitest suites (`*.test.ts`). [INFERRED: site file listing → conclusion; confirm with viewer run.]
- Toolchain: `uv` (+ `uv.lock`, `requirements.txt` for HF), `ruff` (E,F,I,UP,B; line-length 88), `ty`, `pytest -q --strict-markers` with markers `unit/integration/golden/network`. [OBSERVED: pyproject.toml:39-53; README.md:90-94]

## Hosting

- Local: `uv run python -m starpy` on 8080 (example). [OBSERVED: README.md:10-14; .env.example:3-4]
- Docker multistage (`Dockerfile`; DHI default, public fallback `ghcr.io/astral-sh/uv:python3.14-trixie` → `python:3.14-slim-trixie`); runtime non-root 65532; cache volume `starpy-cache:/tmp/starpy-cache`. [OBSERVED: README.md:66-78]
- HF Space: `sdk: docker`, `app_port: 7860`. [OBSERVED: hf.README.md:1-8]
- Static explorer: deployed via `static_r2.yml` [INFERRED: workflow filename → R2 deploy; confirm with workflow read.]
- CI: `ci.yml` (ruff + format check + ty + pytest + declarative-imports + live Nominatim smoke gated on `STARPY_USER_AGENT_CONTACT`), `ghcr.yml`/`dockerhub.yml`/`release.yml`/`hf_spaces.yml` (OIDC trusted publisher, 1h token). [OBSERVED: README.md:80-86]

## Data stores

No DBMS. File caches only:

| Store | Path (config key, name only) | Format |
|---|---|---|
| Ephemeris BSP | `EPHEMERIS__CACHE_DIR` | `de421.bsp` via Skyfield `Loader` [OBSERVED: src/starpy/data/ephemeris.py:11-30] |
| Star catalog | `EPHEMERIS__CACHE_DIR/hipparcos.parquet` | Hipparcos `hip_main.dat` parsed (slices 51:63, 64:76, 8:14, 41:46) → parquet, sorted by mag [OBSERVED: src/starpy/data/catalog.py:30-100] |
| Constellation lines | `EPHEMERIS__CACHE_DIR/constellations.parquet` | Stellarium IAU `index.json` consecutive-HIP pairs → parquet [OBSERVED: src/starpy/data/constellations.py:26-80] |
| Font | `EPHEMERIS__CACHE_DIR/CormorantGaramond.ttf` | Google Fonts URL, `httpx` download, `fontManager.addfont`; failure → `None`/`False` fallback to DejaVu [OBSERVED: src/starpy/data/fonts.py:15-55] |
| Geocode cache | `GEOCODING__CACHE_PATH` | JSON `{v:1, at, result}`, TTL 30d [OBSERVED: src/starpy/geocoding/nominatim.py:24-82] |
| Render cache | `RENDER__CACHE_DIR/{sha256}.png` | Content-hash PNG; SVG/PDF bypass PNG cache [OBSERVED: src/starpy/render/figure.py:332-353; src/starpy/cli.py:147-165] |
| Static export | `site/public/data/` | `catalog.json` (mag ≤ 6.5: hip,ra,dec,mag) + `constellations.json` (abbr,name,hip_a,hip_b) [OBSERVED: src/starpy/cli.py:245-282] |

## Integrations (hosts only; keys by name)

- Nominatim `GEOCODING__BASE_URL` + required `GEOCODING__USER_AGENT`, 1 req/s throttle (`RATE_LIMIT_S`), `format=jsonv2&limit=1&addressdetails=1`. [OBSERVED: src/starpy/geocoding/nominatim.py:85-139]
- CDS Hipparcos `hip_main.dat` URL, Stellarium `index.json` URL, Google Fonts Cormorant URL (constants in `data/`). [OBSERVED: src/starpy/data/catalog.py:30; src/starpy/data/constellations.py:26-29; src/starpy/data/fonts.py:15-18]
- JPL DE421 via Skyfield loader (network once, then cached). [OBSERVED: src/starpy/data/ephemeris.py:21-24]
- Registries: GHCR `ghcr.io/<owner>/<repo>`, Docker Hub (`DOCKER_HUB_PAT`), HF Space push. [OBSERVED: README.md:80-86]

## Capacity

No metrics observed in repo. Render path is per-request CPU (Skyfield per-star alt/az loop [OBSERVED: src/starpy/astro/positions.py:35-50]) + matplotlib compose; deterministic cache mitigates repeats. [INFERRED: loop + cache → CPU-bound without cache; confirm with load run.]

## ADRs (only where history/docs explain)

- Polars over pandas (functional core, CI-enforced). [OBSERVED: README.md:5-6; tests/test_no_pandas.py]
- Explicit from-imports, no module attribute access (CI script). [OBSERVED: README.md:96-111]
- Content-hash deterministic renders. [OBSERVED: README.md:49]

No to-be — that belongs to `project:architecture` / `project:refactor`.
