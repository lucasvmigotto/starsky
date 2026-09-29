# Tasks: viewer

Feature: `006-viewer` | Branch: `feat/viewer` | Input: `specs/006-viewer/`

Tests are required for every story (constitution IV).

## Phase 1: User Story 1 — Copyable sky link (P1) 🎯 MVP

- [ ] T001 [US1] Test: encode/decode round-trip — exists (`encode.test.ts`, `share.test.ts`)
- [ ] T002 [US1] Test: a corrupt fragment raises `ShareDecodeError`; a wrong version raises `ShareVersionError` — exists
- [ ] T003 [US1] Test: the committed sample fragments all decode — exists (`site.test.ts`)
- [ ] T004 [US1] Test: unknown option fields are rejected rather than rendered

## Phase 2: User Story 2 — Explorer viewer (P2)

- [ ] T005 [US2] Component: the four states (empty/legacy/invalid/ready) render the right content — **gap**
- [ ] T006 [US2] Test: the sky model drops `alt <= 0` and declutters — exists (`skymodel.test.ts`)
- [ ] T007 [US2] Test: place-lookup failure shows an error and does not navigate — exists (`geocode.test.ts`); extend to the form path

## Phase 3: Polish

- [ ] T008 Test: coordinates at ±90 and ±180 are handled
- [ ] T009 Test: a very long place name truncates rather than overflowing the caption

## QA

- [ ] T010 [QA] e2e J2: shared-link round-trip — valid, corrupt, absent, wrong-version (`specs/006-viewer/qa.md`)
- [ ] T011 [QA] e2e J4: place lookup success and failure, with the request intercepted
- [ ] T012 [QA] a11y: axe on the viewer; keyboard navigation through the figures panel
- [ ] T013 [QA] Charter C3: link edge cases (truncated, extra padding, very old version)

**Checkpoint**: codec and state branches covered; a11y clean.
