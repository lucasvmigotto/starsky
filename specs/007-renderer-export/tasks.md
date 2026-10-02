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
- [x] T040 [QA] Charter C1: poster fidelity sweep (extreme latitudes, solstice edges, accents/emoji). Swept 2026-10-02, producing **one real finding** — `finding-unsupported-glyphs.md`: the bundled face has no emoji or CJK glyph, so the PNG bakes in a notdef box while the SVG carries the character and the PDF has no outline to subset. The three exports disagree about the same title. It needs a product decision, not a code fix, so behaviour is unchanged. The rest of the sweep was clean and is now pinned: latitudes +90…−90 and both solstices and equinoxes project finitely and stay on the disc (a stereographic projection is normally undefined at the pole, so this is worth locking down), `min_separation` 0→0.2 is monotonic with figures built pre-declutter, and accents and commas survive the caption. Six new cases in `boundaries.test.ts`, four in `glyph-coverage.test.ts`.
- [x] T041 [QA] Charter C2: export integrity in a different viewer per format. **Partially** verified 2026-10-02, with parsers independent of the ones that wrote the files (Python's `xml.etree` and `struct`/`zlib`, not the DOM and canvas): PNG 1600×1952 8-bit RGBA with valid CRCs in every case; SVG fully self-contained — zero external `href`, zero `url()`, zero `<image>`, so no rasterisation and nothing to fetch; and the element census (1880 circles, 408 lines, 52 text nodes) identical across every title, so nothing is dropped. **PDF is not covered:** `exportPdf` loads the face through `fetch` and cannot run outside a browser, and the browsers are not cached on the machine this sweep ran on. The green `j3-offline-export.spec.ts` covers the embedded font for a plain title, not a missing glyph. Recorded as a gap in the finding rather than ticked as though done.

**Checkpoint**: exports verified in a real browser on both supported browsers —
met on `dev`. The `main` half of this line was removed on 2026-10-01: `main` is
the pre-refactor tree, so it has no `site/` and no `site_e2e.yml`, and the suite
can never run there. The release gate is 008's promotion path, not a push to
`main`. T040/T041 remain open above, so 007 is still not `Verified`.

## Frontend

Spec: [`ui.md`](ui.md). Design system: [`../000-design-system/`](../000-design-system/).

**Contract mock**: N/A — exports are pure in-browser functions of the current
payload (ADR-0001). Nothing to mock.

### Phase F1: User Story 2 — the export surface (P1)

> **Status (2026-10-01).** F1 and F2 shipped in the design-system pass
> (`8b52a5b`, `fcd0f51`, `ceb7db3`) but this list was never reconciled, so it read
> as ten open tasks. Checked against the code, then closed the real gaps on
> `feat/007-export-polish`: **all ten are now done.**
>
> Two corrections to the first pass of this reconciliation, both worth keeping:
>
> - FT006 was reported as "half done — nothing asserts the 44px target". That was
>   wrong. `design/atlas-classes.test.ts:166` asserts it. The mistake was grepping
>   one plausible file (`components.test.ts`) instead of searching; the assertion
>   was in a sibling. A task can be closed by work that already shipped, and a
>   single-file grep cannot tell you which.
> - FT007 was reported as the only real code gap, which was right, but the note
>   implied the catalogue already covered the component. It did not: three of the
>   strings the component ships have no key at all.

- [x] FT001 Test: the Viewer has exactly one download control — the footer's "Save image" is gone (D15). Done: `e2e/footer.spec.ts` "has no download control — one export surface (D15)", green.
- [x] FT002 Test: an export in progress disables all three format buttons. Done: `disabled={busy !== null}` on all three, plus the component test "disables the group while working".
- [x] FT003 Test: a failed export names the format and leaves the map untouched. Done: the `catch` sets `"<FORMAT> export failed: …"` and mutates no model state; covered by "surfaces an export failure in the live region".
- [x] FT004 [P] Rework `ExportControls.tsx` against the design-system tokens; keep `role="status"` and `aria-live="polite"`. Done: `atlas-export*` classes throughout, and the live region kept verbatim.
- [x] FT005 [P] Remove the footer "Save image" and its handler from `ViewerPage.tsx`. Done: no `Save image` in `SiteFooter.tsx` or `ViewerPage.tsx`.
- [x] FT006 Verify every export target is ≥44×44 after the retheme. **Already done** — and an earlier note here said otherwise, which was my error: I grepped `design/components.test.ts` for `44`, found nothing, and concluded the assertion was missing. It lives in `design/atlas-classes.test.ts:166` ("gives every button at least the 44px target height (DS-A11Y-003)"), which asserts `min-height: 44px` on all four button classes including `atlas-export-trigger` and `atlas-export-button`. `design/components.md:47` names that file as the guard. The lesson is recorded in FT007 below: a grep in one file is not a search.
- [x] FT007 Wire `viewer.export.*` copy keys, incl. `{filename}` and `{format}` interpolation. Done: `ExportControls.tsx` now resolves every user-facing string through `t()`; the `{filename}` and `{format}` slots carry the real values. Four of the seven strings had keys all along and went unused — the component had its own `LABELS` map and its own "Preparing…"/"downloaded." literals. Three keys did not exist and were added to the vision *and* the catalogue (`viewer.export.open`/`.close`/`.preparing`, 87→90), because the catalogue is generated from the vision and `check_i18n_keys.py` asserts the two agree in both directions. The copy is the component's existing wording, recorded rather than invented.

  Two things this surfaced, both left visible rather than quietly fixed:
  - **The trigger labels the format group.** `aria-labelledby={triggerId}` means that when the panel is open the group is announced as "Close export" — a group named after the control that closes it. A passing test asserts the group is named `/export/i`, which is true of the wrong string too. Worth its own fix; out of scope here.
  - **A test was pinned to the old literal.** `ExportControls.test.tsx` asserted the success status contains `"SVG"`, which only held because the component said "SVG downloaded." The approved copy is `viewer.export.done` ("Saved {filename}"), which names the file. The assertion now resolves the key instead of pinning a string, so the component and the catalogue cannot drift apart again unnoticed.

**Checkpoint**: AC1–AC8 in `ui.md` pass; `j3-offline-export` still green.

### Phase F2: Polish

- [x] FT008 a11y: axe on the export row; completion announced without focus moving. Done: the axe half was already covered by `e2e/a11y.spec.ts` (the viewer has no serious or critical violations; a keyboard user can reach and trigger an export). The focus half was genuinely unasserted — added "announces completion without stealing focus", which focuses the format button the way a keyboard user would, completes the export, and asserts the live region carries the result *and* that `document.activeElement` is still that same button. A completion message that moved focus would yank the user out of the format row mid-sequence.
- [x] FT009 [P] e2e: assert one download control; a failed export shows the error copy. Done: the one-control half was FT001's passing test. The missing half is a new `test.describe("J1 export failure")` in `j1-export.spec.ts` that breaks the page before load with `URL.createObjectURL` throwing — the only call that turns a Blob into a download (`lib/render/export.ts:274`), so the export fails at the last possible moment, after the poster has rendered. It asserts the copy names the format, carries the "map is unaffected" reassurance, that the poster is *actually* still on screen, that no download reached disk, and that the button returns to enabled rather than stuck busy. The stub technique came from the existing unit test that already injected the same failure.
- [x] FT010 Regression: `render-spec.json` conformance (`spec.test.ts:32`) and the literal hex assertions remain green — this feature changes no poster token. Done: both run in `Site CI`'s `bun run test`, green on every push since the retheme.

**Checkpoint**: no second download control anywhere; conformance green;
`007/qa.md` updated if export latency moved.
