# Tasks: catalog-cli

Feature: `002-catalog-cli` | Branch: `feat/catalog-cli` | Input: `specs/002-catalog-cli/`

Tests are required for every story (constitution IV).

> **Reconciled 2026-10-01 — read before trusting a box below.** This feature
> **ships today** (`specs/README.md`: Implemented) and the work was done through
> the static-first refactor, not by ticking this list: the list is
> `project:introspec`'s reconstruction of what the code *already* did, so all 12
> boxes were never checked while the code was written. The code is the record;
> this list is not.
>
> Verified present: `starsky catalog` and `starsky cache warm` in
> `src/starsky/cli.py`, the Hipparcos/constellation loaders in
> `src/starsky/data/`, and the test suite under `tests/`.
>
> Reconciling the boxes properly means checking each one against the code, which
> is a `speckit:converge` pass — not a bulk tick. Deliberately left alone here.

## Phase 1: User Story 1 — Build the sky data (P1) 🎯 MVP

- [ ] T001 [US1] Test: `catalog` on a warm cache writes both JSON files with the documented shape
- [ ] T002 [US1] Test: `--mag-limit` filters the star list
- [ ] T003 [US1] Test: `--output-dir` is created when missing
- [ ] T004 [US1] Implement `starsky catalog` (exists — `src/starsky/cli.py`; add the tests above)

## Phase 2: User Story 2 — Warm the caches (P2)

- [ ] T005 [US2] Test: `cache warm` leaves both parquet caches
- [ ] T006 [US2] Test: a second `cache warm` performs no download
- [ ] T007 [US2] Implement `starsky cache warm` (exists; add the tests above)

## Phase 3: Polish

- [ ] T008 Test: bare `python -m starsky` prints help and binds nothing

## QA

- [ ] T009 [QA] Integration: CI runs `cache warm` + `catalog` and asserts both files exist, parse, and carry 4 fields per row (`specs/002-catalog-cli/qa.md`)
- [ ] T010 [QA] Integration: assert counts are above the floor (`>8000` stars, `>500` segments) rather than an exact equality, so an upstream catalogue update does not false-fail
- [ ] T011 [QA] Negative: a source host failure leaves no partially-written JSON
- [ ] T012 [QA] Gate: wire the data build and the assertions into `ci.yml` on `main`

**Checkpoint**: the CLI's data output is guarded in CI; this feature has no browser surface.
