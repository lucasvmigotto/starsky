Reconstructed by project:refactor on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# starpy — refactor: target design and migration plan

Status: Draft (BCRs accepted 2026-09-29)

## Context and goals

Ranked goals (confirmed 2026-09-29): **new capability first** (browser poster rendering + PNG/SVG/PDF), then maintainability (one client stack + thin data CLI), then cost (no server). Constraints: solo, no freeze window; you are the sole BCR approver. No parallel feature work.

Inputs: `project:introspec` artifacts (`docs/product/{brief,architecture,domain-model,introspec}.md`, `specs/001..006/`), all present. No prior `retrofit.md`.

## 1. Baseline and safety net

- Baseline green 2026-09-29: `uv run pytest` **78 passed**; `ruff check`/`format --check` and `ty check` clean; `bun test` 44 pass / 2 fail (runner mismatch, see §3). Integration suite `-m integration` timed out locally on cold `de421.bsp`; CI runs it warm. [OBSERVED]
- Characterization coverage today: unit + render/caption/density/astro tests, share-codec tests, CLI tests, `render-spec.json` conformance (`static_site/src/lib/spec.test.ts`), integration determinism (byte-stable at 320 px). The safety net is adequate for the invariants below; **gaps to close in Slice 0**: a golden byte-hash of a CLI poster, and a browser↔CLI parallel-run harness.

## 2. Rule classification

| Rule | Class | Evidence | Owner |
|---|---|---|---|
| Poster visual tokens (bg `#0b0f19`, star `#f5efe0`, line `#b98a8a`, size `14·10^(m/-2.5)` clamp [0.6,14], glow ≤3.5, lines .7/.7, labels upper 7pt, ring, band 0.22) | **Core invariant** | `render-spec.json:6-42`; `figure.py:50-51,142-231` | you |
| Caption format (coords 4dp N/S/E/W; detail `coords — place · local tz`; title gates 2-line) | **Core invariant** | `caption.py:13-38` | you |
| Share codec (canonical JSON → zlib-9 → base64url-no-pad, `#s=`, payload v1) | **Core invariant** | `share/spec.py:20-45`; `render-spec.json:44-48` | you |
| Astronomy geometry (north-up unit disc; horizon `alt>0`; stereographic `cos/(1+sin)`; fisheye `((90-alt)/90)^s`) | **Core invariant** | `astro/projection.py:22-55`; `figure.py:65-111` | you |
| CLI render output byte-stability | **Core invariant** (pinned) | `cli.py:147-165`; `tests/integration/test_smoke.py:34-74` | you |
| Input validation bounds (lat/lon, fisheye (0,3], separation [0,0.1], mag [1,8], glow [0,3]) | **Core invariant** | `schemas/inputs/{location,render}.py` | you |
| Attribution/licences (OSM, Hipparcos, Stellarium CC BY-SA, font OFL) | **Core invariant** (legal) | `THIRD_PARTY_NOTICES.md`; GUI footer | you |
| Gradio UI is the canonical poster creator | **Business policy** → BCR-0001/0002 | `gui/pages/sky.py`; `PLAN.md:45-61` | you |
| HF Space hosting | **Business policy** → BCR-0003 | `hf_spaces.yml`; `hf.Dockerfile` | you |
| Static viewer reduced feature set (stereographic, mag ≤ 5.5, no vector) | **Business policy** → BCR-0002 | `static_site/PLAN.md:45-61` | you |
| Silent font fallback to DejaVu | **Business policy** → BCR-0004 | `data/fonts.py:27-55`; `figure.py:50` | you |
| GUI separation slider max 0.05 vs schema max 0.1 | **Accidental** — verdict: fix (align to 0.1 or to 0.05, decide in Slice 3) | `gui/components/sky.py:129-138` vs `schemas/inputs/render.py:10-20` | you |
| `bun test` cannot run two vitest `vi`-based cases | **Accidental** — verdict: fix (port to `bun:test`, §Slices) | `static_site/src/lib/geocode.test.ts:43,79` | you |
| `tests/golden/` exists but the `golden` marker is unused | **Accidental** — verdict: fix (used from Slice 0) | `pyproject.toml:49-54`; `tests/golden/` | you |
| `static_site/PLAN.md` Option C now contradicts the target | **Accidental** — verdict: supersede via note (BCR-0002) | `PLAN.md:45-61` | you |
| `FONT_STACK` silently choosing DejaVu | **Accidental** — verdict: fix (BCR-0004) | `figure.py:50` | you |

