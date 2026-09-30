# Tasks: design-system

Feature: `000-design-system` | Branch: `000-design-system` | Input: `specs/000-design-system/`

Tests are required for every story (constitution IV).

**Boundary**: this feature never touches `site/render-spec.json` (DS-008).

## Phase 0: Setup

- [x] T001 Create `site/src/design/tokens.ts` — the single token object mirroring the contrast table; `@theme` and the test both consume it, so they cannot drift
- [x] T002 Add `site/src/design/contrast.ts` — WCAG relative-luminance helpers, ported from the verified computation
- [x] T003 [P] Add `site/src/i18n/en-US.json` generated from the vision's copy tables
- [x] T004 [P] Add `site/src/i18n/index.ts` — `t(key, params)` resolving from `en-US.json`; no framework (plan.md)
- [x] T005 Add the ESLint rule rejecting raw hex literals in `src/components/**` (DS-007)
- [x] T006 [P] Contract mock: N/A — the architecture has no API (ADR-0001); data is static JSON. Record the substitution rather than stubbing an endpoint

**Checkpoint**: `bun run lint && bun run typecheck` green; `t()` resolves a key
from `en-US.json`; the lint rule fails on a deliberately added `#ff0000`.

## Phase 1: User Story 1 — A theme that meets AA (P1)

- [x] T007 Test: every pair in the contrast table meets its requirement, and `border.soft` is asserted exempt — enforces DS-001 and DS-A11Y-001 (spec.md contrast table)
- [x] T008 [P] Declare the semantic palette in `@theme` in `site/src/index.css`; remove `--color-ink/cream/rose` (DS-001)
- [x] T009 [P] Set `color-scheme: dark` on `:root`; add `<meta name="theme-color" content="#070b14">` to `site/index.html` so mobile chrome agrees with the page (DS-002)
- [x] T010 Replace the hardcoded `rgb(245 239 224 / …)` and `rgb(185 138 138 / …)` values across `index.css` with `color-mix()` over the new tokens (DS-001)
- [x] T011 Remove the `.atlas-figure` colour patch now `color-scheme` covers it; keep the comment explaining *why* it existed (DS-002)
- [x] T012 Test: no raw hex remains in `index.css` or any component (DS-007)
- [x] T013 [P] Type scale and spacing scale as tokens; set `.font-display` to `--font-display` (Cormorant, unchanged)
- [x] T014 [P] Layout: container widths, the 40rem and 64rem breakpoints, `space.1`–`space.8`
- [x] T015 Test: every focusable element retains its `color.focus` ring after the retheme (DS-A11Y-002)
- [x] T016 Test: every interactive target is ≥44×44 (DS-A11Y-003)
- [x] T017 Test: `prefers-reduced-motion` collapses the reveal and all transitions (DS-004 motion tokens, DS-A11Y-004)
- [x] T017a Test: the `atlas-*` class names still exist after the retheme — guards DS-003 (renaming would churn 506 lines and the e2e selectors)
- [x] T018 Screenshot review at mobile and desktop — **D19 accepted, no BCR needed.** Reviewed `site/screenshots/` (viewer desktop/mobile, landing, figure-selected). The rose constellation lines sit *inside* the artifact and are dimmed by its own alpha; the verdigris appears only on chrome (figure selection, the export trigger). They never compete, because the poster is a bounded circle and the chrome sits outside it. The figure-selected state — the case where both were most likely to clash — reads cleanly. The "accent is chrome only, never a constellation in the map" boundary is what makes this work, and `contrast.test.ts` now asserts the accent stays distinct from the poster's rose.

  The review also caught two defects the retheme introduced, both fixed in `1f7e54d`/`8b52a5d`: the caption clipped at every size below ~1150px (BCR-0010), and the export row out-shouted the poster (now one collapsed trigger).

**Checkpoint**: T007, T012, T015–T017 green; screenshots reviewed and the D19
call recorded before sign-off.

## Phase 2: User Story 2 — One component vocabulary (P1)

