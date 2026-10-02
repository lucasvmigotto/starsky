# Tasks: data-cache

Feature: `005-data-cache` | Branch: `feat/data-cache` | Input: `specs/005-data-cache/`

Tests are required for every story (constitution IV). Low risk: the happy path
plus validation, no charter.

> **Reconciled 2026-10-01 — read before trusting a box below.** This feature
> **ships today** (`specs/README.md`: Implemented); all 9 boxes are unticked for
> the same reason as `002`: the list reconstructs code that already existed, so
> it was never the build list. Note the list also predates **BCR-0005**, which
> retired the ephemeris half — so some tasks below describe work that no longer
> exists and should be struck rather than ticked.
>
> Verified present: `src/starsky/data/` (`catalog.py`, `constellations.py`).
>
>A real reconciliation is a `speckit:converge` pass: tick what shipped, strike
> what BCR-0005 removed. Deliberately not done in bulk here.

## Phase 1: User Story 1 — Warm the two sources (P1) 🎯 MVP

- [ ] T001 [US1] Test: Hipparcos parser (fixed-width slices, blank coords, short lines) — exists (`tests/data/test_catalog.py`)
- [ ] T002 [US1] Test: Stellarium parser (consecutive HIP pairs) — exists (`tests/data/test_constellations.py`)
- [ ] T003 [US1] Test: catalogue is mag-sorted after load
- [ ] T004 [US1] Test: a warm cache performs no network fetch

## Phase 2: Polish

- [ ] T005 Test: an empty or corrupt parquet cache fails loudly instead of serving partial data
- [ ] T006 Test: no ephemeris/Skyfield import remains anywhere in `src/`

## QA

- [ ] T007 [QA] Integration: CI asserts both parquet caches exist after `cache warm`
- [ ] T008 [QA] Gate: keep `tests/data/` in the PR set (fast, offline)
- [ ] T009 [QA] Negative: a source error leaves no valid-looking partial cache

**Checkpoint**: parsers and cache behaviour guarded; no browser surface.
