Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# starsky — brief

Status: Draft

## Problem

People want a personalized night-sky poster for a place and moment ("our night") without proprietary SaaS or manual planetarium work. [ASSUMPTION: personal-keepsake / gift use is the primary motive; confirm with owner.]

## What the product does (observed)

Self-hosted, fully open-source custom star-map poster generator. Gradio app + headless CLI sharing one renderer (`render_sky_map`). [OBSERVED: README.md:3-6; src/starsky/render/figure.py:259]

- Coordinates (`--lat/--lon`) or free-text place (`--place` via Nominatim) + `--when` + `--tz` → poster PNG/SVG/PDF. [OBSERVED: src/starsky/cli.py:86-107; README.md:23-36]
- Gradio flow: Location (Coordinates | Place tabs) → date/time + timezone (default `UTC`, auto-detect via `timezonefinder`, explicit wins) → render accordion (projection, fisheye strength, density, magnitude, glow, constellations, shape, title) → poster image with download. [OBSERVED: README.md:53-56]
- Renders are deterministic (content-hash cache under the render cache dir). [OBSERVED: README.md:49; src/starsky/render/figure.py:332]
- Caption: `[Title]` then `40.7580°N, 73.9855°W — Times Square, New York, United States · 2026-01-01 00:00 UTC+00:00`. [OBSERVED: README.md:45-48; src/starsky/render/caption.py:13-38]
- `cache warm` preloads ephemeris + catalog + lines + font. [OBSERVED: README.md:13; src/starsky/cli.py:38-49]
- Share links: canonical JSON → zlib-9 → URL-safe base64 → `<base>/#s=<payload>` for the static explorer viewer. [OBSERVED: src/starsky/share/spec.py:1-6]
- Static explorer viewer + `starsky catalog` (`catalog.json`, `constellations.json`) for offline viewing. [OBSERVED: src/starsky/cli.py; site/PLAN.md]
- Delivery: `uv` + multistage Docker (GHCR/Docker Hub), Hugging Face Space via `app.py`. [OBSERVED: README.md:66-86; app.py:1-23]

## Audiences

[ASSUMPTION: non-technical gift buyers / event keepsakes + self-hosters + developers running their own Space. Confirm with owner.]

## Scope

In scope: poster rendering core, CLI, Gradio app, geocoding + timezone, file-cache data layer, share/static viewer, Docker/HF/CI delivery.
Out of scope: [ASSUMPTION: no accounts, payments, multi-user library, or mobile app — none observed in code. Confirm.]

## Capabilities (observed)

1. Render core (stereographic/fisheye, declutter, glow, masks, caption, PNG/SVG/PDF). [OBSERVED: src/starsky/render/figure.py:65-380]
2. CLI (`catalog`, `cache warm`; there is no renderer and no server — BCR-0001/0005). [OBSERVED: src/starsky/cli.py]
3. Gradio app (place/coordinates, tz detect, render options, download, share-link copy). [OBSERVED: src/starsky/main.py:17-43; README.md:53-56]
4. Geocoding + time (Nominatim with 1 req/s throttle + JSON cache TTL 30d; `timezonefinder`; `ZoneInfo` UTC conversion). [OBSERVED: src/starsky/geocoding/nominatim.py:1-150; src/starsky/astro/observer.py:7-17]
5. Data loading (JPL DE421 via Skyfield `Loader`; Hipparcos `hip_main.dat` → parquet; Stellarium IAU lines → parquet; Cormorant Garamond font). [OBSERVED: src/starsky/data/catalog.py:30; src/starsky/data/constellations.py:26-30; src/starsky/data/ephemeris.py:18-30; src/starsky/data/fonts.py:15-19]
6. Share/static export. [OBSERVED: src/starsky/share/spec.py:20-45]

## Constraints

- `STARSKY__GEOCODING__USER_AGENT` required; `example.com` contacts get HTTP 403 from Nominatim. [OBSERVED: README.md:63; .env.example:6-7]
- Licenses: code GPL-3.0-only; Hipparcos + DE421 public domain; Stellarium lines CC BY-SA 4.0 (one-way compatible to GPL-3.0); Cormorant Garamond OFL 1.1. [OBSERVED: pyproject.toml:7; THIRD_PARTY_NOTICES.md]
- Python >= 3.14, functional core + thin Pydantic v2 shell, Polars never pandas (CI-enforced `test_no_pandas.py`). [OBSERVED: pyproject.toml:6; README.md:5-6]
- Import style: explicit from-imports only, no module attribute access (CI `scripts/check_declarative_imports.py`). [OBSERVED: README.md:96-111]
- Runtime runs as UID/GID 65532. [OBSERVED: README.md:78]

## Metrics

[ASSUMPTION: none defined in repo. Suggest: time-to-poster, cache-hit rate, Nominatim 403 rate, render determinism. Confirm.]

## Glossary

- Poster — rendered night-sky image + caption block (PNG raster or SVG/PDF vector). Not: chart, plot.
- Place — free-text location resolved via Nominatim to lat/lon + `display_name` + short name. Not: coordinates.
- Coordinates — validated lat [-90,90] / lon [-180,180]. [OBSERVED: src/starsky/schemas/inputs/location.py:13-15]
- Observation — naive local datetime + tz name → UTC moment. [OBSERVED: src/starsky/schemas/inputs/observation.py:11-20]
- RenderOptions — projection, fisheye strength (0,3], min separation [0,0.1], magnitude limit [1,8], glow, constellations, shape, title. [OBSERVED: src/starsky/schemas/inputs/render.py:10-20]
- Projection — `stereographic` | `fisheye`. Not: mercator. [OBSERVED: src/starsky/schemas/enums/projection.py:6-8]
- Shape — `circle` | `square`. [OBSERVED: src/starsky/schemas/enums/shape.py:6-8]
- SharePayload — versioned (`v=1`) flat JSON of lat/lon/place/when/tz/options. [OBSERVED: src/starsky/schemas/share.py:11-28]

## Open items

- Purpose/audiences/goals are Assumed until the confirmation round.
- No REST API → `contracts/openapi.yaml` is N/A (CLI flags + Gradio callbacks are the seam; see `introspec.md`).
