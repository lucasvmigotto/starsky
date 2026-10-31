# Tasks: Poster Studio and share migration

Feature: `012-poster-studio` | Branch: `feat/012-poster-studio` | Input: `specs/012-poster-studio/`

Tests come first (constitution IV). Executor `builder`, Reviewer `thinker`.

- [x] T001 [US3] Tests then spec entry, `format.ts`, canvas story path: 1080 × 1920, equal margins, standard output byte-identical
- [x] T002 [US3] Tests then SVG and PDF story paths
- [ ] T003 [US3] New reference image for story, in the existing reference test approach; existing images unchanged
- [ ] T004 [US3] `ExportControls` format choice with component tests and copy
- [ ] T005 [US2] Tests then `convert.ts`, `returnCamera.ts`
- [ ] T006 [US1] Tests then `draft.ts`; extract `PosterFields` with landing behavior unchanged
- [ ] T007 [US1] `StudioPage`, lazy dispatch, copy and vision tables
- [ ] T008 [US2] Viewer actions and Explorer "Create poster"
- [ ] T009 [US1–US4] e2e: Studio live redraw, export PNG, story dimensions for PNG, SVG and PDF, Explorer ↔ Studio with camera restored, Viewer actions, old `#s=` fixtures, keyboard journey, axe, phone layout
