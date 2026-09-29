# Implementation Plan: site-delivery

**Branch**: `feat/site-delivery` | **Date**: 2026-09-29 | **Spec**: `specs/008-site-delivery/spec.md`

**Input**: Feature specification from `specs/008-site-delivery/spec.md`

## Summary

Make R2 the only host, bundle the font, and enforce the architecture's fitness
functions in CI. Delivered in refactor slices 2 (font), 6 (decommission HF) and
7 (delivery hardening).

## Technical Context

**Language/Version**: Bun + TypeScript 7 + React (latest) + Vite for the client; Python 3.14 + `uv` for the data export.

**Primary Dependencies**: Bun/Vite build, `cheerio`-free secret scan or `grep`-based scan, Cloudflare R2 (S3 API) for sync; GitHub Actions.

**Storage**: R2 bucket — immutable asset prefixes + versioned data prefix; no database.

**Testing**: `bun test` (client), `pytest` (data export), CI fitness-function checks; `qa:e2e` for the deployed journey.

**Target Platform**: Cloudflare CDN + R2 (free tier); evergreen browsers.

**Project Type**: static web application + Python CLI data tool.

**Performance Goals**: first visit ≤ 0.7 MB brotli; LCP within the CDN's normal range; no origin compute.

**Constraints**: free tier only; atomic deploy; rollback by prefix re-point; no secrets in the bundle.

**Scale/Scope**: modelled viral spike ~8 req/s edge; 10× check watches R2 operation counts and CI minutes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check |
|---|---|
| I. Static-first, no server | PASS — deploy target is R2/CDN only; no-server fitness function added |
| II. One normative render contract | PASS — the data export and bundle carry `render-spec.json`; conformance runs in CI |
| III. Determinism and correctness | PASS — bundled font; build fails without it; offline render fitness function |
| IV. Test-first, evidence-backed | PASS — fitness functions are the acceptance tests; status stays Planned until CI enforces them |
| V. Zero-cost delivery | PASS — free-tier R2 + Actions; budgets enforced in CI |
| VI. Accessible, self-contained client | PASS — no third-party asset requests; WCAG target restated |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-site-delivery/
├── plan.md
├── data-model.md
├── contracts/
│   └── delivery.md        # deploy, cache, rollback, fitness functions
└── tasks.md               # generated later
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml                 # Python + data export + golden
├── site_ci.yml            # NEW: bun test, build, budgets, secret scan
└── site_r2.yml            # renamed from static_r2.yml; atomic deploy + rollback note

site/
├── public/fonts/          # NEW: bundled Cormorant Garamond (woff2/otf) + OFL
└── src/lib/tokens.ts      # reads render-spec.json

scripts/
└── check_bundle_budget.sh # NEW: size + secret scan

assets/fonts/              # NEW: shared font for Python CLI + site
```

**Structure Decision**: keep the existing two-module layout (`site/` client,
`src/starpy/` CLI); add one shared font location and CI checks. No new service.

## Complexity Tracking

No violations.
