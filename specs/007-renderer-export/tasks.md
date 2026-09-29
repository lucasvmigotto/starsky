# Tasks: renderer-export

Feature: `007-renderer-export` | Branch: `feat/renderer-export` | Input: `specs/007-renderer-export/`

Tests are required for every story (constitution IV). Layers: this file holds
the story-level plan; `## Frontend` is appended by `frontend:spec` with the
detailed client tasks.

## Phase 1: Setup

- [ ] T001 [P] Create `site/src/lib/render/` module skeleton with a `Renderer` interface (branch-by-abstraction) and a `tokens.ts` that reads `render-spec.json`
- [ ] T002 [P] Add export dependencies (`svg2pdf.js`, `jspdf`) to `site/package.json` and lockfile
- [ ] T003 [P] Freeze the current CLI poster as a golden artifact plus its byte hash (refactor Slice 0)

## Phase 2: Foundational

- [ ] T004 [P] Write the parity harness: a fixture matrix (place, moment, options, size) rendered by the Python CLI, with the comparison and tolerance from `contracts/parity.md`
- [ ] T005 [P] Add a conformance test asserting `tokens.ts` equals `render-spec.json` on both renderers
- [ ] T006 Extend `tokens.ts` to cover every field in `render-spec.json` (colours, stars, glow, lines, labels, ring, caption, fonts, shareLink)

## Phase 3: User Story 1 — Render a poster in the browser (P1) 🎯 MVP

- [ ] T007 [US1] Implement `poster.ts`: compose `ProjectedSky` + `Segment[]` + `FigureLabel[]` + `Caption` with the spec tokens at high DPI
- [ ] T008 [US1] Implement circle/square masks and the caption band (0.22) in `poster.ts`
- [ ] T009 [US1] Wire the flagged renderer into `SkyCanvas.tsx` behind `?renderer=poster`, keeping the preview as fallback
- [ ] T010 [US1] Test: star count, segment count and caption match the CLI for every fixture
- [ ] T011 [US1] Run the parity harness; record and explain every raster difference before enabling the flag by default
- [ ] T012 [US1] Frontend implementation — see `## Frontend`

**Checkpoint**: the flagged renderer matches the CLI within tolerance; the preview still serves by default.

## Phase 4: User Story 2 — Export PNG, SVG and PDF (P1)

- [ ] T013 [P] [US2] Implement PNG export (canvas `toBlob`) at the chosen size/DPI
- [ ] T014 [P] [US2] Implement SVG export with `<text>` caption, star/line paths and an embedded font
- [ ] T015 [P] [US2] Implement true-vector PDF export from the SVG via `svg2pdf.js` + jsPDF
- [ ] T016 [US2] Add `ExportControls.tsx` with keyboard-reachable buttons and live status (WCAG 2.2 AA)
- [ ] T017 [US2] Tests: each export opens and contains the expected caption and star count; the PDF is vector with selectable text
- [ ] T018 [US2] Frontend implementation — see `## Frontend`

**Checkpoint**: all three exports work from a shared sky.

## Phase 5: User Story 3 — Offline reopen (P2)

- [ ] T019 [US3] Test: an exported SVG/PDF opened with the network disabled shows the bundled font, no fallback
- [ ] T020 [US3] Fail loudly when the font asset is missing (no silent fallback)

**Checkpoint**: exports are self-contained.

## Phase 6: Polish

- [ ] T021 [P] Performance profile on a mid-range phone against the budget; record numbers in `plan.md`
- [ ] T022 [P] Fitness function: offline render check in CI
- [ ] T023 Add `quickstart.md` and update `specs/README.md` statuses as checkpoints pass

## Dependencies

- Setup → Foundational → US1 → US2 → US3.
- US2 needs the composed poster from US1; US3 needs US2's exporters.
- Feature depends on `005-data-cache` (data) and `006-viewer` (model + share codec).

## Notes

- Nothing here flips the default renderer; that is `refactor.md` Slice 5 (BCR-0001).
- `## Frontend` section (screens, components, states, tokens) is owned by `frontend:spec`.

## Post-BCR-0005 rewrite (2026-09-29)

The Python renderer was removed (BCR-0005), so the parity tasks above are void.
The remaining work:

- [ ] T024 [P] Replace the parity harness with a browser reference-image suite: render `fixtures/parity.json`, store the PNGs, fail on unexplained change
- [ ] T025 [US2] Wire the export controls (PNG/SVG/PDF) into the viewer UI with keyboard-reachable buttons and status
- [ ] T026 [US2] Test each export opens and contains the caption and star count; the PDF is vector with selectable text
- [ ] T027 [US3] Test an exported SVG/PDF opens with the network disabled (bundled font, no fallback)
- [ ] T028 Flip the renderer flag to poster by default once T024-T027 pass, then delete the preview renderer
- [ ] T029 Performance profile on a mid-range phone against the budget; record numbers in `plan.md`
