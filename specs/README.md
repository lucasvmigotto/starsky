Reconstructed by project:introspec on 2026-09-29 from 51287a7; restructured by project:spec on 2026-09-29 (branch `refactor/static-first-client`) against `docs/product/refactor.md`, accepted BCRs 0001–0004 and ADRs 0001–0005.

# Specs — feature index

Status: the target split is **Planned**; features 001/002/004/005 remain **Implemented** for their current code, and 006 is partly Implemented. Nothing is Verified (no passing e2e).

| # | Feature | Priority | Depends | Frontend | Backend | Notes |
|---|---|---|---|---|---|---|
| 001 | render-core | P1 | 005 | N/A | Implemented | Python CLI renderer, pinned byte-stable (BCR-0002 keeps it in sync) |
| 002 | cli | P1 | 001,004,005 | N/A | Implemented | `render`, `cache warm`, `export-static-data`; loses the Gradio default (BCR-0001) |
| 003 | — | — | — | — | — | **Retired by BCR-0001**: the Gradio app is removed. See `003-gradio-app/DEPRECATED.md` |
| 004 | geocoding-time | P1 | 005 | Planned (browser) | Implemented (CLI) | Browser already calls Nominatim (`site/src/lib/geocode.ts`); unified here |
| 005 | data-cache | P1 | — | N/A | Implemented | CLI data pipeline; feeds the site's `catalog.json`/`constellations.json` |
| 006 | viewer | P1 | 005, 007 | Implemented (partial) | N/A | Landing + `#s=` viewer, share codec; static TS |
| 007 | renderer-export | P1 | 006 | Planned | N/A | **New (BCR-0002)**: browser poster renderer + PNG/SVG/PDF exports, `render-spec.json` contract |
| 008 | site-delivery | P2 | 006, 007 | Planned | Planned | **New (BCR-0003/0004)**: R2-only delivery, font bundling, budgets and fitness functions |
| 000 | design-system | P2 | — | Planned | — | Reserved for `frontend:spec` (tokens, components, states, motion) |

Ordering is dependency-first, MVP first: **006 + 007 + 008** are the refactor's MVP (a static client that renders and exports); 001/002/005 keep the Python half honest; 004 covers place lookup.

`frontend:spec` owns `000-design-system`, `site/` UI layers and the `specs/007-*/ui.md`/`008-*/ui.md` layers. `backend:spec` owns the Python layers in 001/002/005.

`contracts/openapi.yaml` remains **N/A** — the architecture has no API (ADR-0001); the seams are `render-spec.json`, the `#s=` share payload and the exported JSON schemas.
