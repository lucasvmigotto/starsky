# Tasks: renderer-export

Feature: `007-renderer-export` | Branch: `feat/renderer-export` | Input: `specs/007-renderer-export/`

Tests are required for every story (constitution IV).

> **History (2026-09-29).** Phases 1–2 below were drafted while a second
> (Python) renderer existed and a *parity harness* compared the two. BCR-0005
> removed that renderer, so those tasks were superseded mid-flight: the
> conformance test and the fixture matrix shipped, the parity comparison did
> not, and the golden hash was never built. They are struck, not left pending,
> because the work they describe no longer exists. What shipped is recorded in
> the `## Delivered` section.

## Delivered (implemented and verified)

- [x] `site/src/lib/render/poster.ts` — poster composer (geometry, masks, glow, labels, caption)
- [x] `site/src/lib/render/export.ts` — PNG / SVG / true-vector PDF
- [x] `site/src/lib/render/index.ts` — `Renderer` abstraction + the `?renderer` flag
- [x] `site/render-spec.json` conformance (`spec.test.ts`), incl. `units.referenceDpi`
- [x] Poster geometry corrected against measurement (point sizing, circular mask, label colour, pre-declutter membership)
- [x] `ExportControls.tsx` wired into the viewer, keyboard-reachable, errors surfaced
- [x] Reference-image suite (`reference.test.ts`): exact structural counts + two pixel bars; verified to fail on a doubled ring width
- [x] Component tests for the export controls (`ExportControls.test.tsx`)
- [x] e2e journeys J1–J4 + accessibility + contrast (`site/e2e/`), 40 passing on Chromium and Firefox
- [x] Performance measured under CDP ×4 throttle (render 387 ms; exports 57–252 ms)

## Open

- [x] **T028 Flip the renderer default to poster, then delete the preview path.** Done (`be118cf`): the poster is the only renderer, the preview path and the `?renderer` flag are deleted, zoom/pan became a blit of a cached composition, and hover a scrim + focus overlay. Reference images matched unchanged; 54 e2e journeys pass on Chromium and Firefox (verified visually, not only asserted).
- [x] **T030 e2e: a sparse sky in a browser.** Done (`j7-sparse-sky.spec.ts`): the tightest magnitude limit the schema allows still renders frame, ring and caption. The truly-empty case stays pinned in `boundaries.test.ts`, which can build one synthetically.
- [x] **T031 e2e: exported files opened standalone.** Done (`j3-offline-export.spec.ts`): the SVG asserts self-containment offline; the PDF asserts vector, real text and an **embedded font**. The font assertion **fails today** — see `finding-pdf-font-not-embedded.md`; the test states the contract rather than accepting the current output.
- [ ] **Decide the open findings**:
      `finding-pdf-font-not-embedded.md` (the PDF uses standard fonts, no embedded face),
      `finding-font-degradation.md` (silent fallback on a missing webfont),
      `../006-viewer/finding-unvalidated-options.md` (out-of-range share options accepted).

Struck: the parity-era tasks (formerly T001–T023) — superseded by BCR-0005.

## QA

Feature risk: **High** — see `specs/007-renderer-export/qa.md`.

- [x] T030 [QA] Boundary: empty sky, maximum density, fisheye bounds (`boundaries.test.ts`)
- [x] T032 [QA] Negative: the font path, incl. a missing font (`e2e/font.spec.ts`)
- [x] T036 [QA] a11y: axe + keyboard-only export (`e2e/a11y.spec.ts`, `e2e/contrast.spec.ts`)
- [x] T037 [QA] Visual: reference-image suite wired as a gate
- [x] T038 [QA] Performance under CDP ×4 throttle; `[RELATIVE]`, not a real phone
- [ ] T039 [QA] Gate: confirm the e2e workflows actually run green in CI
- [ ] T040 [QA] Charter C1: poster fidelity sweep (extreme latitudes, solstice edges, accents/emoji)
- [ ] T041 [QA] Charter C2: export integrity in a different viewer per format

**Checkpoint**: exports verified in a real browser on both supported browsers.
Nothing is `Verified` until the e2e suite passes on `main`.
