# AGENTS.md — working on starsky

Static, client-only night-sky poster studio. The browser (`site/`) is the
sole renderer; Python (`src/starsky/`) only builds the sky data. No server,
no database, no accounts. Docs site lives in `docs/site/`.

## Commands

```bash
uv sync --all-groups
uv run python -m starsky cache warm      # parquet caches (network)
uv run python -m starsky catalog         # writes site/public/data/*.json
uv run ruff check src tests scripts/check_no_server.py
uv run ruff format --check src tests scripts/check_no_server.py
uv run ty check src tests
uv run pytest -q
uv run python scripts/check_no_server.py
uv run python scripts/check_workflow_schema.py

cd site && bun install
cd site && bun run lint && bun run typecheck && bun run test && bun run build
cd docs/site && bun install
cd docs/site && bun run lint && bun run typecheck && bun run test && bun run build
# e2e (Playwright container image provides browsers; never host-install):
cd site && bun run test:e2e
cd docs/site && bun run test:e2e   # run as `bun run test:e2e`, not `bun test`
```

`bun test` discovers `*.spec.*` too: `site/` scopes it via `bunfig.toml`
(`root = "./src"`); `docs/site` scopes it via `bun test src scripts`.
`site/` reference-image tests need `site/public/data/*.json` built first
(CI builds it; `bun test src` locally skips nothing — build the data).

## Layout

- `src/starsky/` — CLI (`catalog`, `cache warm`) + parquet data loaders.
  Opens no socket, renders nothing.
- `site/` — React 19 + TS 7 (`tsgo`) + Vite 6 + Tailwind 4 product app.
  `render-spec.json` is the normative render contract (one implementation).
- `docs/site/` — React docs site (en + pt-BR), Markdown + `llms.txt`
  generated from the same typed content (`scripts/generate_llms.ts`).
- `specs/` — feature specs + `tasks.md` (status in `specs/README.md`).
- `docs/product/` — brief, architecture + `adr/`, ux-vision, delivery,
  refactor + `bcr/`, test-strategy. Truth sources for docs pages.
- `.github/workflows/` — `ci.yml` (Python), `site_ci.yml`,
  `site_e2e.yml`, `site_r2.yml` (product → starsky bucket, domain root),
  `site_docs.yml` (docs → docs bucket, `/starsky/` prefix), security,
  release, registries.

## Conventions

- Conventional Commits (`fix(site): …`); one branch per phase or fix,
  branched off `main` (`origin/dev` is far behind — see delivery.md);
  ask before merging, pushing, or opening PRs. Never commit to `main`
  directly; never `--no-verify`; never add co-author trailers.
- TypeScript imports keep their `.ts`/`.tsx` extensions
  (`allowImportingTsExtensions`); `noUncheckedIndexedAccess` is on —
  index access returns `T | undefined`, handle it, don't assert it away.
- Strict ESLint (`no-unnecessary-condition`, no void-return shorthand):
  `import.meta.env.*` is fully typed — no `?.`/`??` on it.
- **HashRouter takes no `basename`** — the host prefix lives in the URL
  pathname via Vite `base`; a basename looks inside the hash and blanks
  pages (fixed once in `fb9cfcb`, relearned in docs).
- Product `site/`: no raw hex/rgb or inline user-visible copy in
  components (custom ESLint rules) — tokens in
  `site/src/design/tokens.ts`, copy in `site/src/i18n/en-US.ts`, which
  must agree with `docs/product/ux-vision.md` both ways
  (`site/scripts/check_i18n_keys.py`).
- Docs `docs/site/`: content in `src/content/{en,pt}.ts` (same shape both
  locales — a missing translation is a type error); new pages go in
  `src/content/pages.ts` registry; maturity badges on pages, maturity
  labels inline in generated Markdown.
- R2 deploys: per-site bucket variables
  (`..._BUCKET_STARSKY` / `..._BUCKET_DOCS`), `index.html` uploads last,
  `llms.txt`/`.md` as `text/plain`/`text/markdown` no-cache. Token needs
  ListObjects on both buckets.
- Secrets appear only as variable/secret names, never values.
