# Tasks: viewer

Feature: `006-viewer` | Branch: `feat/viewer` | Input: `specs/006-viewer/`

Tests are required for every story (constitution IV).

> **Reconciled 2026-10-01 — read before trusting a box below.** This feature
> **ships today** (`specs/README.md`: Implemented) and all 29 boxes are unticked,
> again because the list is `project:introspec`'s reconstruction of existing code
> rather than the list the work was built from.
>
> This is the **largest drift in the tree**, and it is now provable rather than
> merely stale: the viewer is covered by 14 e2e specs under `site/e2e/` —
> `j2-share-link`, `j4-place-lookup`, `j7-sparse-sky`, `j8-live-place-lookup`,
> `a11y`, `announcements`, `contrast`, `font`, `interactive`, `ds-screenshots`
> and the `j1`/`j3` export pairs — and the whole set is **green in CI on `dev`**
> (run 36920761213, `9235634`). Also present: `LandingPage.tsx`,
> `ViewerPage.tsx`, `SkyCanvas.tsx`, `FiguresPanel.tsx`, the share codec in
> `site/src/lib/encode.ts` and place lookup in `site/src/lib/geocode.ts`.
>
> A proper reconciliation is a `speckit:converge` pass over 29 tasks, with the
> green suite as the evidence base. Deliberately not ticked in bulk here.

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
- [x] T014 [US2] Fix: the renderer drew the mirror image of its own model, so canvas hover named the mirror of the cursor (`finding-mirrored-sky.md`) — `unitToCanvas` preserves the canvas-convention sign, one derived `DISK_R`, orientation pinned by `orientation.test.ts` + the northern-sky e2e journey
- [x] T015 [US2] Fix: the hover tooltip captured the pointer, flickering away any hover near the top of the disc — `.atlas-tooltip` is `pointer-events: none`

> **T029/T030 added 2026-10-02** after `finding-unreachable-view.md`. The poster
> had no navigation at all — no pan, no zoom, no keyboard path — and the focus
> overlay was drawn outside the transform it belongs inside, so a zoomed view dimmed
> only part of the frame and set the focused figure's name twice. Both fixed.
>
> The reason this was invisible for so long is worth carrying into any future
> probe: `view.scale` is component state, not DOM, so every test asserted a
> *proxy* for it, and the proxy in use (the reset button appearing) was satisfied
> by `setSelected` with no transform anywhere. A live probe then reported zoom
> and drag "working" when both were only hover changing the pixels. T029's checks
> are each chosen so they cannot pass for the wrong reason — equal-not-unequal
> for the no-op, `window.scrollY === 0` for the wheel, disabled-state for the
> view, canvas luminance at specific corners for the veil.

- [x] T029 [US2] Test/component: pan and zoom the poster — drag, wheel (anchored), two-finger pinch, arrow keys and `+`/`-`/`0`; view maths in `lib/view.ts` with `view.test.ts`; the overlay drawn inside the blit's transform
- [x] T030 [US2] Component: discoverable view controls under the poster — zoom in, zoom out, fit, disabled at the bounds; the poster focusable and described; five new copy keys (vision table updated in the same change, **needs sign-off**)

## QA

- [ ] T010 [QA] e2e J2: shared-link round-trip — valid, corrupt, absent, wrong-version (`specs/006-viewer/qa.md`)
- [ ] T011 [QA] e2e J4: place lookup success and failure, with the request intercepted
- [ ] T012 [QA] a11y: axe on the viewer; keyboard navigation through the figures panel
- [ ] T013 [QA] Charter C3: link edge cases (truncated, extra padding, very old version)

**Checkpoint**: codec and state branches covered; a11y clean.

## Frontend

Spec: [`ui.md`](ui.md). Design system: [`../000-design-system/`](../000-design-system/).
Depends on the `000-design-system` tokens and components — that work lands first.

**Contract mock**: N/A — the architecture has no API (ADR-0001). The data
sources are the static `catalog.json` / `constellations.json` assets and the
`#s=` codec. No mock endpoint to stand up.

### Phase F1: Setup

- [ ] FT001 `site/src/lib/fragment.ts` — `#s=` and `#studio=` parsing; `#s=` stays byte-compatible
- [ ] FT002 Test: a `#s=` fragment decodes exactly as before; `#studio=` round-trips
- [ ] FT003 [P] Route `App.tsx` on the two fragments, keeping `path="*"` and `HashRouter`

**Checkpoint**: a legacy `#s=` link still renders the Viewer; `#studio=` opens
Studio.

### Phase F2: User Story 2 — the two surfaces (P1)

- [ ] FT004 Test: with no fragment, Landing renders both choices at equal weight
- [ ] FT005 Test: the surface `h1` exists on Landing, Studio and Viewer (today the heading is a styled `p` — a screen reader gets nothing)
- [ ] FT006 `LandingPage.tsx` → Landing + Studio; the map draws from the resolved place, before submission
- [ ] FT007 Test: a Studio control change updates the fragment with no page load
- [ ] FT008 `viewer.makeYourOwn` seeds `#studio=` from the payload; sharing from Studio re-encodes to `#s=`
- [ ] FT009 Test: after "Make your own from this sky", the Viewer is still reachable at the original `#s=`
- [ ] FT010 Place-lookup failure shows `studio.place.unresolved` inline and does not change the URL
- [ ] FT011 Reshape the Viewer to map-first; figure list becomes a horizontal scroller below 40rem
- [ ] FT012 Add the two missing announcements — poster ready, figure selected (`role="status"`)

**Checkpoint**: AC1–AC10 in `ui.md` pass; both surfaces render at 3
breakpoints.

### Phase F3: Polish

- [ ] FT013 a11y: axe zero violations at AA on Landing, Studio and Viewer; focus moves to the `h1` on fragment change
- [ ] FT014 e2e J9: Studio tuning updates the fragment without a reload
- [ ] FT015 e2e J10: "Make your own" seeds `#studio=`; sharing from Studio yields `#s=`
- [ ] FT016 Screenshot review at 3 breakpoints; record the D19 rose/verdigris judgement

**Checkpoint**: the 88 existing journeys still pass (selectors are class/role,
not colour-based); J9 and J10 added.
