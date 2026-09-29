# ADR-0001 — Static-first: no runtime server

Status: proposed
Date: 2026-09-29
Deciders: lucas

## Context and drivers

The product is a self-hosted, single-user night-sky poster generator. Today its only server is the Gradio UI (`src/starpy/main.py`, bound `0.0.0.0:8080` by default) and the CLI/rendering core already runs headless. Ranked drivers: **correctness** of the poster, **offline/self-contained** runtime, **cost** (free tier), 99.9 % availability, resilience to viral spikes.

## Considered options

1. **Keep Gradio as the interactive surface** — a server process, an unauthenticated UI, cold starts, a host to operate.
2. **Add an API (FastAPI/BFF) and keep a hosted renderer** — preserves Python fidelity, but reintroduces hosting cost, CORS/secrets, and an origin that can fall over under a spike. Rejected earlier in `site/PLAN.md:63-69`.
3. **Static-first: the browser is the only runtime; Python is a build-time/CLI tool** (chosen).

## Decision outcome

Adopt option 3. One deployable (a Vite-built React/TS bundle + JSON data + font) on a CDN; no server process, no database, no identity. The browser renders the poster and exports PNG/SVG/PDF (BCR-0002) and is the only renderer (ADR-0003, BCR-0005); Python 3.14 is a data CLI — `starpy catalog` and `starpy cache warm` — with no renderer and no server.

## Consequences

Good: removes the unauthenticated bind surface; free-tier and originless, so availability rides the CDN SLA and viral spikes are absorbed; offline viewing/export; one runtime to maintain.

Bad: the browser must reach parity with matplotlib for poster quality (the main effort and risk); no server-side telemetry or rate limiting on rendering; the client bundle and data become the performance budget.

## Confirmation

CI proves `python -m starpy` opens no socket and no module imports `gradio`; the R2 deploy serves the full workflow; the parity harness passes before the default flip.
