Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Specs — feature index

Status: Draft (reconstructed; no `tasks.md` — nothing is planned yet).

| # | Feature | Priority | Depends | Frontend | Backend | Evidence |
|---|---|---|---|---|---|---|
| 001 | render-core | P1 | 005 | Implemented | Implemented | `figure.py:65-380`, fast pytest 76 pass |
| 002 | cli | P1 | 001,004,005 | N/A (CLI) | Implemented | `cli.py:38-282`, `test_cli.py` pass |
| 003 | gradio-app | P1 | 001,004,005,006 | Implemented | Implemented | `gui/pages/sky.py`, `callbacks/skymap.py`, component/callback tests pass |
| 004 | geocoding-time | P1 | 005 | Implemented | Implemented | `nominatim.py`, `observer.py`, `test_nominatim.py` pass |
| 005 | data-cache | P1 | — | N/A | Implemented | `data/*.py`, catalog/constellation tests pass |
| 006 | share-static-viewer | P2 | 001 | Implemented (partial — 2 bun-runner failures, see introspec) | Implemented | `share/spec.py`, `test_spec.py` pass; static `bun test` 44 pass / 2 fail |

Statuses: Implemented = code path exists and runs (fast suite green 2026-09-29). Verified = never set — no passing e2e observed (`integration/test_smoke.py` timed out locally for lack of warm cache; CI runs it). `contracts/openapi.yaml` is N/A (no REST; see `docs/product/introspec.md`); per-feature `contracts/` hold the CLI/Gradio seam.