Core list confirmed by you 2026-09-29.

## 3. Findings (by angle, with evidence and cost)

**Code.** Two full implementations of one spec (Python `render/*` vs TS `skymodel/astro/spec`) is the dominant duplication — the source of the parity burden. Churn hotspots: `tests/ci/test_space_artifact.py`, `static_r2.yml`, `ci.yml`, `README.md`, `hf.README.md`, `geocoding/nominatim.py`, `src/starpy/cli.py` (`git log --name-only`). Coupling is low otherwise (functional core + thin shell). Dead-on-arrival after BCR-0001/0003: `gui/`, `main.py`, `app.py`, `settings/{gradio,hf}.py`, `tests/gui/*`, `tests/ci/*`, `requirements.txt`, `scripts/{publish_space,export_space_requirements}.sh`. Cost to remove: low.

**Architecture.** As-is is a two-front-end monolith (Gradio + CLI) sharing a functional core, plus a static viewer. Target removes the server runtime entirely. `project:architecture` review mode should formalize ADR files (see §4); `docs/product/architecture.md` currently holds as-is only.

**Data.** No DBMS; no integrity or migration risk. Contract surfaces are `render-spec.json`, the share payload (`v1`), and the exported `catalog.json`/`constellations.json` schemas. Cost of change: low; must keep payload v1 backward-compatible.

**Operations.** Cold start downloads ~30 MB + catalog + font; silent font fallback; integration depends on JPL/Nominatim network. Removing Gradio/OIDC-HF simplifies runbooks and secrets. Cost: low.

**Security.** No auth, default bind `0.0.0.0:8080` — eliminated by removing the server (BCR-0001). Supply chain: images tag-pinned not digest-pinned; `requirements.txt` becomes unnecessary. A `project:retrofit` dependency/security pass is not yet run; recommend it after the refactor.

**Business.** The real workflow limitation is that the *artifact* (poster, vector) needs a Python server; the browser-renderer change addresses it directly. The static viewer's reduced feature set and the "link out to the full app" pattern are the policies to replace.

## 4. Target design

In three lines: **A static, client-only product** — React (latest) + TypeScript 7 on Bun, built by Vite and served from R2, which renders the poster and exports PNG/SVG/PDF with the Cormorant Garamond font bundled; **Python 3.14 is a build-time/CLI tool only** (`render`, `cache warm`, `export-static-data`) whose output is pinned byte-stable and shares `render-spec.json` with the client; **no server, no Gradio, no HF Space.**

Draft ADRs (to be formalized as files under `docs/product/adr/` by `project:architecture` review mode):

- **ADR-1 — Static-first, no runtime server.** Context: self-hosted single-user tool; the only server need was Gradio. Decision: client-only runtime; Python at build/CLI time. Consequences: no auth/bind risk, near-zero cost; browser must own rendering and exports.
- **ADR-2 — `render-spec.json` is the single normative render contract.** Both renderers conform; conformance is tested. Consequences: parity is enforceable; changing the spec is a reviewed change.
- **ADR-3 — R2-only hosting; data served same-origin.** ~100 KB brotli catalog; avoids CORS and a second service. Bucket/dataset hosting deferred.
- **ADR-4 — TypeScript 7 (native `tsgo`) + Bun (package manager, runtime, `bun:test`), React latest.** One toolchain; drop Vitest and its runner mismatch.
- **ADR-5 — Bundle the font; no silent fallback.** Guarantees typography and self-contained SVG/PDF.

## 5. Slices (each independently shippable and reversible)

Seam: **branch by abstraction inside the client** (a `Renderer` module interface; the preview is the old implementation, the poster renderer the new, switched by flag) plus **strangler on the deploy surface** (the R2 client is already the new path; Gradio is the old path removed last). No DB, so no expand/migrate/contract data moves.

**Slice 0 — Pin the contract and the safety net.** Freeze `render-spec.json` semantics; add a golden byte-hash of one CLI poster (use the `golden` marker) and a browser↔CLI comparison harness. Verify: existing 78 tests + new goldens green. Cutover: none. Rollback: revert. *First slice to build.*

