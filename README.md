# 🔭 starpy — personalized night-sky posters

A static, client-only night-sky poster generator. The **site** (`site/`) is the
whole application: it renders the poster in the browser and exports PNG, SVG and
PDF. The **CLI** is a small Python tool that builds the sky data the site
fetches — nothing more.

Open source, no server, no database, no accounts. Python 3.14 + Polars, `uv`;
React + TypeScript 7 + Bun; deployed to Cloudflare R2.

## How it fits together

```
Hipparcos catalog ─┐
                   ├─ starpy (CLI) ──► catalog.json, constellations.json ──┐
Stellarium IAU ────┘                                                      │
                                                                          ▼
                                       site/ (React + TS) ──► poster PNG / SVG / PDF
```

The browser does its own astronomy (alt/az from right ascension and declination)
and its own place lookup (Nominatim), so the CLI never renders and never serves
anything.

## CLI — build the sky data

```bash
uv sync --all-groups
uv run python -m starpy cache warm      # download catalog + lines into the cache
uv run python -m starpy catalog         # write site/public/data/*.json
```

`catalog` flags: `--mag-limit` (default 6.5) and `--output-dir` (default
`site/public/data`). Bare `python -m starpy` prints help and opens no socket.

## Site — development

```bash
cd site
bun install
bun run dev          # Vite dev server
bun run test         # bun:test
bun run typecheck    # TypeScript 7 (tsgo)
bun run lint
bun run build
```

The site reads `render-spec.json` for all visual tokens — colours, star sizing,
glow, lines, labels, ring, caption, and the unit contract (`units.referenceDpi`).
That file is the renderer's normative contract; there is no second renderer.

## Configuration

`STARPY__<SECTION>__<KEY>` (see `.env.example`):

| Key | Purpose |
| --- | --- |
| `STARPY__CATALOG__CACHE_DIR` | Where the Hipparcos and Stellarium parquet caches live. |
| `STARPY__LOG__LEVEL` | CLI log level. |

## Docker

The image is a one-shot data job, not a service:

```bash
docker build -t starpy .
docker run --rm -v "$PWD/out:/out" starpy    # writes catalog.json + constellations.json
```

Without DHI access, build with the public fallback:

```bash
docker build -t starpy \
  --build-arg BUILDER_IMAGE=ghcr.io/astral-sh/uv:python3.14-trixie \
  --build-arg RUNTIME_IMAGE=python:3.14-slim-trixie .
```

Runtime runs as UID/GID 65532.

## CI/CD

| Workflow | Purpose |
| --- | --- |
| `ci.yml` | ruff, `ty`, pytest, and a real `cache warm` + `catalog` build asserting the JSON shape. |
| `site_ci.yml` | site lint, `tsgo` typecheck, `bun test`, build. |
| `site_r2.yml` | build + deploy the site to Cloudflare R2 on `main`. |
| `ghcr.yml` / `dockerhub.yml` | publish the CLI image. |
| `release.yml` | tag and release. |

Secrets are by name only: `CLOUDFLARE_R2_ACCOUNT_ACCESS_KEY`,
`CLOUDFLARE_R2_ACCOUNT_SECRET`, `CLOUDFLARE_R2_ENDPOINT`,
`CLOUDFLARE_R2_BUCKET`, `DOCKER_HUB_PAT`.

## Dev

```bash
uv run ruff check src tests && uv run ruff format --check src tests
uv run ty check src tests
uv run pytest -q
```

### Import style (enforced in CI)

No `import x` / `import x as y`, no module attribute access. Every name arrives
via an explicit from-import, namespaced with its module when it was previously
reached attributively. Checked by `scripts/check_declarative_imports.py`.

## Attribution

- Geocoding © OpenStreetMap contributors (Nominatim usage policy) — called from
  the browser.
- Stars: Hipparcos Catalogue (ESA); constellation lines: Stellarium IAU
  skyculture (CC BY-SA 4.0).
- Font: Cormorant Garamond (SIL OFL 1.1), bundled in `assets/fonts/`.
- Details: `THIRD_PARTY_NOTICES.md`.
