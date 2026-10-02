# Tasks: site-delivery

Feature: `008-site-delivery` | Branch: `feat/site-delivery` | Input: `specs/008-site-delivery/`

Tests are required for every story (constitution IV); the fitness functions are
the story-level acceptance tests.

## Phase 1: Setup

- [ ] T001 [P] Add `assets/fonts/` with Cormorant Garamond (woff2 + otf) and its OFL licence

## Phase 2: User Story 1 — Deploy to R2 from CI (P1) 🎯 MVP

- [x] T002 [P] [US1] Rename `static_r2.yml` to `site_r2.yml`; update paths (`site/**`) and job references. Done — `git mv`, and the workflow's `name`, `concurrency` group and both self-referencing `paths` entries now say `site_r2`. The `site/**` and `specs/007-.../fixtures/**` filters were already correct on `dev`; the rename is the only thing `main` is still missing, and no `static_site` reference survived. Docs updated: `delivery.md`, `architecture.md`, `README.md`. **Deliberately not edited**: `bcr/0003`, `introspec.md` and `refactor.md` all name `static_r2.yml`, because each is a dated record of a past state and BCR-0003 sets the precedent — "do not silently edit history".

  **This is the release unblock, not a rename.** `main` carries the pre-refactor copy, which asks for `vars.STARPY_STATIC_SITE_URL` — a name BCR-0009's rename retired — and `main` has no `site/` to build, so its `verify` job fails and `deploy` is skipped. The renamed file needs only five config items and all five exist on the repository (verified 2026-10-02). Until `main` receives it, nothing deploys and the R2 bucket serves the 2026-09-18 build.
- [ ] T003 [US1] Restructure the deploy: `cache warm` + `catalog` (retry) → `bun run build` → sync assets under `/assets/<sha>/`, data under `/data/<version>/` + manifest, `index.html` last
- [ ] T004 [US1] Set cache headers per `contracts/delivery.md`
- [ ] T005 [US1] Add the rollback step (re-point the version prefix) and document it
- [ ] T006 [US1] Test: a broken build deploys nothing; a good one serves the full workflow

**Checkpoint**: merges to `main` deploy automatically; rollback works.

## Phase 3: User Story 2 — Bundle the font (P1, BCR-0004)

- [ ] T007 [US2] Site: import the bundled woff2 and embed it in the SVG/PDF exports
- [ ] T008 [US2] Python: make `ensure_font` use the bundled file; a missing font is a hard error
- [ ] T009 [US2] Tests: build without the font fails; a Python render with the network disabled uses Cormorant Garamond
- [ ] T010 [US2] Frontend implementation — see `## Frontend`

**Checkpoint**: no third-party asset request; exports self-contained.

## Phase 4: User Story 3 — Fitness functions (P2)

- [ ] T011 [P] [US3] `scripts/check_bundle_budget.sh`: bundle ≤ 500 KB, data ≤ 400 KB brotli
- [ ] T012 [P] [US3] Secret scan over `dist/`
- [ ] T013 [P] [US3] `no_server` check: fail on a `gradio` import or any listener; `python -m starsky` must bind nothing
- [ ] T014 [US3] Wire all five fitness functions into `site_ci.yml`/`ci.yml`
- [ ] T015 [US3] Test each check by violating it on a scratch branch and seeing CI fail

**Checkpoint**: all five fitness functions enforce themselves.

## Phase 5: Polish

- [ ] T016 [P] Remove HF artifacts and workflow (BCR-0003) in the decommission slice, not here
- [ ] T017 Update `specs/README.md` statuses as checkpoints pass

## Dependencies

- Setup → US1 → US2 → US3.
- Feature depends on `006-viewer` and `007-renderer-export`.
- BCR-0003's removal is refactor Slice 6 and is tracked in `refactor.md`.

## Notes

- Data versioning must be deterministic: derive it from the exported files' hash.
- `## Frontend` section is owned by `frontend:spec`.

## QA

Feature risk: **Medium** — see `specs/008-site-delivery/qa.md`.

- [ ] T018 [QA] e2e J6 (post-deploy smoke): open the deployed URL, render a shared sky, export a PNG, assert no third-party asset request
- [ ] T019 [QA] Negative: a failed build leaves the previous prefix serving; nothing partial published
- [ ] T020 [QA] Test: the bundle carries no `fonts.googleapis`/`gstatic` reference and no `*_TOKEN`-like string
- [ ] T021 [QA] Drill: time a rollback to the previous prefix; record it against the 5-minute target
- [ ] T022 [QA] Gate: enforce all five fitness functions in CI (no-server, conformance, visual regression, bundle/data budgets, no-secrets)
- [ ] T023 [QA] Scheduled: dependency and secret scan on a schedule
- [ ] T024 [QA] Charter C4: release integrity (cache headers, old prefix retired, rollback re-point)

**Checkpoint**: the release path is gated and the rollback is proven by a timed drill.
