# docs/site — truth table (dev-only, not shipped)

Built 2026-10-04 on `docs/site` from code @ `0580de6` + refreshed
`docs/product/brief.md`. Every behavior claim on the site must trace to a
row below. Statuses: Implemented / Partial / Planned / N/A.

## Features and stories

| Feature / story | Status | Evidence |
|---|---|---|
| View a shared sky (`#s=` → poster + figures + caption) | Implemented | `site/src/components/ViewerPage.tsx`, `site/src/lib/share.ts:72-105` |
| Corrupt/absent/wrong-version link states | Implemented | `ShareDecodeError`/`ShareVersionError` (`share.ts:28-40`), empty/legacy/invalid surfaces |
| Landing: coordinates \| place lookup, date/time/tz, appearance | Implemented | `site/src/components/LandingPage.tsx`, `site/src/lib/geocode.ts` |
| Pan/zoom/keyboard poster navigation + view controls | Implemented | `site/src/lib/view.ts`, `viewer.viewControls` keys (`en-US.ts:72-75`) |
| Copy share link; make-your-own seeds a draft | Implemented | `viewer.copyLink`, `viewer.makeYourOwn` (`en-US.ts:78-81`) |
| Export PNG / SVG / true-vector PDF, embedded font | Implemented | `site/src/lib/render/export.ts`, `ExportControls.tsx:58-160` |
| Export failure names format, map untouched | Implemented | `viewer.export.failed` + component test "surfaces an export failure" |
| Undrawable-title refuse (form) / strip-and-state (link) | Implemented | `site/src/lib/render/glyphs.ts`, `fontError.titleUnsupported/Adjusted` |
| Missing-font withhold (fail loudly, no fallback) | Implemented | BCR-0007, `ViewerPage.tsx:131-165`, `fontError.*` keys |
| `starsky catalog` / `cache warm` data build | Implemented | `src/starsky/cli.py:26-101` |
| R2 deploy + fitness gates (budgets, secrets, no-server, i18n, conformance) | Implemented (flat layout; versioned prefixes Planned) | `site_r2.yml:199-235`, `site_ci.yml:76-105`, `check_bundle_budget.sh` |
| Design system (tokens, atlas classes, i18n keys) | Implemented | `specs/000-design-system/tasks.md` 39/39 |
| Studio `#studio=` build-and-tune surface | Planned | `specs/006-viewer/tasks.md:81-108` all open; no `Studio*.tsx` in `site/src` |
| `pt-BR` locale for the product | Planned | D17; `en-US.ts:1-10` "exactly one locale here" |
| Versioned R2 prefixes + manifest + rollback drill | Planned | `specs/008-site-delivery/tasks.md` T003–T006/T018/T021 open |
| REST API / `contracts/openapi.yaml` | N/A | no server exists (ADR-0001) |
| Gradio app, Python renderer, HF Space | N/A (retired) | BCR-0001/0003/0005; must never appear as current |

## Docs pages and their source

| Page | Source | Maturity |
|---|---|---|
| Overview | brief.md + README.md:1-20 | Implemented |
| Install / quickstart | README.md:24-49 + `--help` output (generated, never hand-written) | Implemented |
| CLI reference | `python -m starsky --help` output (generated) | Implemented |
| Viewer + export guide | `ExportControls.tsx`, `ViewerPage.tsx`, e2e journeys | Implemented |
| Concepts / glossary | brief.md Glossary (shared vocabulary) | Implemented |
| Architecture + ADRs | `architecture.md`, `adr/0001-0005` | Implemented |
| Delivery / operations | `delivery.md` (honest flat-layout rollback) | Partial (R2 deploy blocked on token scope) |
| Roadmap | `specs/README.md` + per-feature `tasks.md` | Planned items labelled, never mixed into how-tos |

## No-invent list

Commands: `python -m starsky`, `starsky catalog`, `starsky cache warm`.
Flags: `--mag-limit` (default 6.5), `--output-dir` (default `site/public/data`), `--help`.
Env: `STARSKY__CATALOG__CACHE_DIR`, `STARSKY__LOG__LEVEL`, `VITE_BASE_PATH`, `VITE_FULL_APP_URL`.
R2 (names only): `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCOUNT_SECRET`,
`CLOUDFLARE_R2_ENDPOINT_S3_CLIENT`, `CLOUDFLARE_R2_BUCKET_ID`.
Fragments: `#s=` (canonical), `#studio=` (planned). URLs:
product `https://starsky.lucasvmigotto.me`, docs
`https://docs.lucasvmigotto.me/starsky`. Versions: product `1.1.2`
(`site/package.json` may lag the release tag; the tag is the source).
Error strings: quote from `en-US.ts` / `share.ts` only.