**Slice 1 — Toolchain: TypeScript 7, React latest, Bun, `bun:test`.** Upgrade `tsconfig`, Vite, ESLint, port the 9 test files off `vi`, switch CI to `bun test`. No behavior change. Verify: `bun test` all green, `vite build` OK, CI green. Rollback: revert branch.

**Slice 2 — Bundle the font (BCR-0004).** Vendor the font, make `ensure_font` use it and fail loudly; client embeds it. Verify: offline render uses Cormorant Garamond; SVG/PDF embed the font. Rollback: flag back to DejaVu.

**Slice 3 — Browser poster renderer (BCR-0002), flagged.** Implement high-DPI poster render behind `?renderer=poster`; default stays preview. Verification: parallel run vs CLI over a fixed matrix, quantify pixel/SVG diffs. Rollback: keep preview default.

**Slice 4 — Exports PNG/SVG/PDF (BCR-0002).** Canvas `toBlob` PNG; SVG DOM; true-vector PDF via `svg2pdf.js`/jsPDF. Verify: exports open, caption/stars correct, no rasterised text in PDF. Rollback: hide export buttons.

**Slice 5 — Client canonical; remove Gradio (BCR-0001).** Flip the default renderer to poster; delete `gui/`, `main.py`, `app.py`, `settings/{gradio,hf}.py`, `tests/gui/*`, the `gradio` dep; `python -m starpy` prints help. Verify: CLI tests green, no `gradio` import, no port opened. Cutover: R2 already serves the client. Rollback: redeploy previous R2 build; Gradio removable only after the default flip proves stable.

**Slice 6 — Decommission HF Space and leftovers (BCR-0003).** Delete `hf.*`, `hf_spaces.yml`, `scripts/{publish_space,export_space_requirements}.sh`, `requirements.txt`, `tests/ci/*`; retarget the client's "full app" link. Verify: `grep huggingface` empty; `uv sync`/Docker build without `requirements.txt`; R2 deploy green. Rollback: restore files (kept in git history).

**Slice 7 — Docs and spec reconciliation.** Update `README.md`, `PLAN.md` (supersede note), `THIRD_PARTY_NOTICES.md`; retire `specs/003-gradio-app`; split `006` into viewer + renderer/export; update `specs/README.md` statuses; `brief.md`/`domain-model.md` context removal via their owners or `[UPSTREAM GAP]` notes.

## 6. Risks

- **Renderer parity** — the biggest risk; mitigated by pinning the spec in Slice 0 and parallel-running before the Slice 5 flip.
- **Desktop-print fidelity for PDF/SVG** — true-vector PDF and font embedding can differ across viewers; test in Chrome/Firefox and a PDF reader.
- **TypeScript 7 migration** — a real compiler change; Slice 1 is isolated and reversible.
- **Spec drift** — enforced by conformance tests.

## Coverage checklist

- [x] baseline green; characterization tests cover the critical paths (gaps named for Slice 0)
- [x] every rule classified; the core-invariant list confirmed by the user
- [x] findings across code, architecture, data, operations, security and business, each with evidence
- [x] every business change is a BCR with a decision (0001–0004 accepted 2026-09-29); nothing unapproved in the plan
- [~] target design with ADRs — drafted here (§4); formal ADR files are `project:architecture` review-mode's job (next stage)
- [x] slices independently shippable and reversible, each with seam, verification, cutover and rollback
- [x] every data move has a backfill/contract step — N/A, no database; contract steps named for the share payload and exported JSON
- [ ] core invariants tested at every slice; parallel runs where risk is high (set up in Slice 0, run in Slice 3)
- [x] the old paths' decommissioning is planned (Slices 5–6), not left for later

## Handoff

Core invariants confirmed. BCRs **proposed, awaiting your accept/reject**: 0001 remove Gradio UI, 0002 browser canonical renderer + exports, 0003 retire HF Space, 0004 bundle font. Target in three lines: static client-only on R2 with browser rendering/export; Python CLI/data-tool only; `render-spec.json` shared. First slice to build: **Slice 0 (pin contract + safety net)**, then Slice 1 (TS7/Bun). Biggest risk: browser↔CLI renderer parity. Next stage after approval: `project:architecture` (review → ADR files), then `project:spec` for the first slices' features. Commits follow `git:workflow`.