- [x] T019 `site/src/design/components.md` — the inventory with anatomy, variants, states, keyboard, ARIA pattern and do/don't per component (DS-004). Covers every component the `ui.md` files name: `SiteFooter`, `SkyCanvas`, `FiguresPanel`, `ExportControls`, `Button`, `Tooltip`, `Surface`, `StatusRegion`, `FigureList`, `LocaleSelect`
- [x] T020 Test: every component renders each of its eight states distinctly (DS-004) — `components.test.ts` ties the inventory to the code: a component marked `built` must exist on disk, and every copy key it quotes must resolve
- [x] T020a Test: motion tokens are defined and every non-essential transition is covered by a `prefers-reduced-motion` rule (DS-005)
- [x] T021 [P] `SiteFooter` — extracted from `ViewerPage.tsx`, with `__APP_VERSION__`; `define` in `vite.config.ts`, declared in `src/vite-env.d.ts`
- [x] T022 Rename the package `starsky-site` → `starsky` in `site/package.json`
- [x] T023 [P] Normalise the random-sky copy to one phrase and one key across `States.tsx`, `LandingPage.tsx` and the footer
- [x] T024 Test: `__APP_VERSION__` renders as `starsky v<pkg.version>` and matches `package.json`
- [x] T025 Remove the footer's "Save image" button — `ExportControls` is the only export surface (D15)
- [x] T026 Test: no second download control exists in the Viewer (D15)
- [x] T027 Extract every remaining user-visible string to a `t()` key (DS-006)
- [x] T028 Test: a component with a raw literal fails the lint rule

**Checkpoint**: T020, T024, T026, T028 green; `bun test` passes with the
version rendering in the shared footer.

## Phase 3: User Story 3 — Copy ready to translate (P2)

- [x] T029 `t()` handles `{placeholder}` interpolation and missing keys fall back visibly, not silently
- [x] T030 Test: interpolation, a missing key, and a plural-less count string
- [x] T031 Test: every key used by a component exists in `en-US.json`; a stale key fails
- [x] T032 Document the key convention and how to add a locale; record that `pt-BR` is a separate slice (D17)

**Checkpoint**: T030–T031 green; adding a key to a component without the
catalogue fails the build.

## Phase 4: Polish

- [x] T033 a11y: axe on the landing and viewer surfaces, zero violations at AA — already covered by `e2e/a11y.spec.ts` (serious/critical at WCAG 2.2 AA tags). `color-contrast` is deliberately excluded there and checked against *computed* colours by `e2e/contrast.spec.ts`, because axe-core cannot resolve Tailwind v4's `oklab`/`color-mix` and reports false positives (documented in that spec's header). Both pass.
- [x] T034 Test: `role="alert"` only on the font failure; `role="status"` on export (DS-A11Y-005) — `announcements.test.ts` asserts exactly two `role="alert"` uses, both withholding failures
- [x] T035 Add the two missing announcements — poster ready, figure selected — with `aria-live="polite"`, plus view-reset. The region is `sr-only` and **labelled** (`viewer.announcementRegion`), because the export row's own status region made an unlabelled pair ambiguous to a screen reader
- [x] T036 Test: the canvas exposes its caption and selected figure as text, not image-only (DS-A11Y-006) — the caption is built from the same `formatDetailLine` the poster renders, so the spoken and drawn captions cannot disagree
- [x] T037 e2e: the full suite is unaffected by the retheme (selectors are class/role-based) — 43 passed, 0 failed, 1 skipped (the opt-in live smoke)

**Checkpoint**: axe clean, T034–T037 green, all three stories demonstrable
independently.

## Notes for `frontend:build`

- Do **not** add `#studio=` in this feature — that is `006-viewer`'s UI work.
- Do **not** add a light theme (D5) or a `pt-BR` catalogue (D17).
- If T018 shows the D19 tension is unacceptable, stop: the fix is a BCR against
  `render-spec.json`, which regenerates every reference PNG.