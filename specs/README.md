Reconstructed by project:introspec on 2026-09-29; re-scoped by project:refactor (BCRs 0001–0005) into the static-first target.

# Specs — feature index

Status: `002` and `005` are **Implemented** (the CLI data tool ships today).
`006` is Implemented, `007` is **In progress** (renderer built, exports to wire),
`008` is Planned. `003` is retired. Nothing is Verified.

| # | Feature | Priority | Depends | Frontend | Backend | Notes |
|---|---|---|---|---|---|---|
| 000 | design-system | P2 | — | Planned | — | Reserved for `frontend:spec` |
| 002 | catalog-cli | P1 | 005 | N/A | Implemented | `starpy catalog` + `cache warm`; the CLI's whole product (BCR-0005) |
| 003 | — | — | — | — | — | **Retired by BCR-0001** (Gradio removed); see `003-gradio-app/DEPRECATED.md` |
| 005 | data-cache | P1 | — | N/A | Implemented | Hipparcos + Stellarium → parquet; ephemeris gone (BCR-0005) |
| 006 | viewer | P1 | 005 | Implemented | N/A | Landing + `#s=` viewer, share codec, place lookup |
| 007 | renderer-export | P1 | 006 | In progress | N/A | The browser is the sole renderer (ADR-0003); PNG/SVG/PDF exports to wire |
| 008 | site-delivery | P1 | 006, 007 | Planned | Planned | R2-only deploy, font bundling, budgets, fitness functions |

## Removed features

- `001-render-core` — the Python/matplotlib renderer, deleted by BCR-0005.
- `004-geocoding-time` — its Python half is dead (the browser calls Nominatim);
  place lookup lives in `006-viewer`.

## Status legend

- **Planned** — specified, no code yet.
- **In progress** — a build stage is working through its phases.
- **Implemented** — the code path exists and runs (evidence in the feature).
- **Verified** — e2e tests pass in CI. Nothing is Verified yet.

`contracts/openapi.yaml` remains **N/A** — the architecture has no API
(ADR-0001). The seams are `render-spec.json`, the `#s=` share payload, and the
exported JSON shapes documented in `002-catalog-cli/contracts/seam.md`.
