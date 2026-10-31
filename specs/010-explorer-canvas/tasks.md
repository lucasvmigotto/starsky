# Tasks: Explorer canvas and navigation

Feature: `010-explorer-canvas` | Branch: `feat/010-explorer-canvas` | Input: `specs/010-explorer-canvas/`

Tests come first (constitution IV). Executor `builder`, Reviewer `thinker`.

- [x] T001 [US1] Tests then `observerView.ts` and `frame.ts`: determinism, culling, below-horizon dimmed and hidden, near-plane line clipping, horizon polyline
- [x] T002 [US3] Tests then `pick.ts`: nearest star, tie to the brighter, star beats segment, nothing when far, zoom-aware tolerance
- [x] T003 [US4] Tests then label decluttering in `frame.ts`: no overlaps, selected first, fewer on small viewports
- [x] T004 [US2] Tests then `controller.ts`: drag vs click, pinch, wheel, keys, cancel, reset, double-click center, idle draws nothing, FOV limits
- [ ] T005 [US1] `canvas2d.ts` with a test on `@napi-rs/canvas`: draws batches, no invalid state, resize safe
- [ ] T006 [US5] `ExplorerCanvas`, `ExplorerPage`, `#e=` dispatch, lazy loading, error state, copy keys and vision table, `explorer.` namespace in `check_i18n_keys.py`, styles
- [ ] T007 [US2, US3] e2e `site/e2e/explorer.spec.ts`: drag across a pole, zoom limits, reset, select a known star, clear, idle frames stable, touch on the mobile project, a11y scan, `#s=` still opens the poster
