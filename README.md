# 🔭 starsky — personalized night-sky posters

A static, client-only night-sky poster generator. The **site** (`site/`) is the
whole application: it renders the poster in the browser and exports PNG, SVG and
PDF. The **CLI** is a small Python tool that builds the sky data the site
fetches — nothing more.

Open source, no server, no database, no accounts. Python 3.14 + Polars, `uv`;
React + TypeScript 7 + Bun; deployed to Cloudflare R2.

## How it fits together

```
Hipparcos catalog ─┐
                   ├─ starsky (CLI) ──► catalog.json, constellations.json ──┐
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
uv run python -m starsky cache warm      # download catalog + lines into the cache
uv run python -m starsky catalog         # write site/public/data/*.json
```

`catalog` flags: `--mag-limit` (default 6.5) and `--output-dir` (default
`site/public/data`). Bare `python -m starsky` prints help and opens no socket.

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

`STARSKY__<SECTION>__<KEY>` (see `.env.example`):

| Key | Purpose |
| --- | --- |
| `STARSKY__CATALOG__CACHE_DIR` | Where the Hipparcos and Stellarium parquet caches live. |
| `STARSKY__LOG__LEVEL` | CLI log level. |

> **Renamed from `starpy` (BCR-0009).** The project, the Python package and the
> environment prefix were renamed when Python stopped being the protagonist: the
> browser is the whole application now, and Python only builds its sky data.
> **`STARPY__*` variables are no longer read** — update your `.env` to
> `STARSKY__*`. The name change was deliberate and has no compatibility alias.

## Docker

The image is a one-shot data job, not a service:

```bash
docker build -t starsky .
docker run --rm -v "$PWD/out:/out" starsky    # writes catalog.json + constellations.json
```

Without DHI access, build with the public fallback:

```bash
docker build -t starsky \
  --build-arg BUILDER_IMAGE=ghcr.io/astral-sh/uv:python3.14-trixie \
  --build-arg RUNTIME_IMAGE=python:3.14-slim-trixie .
```

Runtime runs as UID/GID 65532.

## CI/CD

| Workflow | Purpose |
| --- | --- |
| `ci.yml` | ruff, `ty`, pytest, and a real `cache warm` + `catalog` build asserting the JSON shape. |
| `static_r2.yml` | site lint, `tsgo` typecheck, `bun test`, build, and deploy to R2 on `main`. |

| `ghcr.yml` / `dockerhub.yml` | publish the CLI image. |
| `release.yml` | tag and release. |

Deploy config is by name only. The R2 identifiers are repository **variables**;
only the secret is a secret:

| Name | Kind |
|---|---|
| `CLOUDFLARE_R2_ACCOUNT_ID` | variable (the access-key id) |
| `CLOUDFLARE_R2_ACCOUNT_SECRET` | secret |
| `CLOUDFLARE_R2_ENDPOINT_S3_CLIENT` | variable |
| `CLOUDFLARE_R2_BUCKET_ID` | variable |
| `DOCKER_HUB_PAT` | secret |

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
