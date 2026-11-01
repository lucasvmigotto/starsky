Reconstructed by project:introspec on 2026-09-29; re-scoped by project:refactor (BCRs 0001–0005) into the static-first target.

# Specs — feature index

Status: `000`, `002`, `005`, `006`, `007` and `009`–`016` are **Implemented**
(on `dev`; promotion to `main` is pending). `008` is **In progress** (T002 done,
deploy and budgets underway; versioned prefixes, smoke test and drills open).
`017` is **In progress** (hardening, #55). `003` is retired. Nothing is Verified.

| # | Feature | Priority | Depends | Frontend | Backend | Notes |
|---|---|---|---|---|---|---|
| 000 | design-system | P2 | — | Implemented | — | Tokens, atlas, i18n + guards; 39/39 tasks. `spec.md` header reconciled 2026-10-01 |
| 002 | catalog-cli | P1 | 005 | N/A | Implemented | `starsky catalog` + `cache warm`; the CLI's whole product (BCR-0005) |
| 003 | — | — | — | — | — | **Retired by BCR-0001** (Gradio removed); see `003-gradio-app/DEPRECATED.md` |
| 005 | data-cache | P1 | — | N/A | Implemented | Hipparcos + Stellarium → parquet; ephemeris gone (BCR-0005) |
| 006 | viewer | P1 | 005 | Implemented | N/A | Landing + `#s=` viewer, share codec, place lookup |
| 007 | renderer-export | P1 | 006 | Implemented | N/A | The browser is the sole renderer (ADR-0003); exports wired, `Site e2e` green on `main`; reference-regen deferred to 008 (`finding-reference-drift.md`) |
| 008 | site-delivery | P1 | 006, 007 | In progress | N/A | R2-only deploy, font bundling, budgets, fitness functions; T002 done |
| 009 | sky-domain | P1 | 005 | Implemented | N/A | Camera, observer, scene, `#e=`, star names, measured precision (BCR-0011, ADR-0006) |
| 010 | explorer-canvas | P1 | 009 | Implemented | N/A | Canvas 2D renderer, navigation, selection behind `#e=` (ADR-0007) |
| 011 | explorer-ui | P1 | 010 | Implemented | N/A | Inspector, search, adaptive metadata, toolbar, layers, responsive layout, live link |
| 012 | poster-studio | P1 | 011 | Implemented | N/A | Studio surface, Explorer and Viewer links, 9:16 export (BCR-0011, BCR-0012) |
| 014 | explorer-polish | P1 | 012 | Implemented | N/A | Idle collapse, horizon list, copy icon, star tooltip, brighter stars, controls, panel tab, rounder corners (lands before 013) |
| 015 | visual-identity | P1 | 014 | Implemented | N/A | Bundled UI font, icon buttons, sliding panel, image-only poster page, one layout language (BCR-0013; lands before 013) |
| 013 | location-first | P1 | 015 | Implemented | N/A | Map-first landing: search, lazy Leaflet map, coordinates, moment, opens the Explorer, `#c=` link; Studio on one screen (ADR-0008) |
| 016 | square-fill | P1 | 013 | Implemented | N/A | Square poster fills the square, inscribed in the horizon (BCR-0014) |
| 017 | hardening | P1 | 009–016 | In progress | N/A | Accessibility, failure, performance, stability, strict indexing, docs (#55) |

## Removed features

- `001-render-core` — the Python/matplotlib renderer, deleted by BCR-0005.
- `004-geocoding-time` — its Python half is dead (the browser calls Nominatim);
  place lookup lives in `006-viewer`.

## Status legend

- **Planned** — specified, no code yet.
- **In progress** — a build stage is working through its phases.
- **Implemented** — the code path exists and runs (evidence in the feature).
- **Verified** — e2e tests pass in CI. Nothing is Verified yet.

`contracts/openapi.yaml` remains **N/A**, re-verified 2026-11-01: the
architecture has no API (ADR-0001), the repo has no server route, and the only
outbound calls are to third-party OpenStreetMap services (Nominatim, tiles;
ADR-0008), which we consume and don't define. `asyncapi.yaml` is N/A too, since
no events leave the browser. The seams are:

- `render-spec.json`, the poster render contract.
- The four versioned URL fragments, `#s=`, `#studio=`, `#e=` and `#c=`, whose
  invariants are in `docs/product/domain-model.md` (Links context).
- The exported JSON shapes (`catalog.json`, `constellations.json`,
  `names.json`) documented in `002-catalog-cli/contracts/seam.md`.
