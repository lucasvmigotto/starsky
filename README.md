# 🔭 starsky — personalized night-sky posters

A static, client-only night-sky explorer and poster studio. The **site**
(`site/`) is the whole application: it renders the sky in the browser, lets you
explore it, and exports posters as PNG, SVG and PDF. The **CLI** is a small
Python tool that builds the sky data the site fetches — nothing more.

Open source, no server, no database, no accounts. Python 3.14 + Polars, `uv`;
React + TypeScript 7 + Bun; deployed to Cloudflare R2.

## What it does

The flow is **landing → Explorer → export**.

1. **Landing.** "Where do you want to explore the sky from?" Search for a place
   (Enter, the search button, or leaving the field — never as you type) or
   switch to coordinates; an always-visible OpenStreetMap map shows the place
   and accepts a click or a dragged pin. Add an optional title, a date, time and
   timezone, and a limiting magnitude under Advanced. **Explore this sky** opens
   the Explorer.
2. **Explorer** (`#e=`). A navigable sky on Canvas 2D: drag to look around, zoom
   from 5° to 120°, switch layers, inspect stars and constellations, search.
   Objects below the horizon are never presented as observable.
3. **Poster Studio** (`#studio=`). Choose projection, square or circle (a square
   fills the square), fisheye strength, minimum separation, glow and title with a
   live preview, then export PNG, SVG or PDF in the standard or the 9:16 story
   (1080×1920) layout.
4. **Poster page** (`#s=`). A shared link renders the exact poster, with share,
   export, "Explore this sky" and "Make your own".

## Languages

The interface speaks **English (en-US)** and **Brazilian Portuguese (pt-BR)**.
The first visit follows the browser language; the switcher in the footer changes
it, and the choice is remembered on that browser only. The **poster language** is
the creator's choice in the Studio (defaulting to the interface language) and
travels in the link, so a recipient sees the same poster whatever their browser
speaks. A link without a language is an English poster, as every link before it
was. Constellation and star names, coordinates and the data credits are never
translated.

## Links

State lives in the URL fragment, so the same link shows the same sky to everyone.
There are four versioned fragments:

| Fragment | Opens | Holds |
| --- | --- | --- |
| `#c=` | the landing, pre-filled | place, coordinates, moment, title, limiting magnitude, poster language (tolerant per field) |
| `#e=` | the Explorer | the scene plus camera, field of view, layers, selection, poster language |
| `#studio=` | the Poster Studio | a poster draft (same codec as `#s=`), with its poster language |
| `#s=` | the poster page | the finished poster with its poster language; byte-compatible with every link since v1 |

## OpenStreetMap and privacy

Place search (Nominatim) and the landing map (OpenStreetMap tiles) run from the
visitor's browser and follow the OpenStreetMap policies: no autocomplete, at
most one request per second, a per-session cache, tiles for the visible view
only, and attribution always shown. starsky keeps no record of visitors and has no accounts,
and links carry their payload in the URL fragment, which never reaches the host.
The one disclosure: OpenStreetMap sees the visitor's IP address when they search
or view the landing map, explained on the Privacy page (`#privacy`, linked from
the landing map hint). Coordinates always work without either service.

## How it fits together

```
Hipparcos catalog ─┐
                   ├─ starsky (CLI) ──► catalog.json, constellations.json, names.json ──┐
Stellarium IAU ────┘                                                                   │
                                                                                       ▼
                                          site/ (React + TS) ──► Explorer, poster PNG / SVG / PDF
```

The browser does its own astronomy (alt/az from right ascension and declination)
and its own place lookup (Nominatim), so the CLI never renders and never serves
anything.

## CLI — build the sky data

```bash
uv sync --all-groups
uv run python -m starsky cache warm      # download catalog, lines and names into the cache
uv run python -m starsky catalog         # write site/public/data/*.json
```

`catalog` writes `catalog.json` (stars), `constellations.json` (figure lines) and
`names.json` (HIP-keyed star names).

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

### Site build variables

Read by Vite when the site is built, so they are fixed per deploy (set them in
the build step's environment):

| Variable | Purpose |
| --- | --- |
| `VITE_DEFAULT_PLACE`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LON` | The place the landing starts at. All three or none; an incomplete, non-numeric or out-of-range set is ignored. Default: São Bernardo do Campo, SP, Brazil (-23.6914, -46.5647). |
| `VITE_BASE_PATH` | URL prefix the site is served under (`/` at the domain root). |
| `VITE_FULL_APP_URL` | Absolute product origin for the OG and Twitter image URLs. |

> **Renamed from `starpy` (BCR-0009).** The project, the Python package and the
> environment prefix were renamed when Python stopped being the protagonist: the
> browser is the whole application now, and Python only builds its sky data.
> **`STARPY__*` variables are no longer read** — update your `.env` to
> `STARSKY__*`. The name change was deliberate and has no compatibility alias.

## Docker

The image is a one-shot data job, not a service:

```bash
docker build -t starsky .
docker run --rm -v "$PWD/out:/out" starsky    # writes catalog.json, constellations.json, names.json
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
| `site_ci.yml` | site lint, typecheck, i18n agreement, tests, build and budgets. |
| `site_e2e.yml` | Playwright journeys on Chromium and Firefox. |
| `site_r2.yml` | rebuild, verify and deploy the product to R2 on `main`. |
| `site_docs.yml` | verify and deploy the docs site (`docs/site/`) to its own bucket. |
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

- Map and places © OpenStreetMap contributors (ODbL): Nominatim search and map
  tiles, called from the browser under their usage policies.
- Stars: Hipparcos Catalogue (ESA); constellation lines: Stellarium IAU
  skyculture (CC BY-SA 4.0).
- Font: Cormorant Garamond (SIL OFL 1.1), bundled in `assets/fonts/`.
- Details: `THIRD_PARTY_NOTICES.md`.
