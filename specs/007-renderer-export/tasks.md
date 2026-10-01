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
- [x] **T031 e2e: exported files opened standalone.** Done (`j3-offline-export.spec.ts`): the SVG asserts self-containment offline; the PDF asserts vector, real text and an **embedded font**. The font assertion was written against a failing contract and stayed red until **BCR-0006** (`8a346bd`) embedded the face; it now passes, and the stale "fails today" note beside it was removed on 2026-10-01.
- [x] **Decide the open findings**: all three are closed, and none needed a new BCR —
      `finding-pdf-font-not-embedded.md` → BCR-0006 (the poster face is embedded),
      `finding-font-degradation.md` → BCR-0007 (a missing font fails loudly),
      `../006-viewer/finding-unvalidated-options.md` → BCR-0008 (share options are
      range-checked). A fourth, `finding-reference-drift.md`, is **not** in this list
      and is still open — see its own status line.

Struck: the parity-era tasks (formerly T001–T023) — superseded by BCR-0005.

## QA

Feature risk: **High** — see `specs/007-renderer-export/qa.md`.

- [x] T030 [QA] Boundary: empty sky, maximum density, fisheye bounds (`boundaries.test.ts`)
- [x] T032 [QA] Negative: the font path, incl. a missing font (`e2e/font.spec.ts`)
- [x] T036 [QA] a11y: axe + keyboard-only export (`e2e/a11y.spec.ts`, `e2e/contrast.spec.ts`)
- [x] T037 [QA] Visual: reference-image suite wired as a gate
- [x] T038 [QA] Performance under CDP ×4 throttle; `[RELATIVE]`, not a real phone
- [x] T039 [QA] Gate: confirm the e2e workflows actually run green in CI. Done: the
      `Site e2e` workflow is green on `dev` (`9235634`, run 36920761213) — 41 tests
      across Chromium, Firefox and mobile, on the first push where Firefox could
      launch at all. Fixed by `9235634` (`HOME=/root` in the journeys step).
- [ ] T040 [QA] Charter C1: poster fidelity sweep (extreme latitudes, solstice edges, accents/emoji)
- [ ] T041 [QA] Charter C2: export integrity in a different viewer per format

**Checkpoint**: exports verified in a real browser on both supported browsers.
Green on `dev`; still nothing is `Verified` until the suite passes on `main`, and
T040/T041 remain open above.

## Frontend

Spec: [`ui.md`](ui.md). Design system: [`../000-design-system/`](../000-design-system/).

**Contract mock**: N/A — exports are pure in-browser functions of the current
payload (ADR-0001). Nothing to mock.

### Phase F1: User Story 2 — the export surface (P1)

> **Status (2026-10-01).** F1 and F2 shipped in the design-system pass
> (`8b52a5b`, `fcd0f51`, `ceb7db3`) but this list was never reconciled, so it read
> as ten open tasks. Checked against the code: **six are done, four are not.**
> The four gaps are named on the task that owns each, so the next session does not
> re-derive them. None of the four is a behaviour bug — three are missing
> assertions and one is unwired i18n.

- [x] FT001 Test: the Viewer has exactly one download control — the footer's "Save image" is gone (D15). Done: `e2e/footer.spec.ts` "has no download control — one export surface (D15)", green.
- [x] FT002 Test: an export in progress disables all three format buttons. Done: `disabled={busy !== null}` on all three, plus the component test "disables the group while working".
- [x] FT003 Test: a failed export names the format and leaves the map untouched. Done: the `catch` sets `"<FORMAT> export failed: …"` and mutates no model state; covered by "surfaces an export failure in the live region".
- [x] FT004 [P] Rework `ExportControls.tsx` against the design-system tokens; keep `role="status"` and `aria-live="polite"`. Done: `atlas-export*` classes throughout, and the live region kept verbatim.
- [x] FT005 [P] Remove the footer "Save image" and its handler from `ViewerPage.tsx`. Done: no `Save image` in `SiteFooter.tsx` or `ViewerPage.tsx`.
- [ ] FT006 Verify every export target is ≥44×44 after the retheme. **Half done:** the CSS is correct (`.atlas-export-trigger` and `.atlas-export-button` both `min-height: 44px`, `index.css:551,583`) but *nothing asserts it* — the verification this task asks for is a missing test in `design/components.test.ts`.
- [ ] FT007 Wire `viewer.export.*` copy keys, incl. `{filename}` and `{format}` interpolation. **Not done:** all seven keys exist in `i18n/en-US.ts:71-77` and `8641ac9` wired every other surface, but `ExportControls.tsx` still hardcodes `"Export"`, `"PNG"`, `"Preparing …"`, `"downloaded."`. The one component left off the copy extraction.

**Checkpoint**: AC1–AC8 in `ui.md` pass; `j3-offline-export` still green.

### Phase F2: Polish

- [ ] FT008 a11y: axe on the export row; completion announced without focus moving. **Half done:** axe on the viewer and keyboard-reachable export both pass in `e2e/a11y.spec.ts`; *no test asserts that completion leaves focus where it was*.
- [ ] FT009 [P] e2e: assert one download control; a failed export shows the error copy. **Half done:** the one-control half is FT001's passing test; there is no e2e that forces an export failure and asserts the error copy.
- [x] FT010 Regression: `render-spec.json` conformance (`spec.test.ts:32`) and the literal hex assertions remain green — this feature changes no poster token. Done: both run in `Site CI`'s `bun run test`, green on every push since the retheme.

**Checkpoint**: no second download control anywhere; conformance green;
`007/qa.md` updated if export latency moved.
