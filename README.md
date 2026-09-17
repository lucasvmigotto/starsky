---
title: starpy
emoji: 🔭
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8080
license: gpl-3.0
---

# 🔭 starpy — personalized night-sky posters

Self-hosted, fully open-source "custom star map poster" generator.
Gradio app + headless CLI sharing one renderer (`render_sky_map`).
Functional core, thin OO shell (Pydantic v2, pydantic-settings, Polars —
never pandas), `uv` + multistage Docker, CI to GHCR/Docker Hub/HF Spaces.

## Quickstart

```bash
cp .env.example .env   # then set STARPY__GEOCODING__USER_AGENT (REQUIRED)
uv sync --all-groups
uv run python -m starpy cache warm     # ephemeris + catalog + lines + font
uv run python -m starpy                # launch Gradio (http://localhost:8080)
```

`python -m starpy` with no subcommand launches the app; `--help` lists
`render` / `cache` subcommands.

## CLI

```bash
# Coordinates, circle poster:
uv run python -m starpy render \
  --lat 40.7580 --lon -73.9855 \
  --when "2026-01-01T00:00" --tz UTC \
  --shape circle --output out.png

# Free-text place (Nominatim) with title, fisheye lens, print-ready vector:
uv run python -m starpy render \
  --place "Times Square, New York, NY" \
  --when "2026-01-01T00:00" --tz UTC \
  --projection fisheye --fisheye-strength 1.4 \
  --magnitude-limit 6.0 --min-separation 0.008 \
  --glow --constellations --shape circle \
  --title "Our Night" --output poster.pdf
```

Full flags: `--lat --lon|--place --when --tz --projection --fisheye-strength
--min-separation --magnitude-limit --glow/--no-glow --glow-intensity
--constellations/--no-constellations --constellation-labels/...
--shape --title --output` (png/svg/pdf by extension; svg/pdf use
matplotlib's native vector backends).

Caption format: `[Title]` (omitted when empty), then
`40.7580°N, 73.9855°W — Times Square, New York, United States · 2026-01-01 00:00 UTC+00:00`
(signed decimals to 4 places with N/S/E/W suffixes; place segment omitted
when unresolved).
Renders are deterministic (content-hash cache under the render cache dir).

## Gradio app

Location (Coordinates | Place tabs) → date/time + timezone (default `UTC`,
auto-detect via `timezonefinder`, explicit value wins) → render accordion
(projection, fisheye strength, density, magnitude, glow, constellations,
shape, title) → poster image with download. Footer credits
© OpenStreetMap contributors.

## Configuration

`STARPY__<SECTION>__<KEY>` (see `.env.example`):
`GRADIO` (server/port), `EPHEMERIS` (BSP cache), `GEOCODING`
(`USER_AGENT` **required** — use a real contact; `example.com` contacts get
HTTP 403 from Nominatim), `RENDER` (dpi/size/colors/font), `LOG`, `HF`.

## Docker

```bash
# With Docker Hardened Images enrollment (defaults):
docker build -t starpy .
# Without DHI access (public fallback, also used by CI):
docker build -t starpy \
  --build-arg BUILDER_IMAGE=ghcr.io/astral-sh/uv:python3.14-trixie \
  --build-arg RUNTIME_IMAGE=python:3.14-slim-trixie .
docker run --rm -p 8080:8080 -v starpy-cache:/tmp/starpy-cache starpy
```

Runtime runs as UID/GID 65532 (DHI default non-root).

## Secrets (GitHub Actions)

| Secret | Used by | Purpose |
| --- | --- | --- |
| _(none — OIDC trusted publisher)_ | `hf_spaces.yml` | Push to the Space mints a 1h token via OpenID Connect. One-time manual setup: create the Space as Gradio SDK, then add this repo (`main` + `hf_spaces.yml` claims) under the Space's Trusted Publishers. |
| `DOCKER_HUB_PAT` | `dockerhub.yml` | Docker Hub PAT with push scope (username is `github.repository_owner`, no secret needed) |
| `STARPY_USER_AGENT_CONTACT` | `ci.yml` live smoke | real contact User-Agent for Nominatim (skipped on forks without it) |

## Dev

```bash
uv run ruff check src tests && uv run ruff format --check src tests
uv run ty check src tests
uv run pytest -q
```

### Import style (enforced in CI)

No `import x` / `import x as y`, no module attribute access. Every name
arrives via an explicit from-import, namespaced with its module when it
was previously reached attributively:

```python
from numpy import arange as np_arange
from polars import DataFrame as pl_DataFrame
from click import group as click_group
```

Already-unambiguous from-imports (`pathlib.Path`, `zoneinfo.ZoneInfo`,
pydantic names, …) stay bare. Class/object member access (`fig.savefig`,
`settings.RENDER`) is unaffected — only *module* attribute access is
banned. Checked by `scripts/check_declarative_imports.py`.

## Attribution

- Geocoding © OpenStreetMap contributors (Nominatim usage policy).
- Stars: Hipparcos Catalogue (ESA); ephemeris: JPL DE421 (public domain).
- Constellation lines: Stellarium IAU skyculture (CC BY-SA 4.0).
- Font: Cormorant Garamond (SIL OFL 1.1), DejaVu Serif fallback.
- Details: `THIRD_PARTY_NOTICES.md`. Static-site feasibility: `static_site/PLAN.md`.
