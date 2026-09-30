# Feature Specification: design-system

**Feature Branch**: `000-design-system`

**Created**: 2026-09-30

**Status**: Draft

**Input**: `docs/product/ux-vision.md` (Status: Draft, 19 decisions). Produced by
`frontend:spec`. Every token, component and rule below is finalised from the
vision's draft tokens — the vision's own wording is the intent, this document
is the contract an engineer implements without guessing.

## Scope and boundary

This feature owns **no screen**. It owns the vocabulary every screen is built
from: tokens, typography, layout primitives, the component inventory with its
states, motion, accessibility rules expressed as testable assertions, and the
i18n conventions.

**The one hard boundary: this feature does not touch `site/render-spec.json`.**
That file is the poster's normative visual contract (constitution principle II)
and is guarded by `spec.test.ts:32`, by literal hex assertions in
`boundaries.test.ts` and `poster.test.ts`, and by stored reference PNGs. The
interface palette and the poster palette are deliberately independent — vision
decision D19. A change there is a BCR, not a task.

## User Scenarios & Testing

### User Story 1 - A theme that meets AA (Priority: P1)

As a person using the site, every piece of text and every control boundary is
legible, in both the settled and the focused state, and I never have to guess
whether a control is interactive.

**Why this priority**: Legibility is not an enhancement. The current code
already carries a comment recording a button at 2.11:1 that had to be patched
element by element; that patch is an instance of a missing rule, and this
feature supplies the rule.

**Independent Test**: Load any page and assert every token pair in the contrast
table below. No component required.

**Acceptance Scenarios**:

1. **Given** the settled page, **When** any text token is measured against its
   background, **Then** the ratio is at least 4.5:1.
2. **Given** any control boundary, **When** it is measured against its
   background, **Then** the ratio is at least 3:1.
3. **Given** any focusable element, **When** it receives keyboard focus,
   **Then** a 2px ring at ≥3:1 is visible and not clipped.
4. **Given** `border.soft`, **When** it is used, **Then** it is decorative only
   — never as a control's sole boundary.

### User Story 2 - One component vocabulary (Priority: P1)

As a developer adding a surface, I use existing components with known states
rather than inventing a new button, so two screens never disagree about what
"selected" looks like.

**Why this priority**: The two new surfaces (Viewer, Studio) are built at the
same time as the design system. A drift here is permanent and invisible in
review.

**Independent Test**: Render each inventory component and assert every state in
its row of the state matrix.

**Acceptance Scenarios**:

1. **Given** a component in the inventory, **When** it is rendered in each of
   its listed states, **Then** it is visually distinct and the DOM carries the
   matching ARIA attribute.
2. **Given** a state that conveys selection, **When** a screen reader inspects
   it, **Then** it reports pressed or selected — not merely a colour.

### User Story 3 - Copy that is ready to translate (Priority: P2)

As a translator, every string on the page is addressed by a stable key, and
nothing user-visible is hardcoded in a component.

**Why this priority**: `pt-BR` is the confirmed second locale, but it ships as
its own slice after the retheme. This feature makes the strings *ready* so that
slice is additive rather than a rewrite.

**Independent Test**: Grep the components for user-visible literals; every one
resolves to a key in the vision's copy tables.

**Acceptance Scenarios**:

1. **Given** any component, **When** user-visible text is rendered, **Then** it
   comes from a key present in the vision's copy tables.
2. **Given** `pt-BR`, **When** it is selected, **Then** the interface translates
   and the poster's caption does not.

## Requirements

### Functional Requirements

- **DS-001**: MUST define semantic colour tokens (not primitives) with the exact
  values and ratios in the contrast table.
- **DS-002**: MUST set `color-scheme: dark` on `:root`, so browser-provided
  controls (scrollbars, native selects, default button colour) render dark
  without per-element patches.
- **DS-003**: MUST preserve the existing `atlas-*` class names, replacing their
  values rather than renaming them (vision D7 — renaming churns 506 lines and
  the e2e selectors for no user-visible gain).
- **DS-004**: MUST define every component in the inventory with all eight states
  enumerated, and name the WAI-ARIA APG pattern where one applies.
- **DS-005**: MUST define a motion token set and disable all non-essential motion
  under `prefers-reduced-motion: reduce`.
- **DS-006**: MUST define the string-key convention as dotted lowerCamelCase
  (`viewer.makeYourOwn`) matching the vision's copy tables exactly.
- **DS-007**: MUST NOT reference any colour outside the token table in component
  CSS; raw hex in a component is a defect.
- **DS-008**: MUST NOT alter `site/render-spec.json`.

### Accessibility Requirements (WCAG 2.2 AA)

- **DS-A11Y-001**: Text ≥4.5:1; large text and UI boundaries ≥3:1. Ratios are
  enumerated below and are computed, not estimated.
- **DS-A11Y-002**: Every interactive element shows a 2px `color.focus` ring at
  2px offset on `:focus-visible`. The ring is never `outline: none`.
- **DS-A11Y-003**: Every interactive target is ≥44×44 CSS px (AA target size).
- **DS-A11Y-004**: `prefers-reduced-motion: reduce` collapses the reveal
  animation and every transition to `none`.
- **DS-A11Y-005**: Async outcomes are announced — `role="status"` +
  `aria-live="polite"` for poster-ready, figure-selected and export-complete;
  `role="alert"` (assertive) only for the font failure, which withholds the
  poster (BCR-0007).
- **DS-A11Y-006**: The canvas is `role="img"` with a title-aware `aria-label`,
  and the selected figure's name and the caption are also exposed as text.

## Contrast table (computed, not estimated)

WCAG 2.2 relative luminance. **All values re-derived from the hexes; a token
change invalidates this table and the test.**

| Foreground | Background | Ratio | Requirement | Verdict |
|---|---|---|---|---|
| `color.text` `#f2ede1` | `color.bg` `#070b14` | 16.85:1 | 4.5 | pass |
| `color.text` `#f2ede1` | `color.surface` `#0d1424` | 15.73:1 | 4.5 | pass |
| `color.text` `#f2ede1` | `color.raised` `#141d31` | 14.38:1 | 4.5 | pass |
| `color.text.muted` `#a9b3c8` | `color.bg` `#070b14` | 9.34:1 | 4.5 | pass |
| `color.text.muted` `#a9b3c8` | `color.surface` `#0d1424` | 8.72:1 | 4.5 | pass |
| `color.text.faint` `#7d879e` | `color.bg` `#070b14` | 5.47:1 | 4.5 | pass |
| `color.accent` `#8ec9b4` | `color.bg` `#070b14` | 10.46:1 | 4.5 | pass |
| `color.accent` `#8ec9b4` | `color.surface` `#0d1424` | 9.77:1 | 4.5 | pass |
| `color.accent.ink` `#05222c` | `color.accent` `#8ec9b4` | 8.78:1 | 4.5 | pass |
| `color.focus` `#9ee6f5` | `color.bg` `#070b14` | 14.14:1 | 3 | pass |
| `color.focus` `#9ee6f5` | `color.surface` `#0d1424` | 13.21:1 | 3 | pass |
| `color.border` `#55648a` | `color.bg` `#070b14` | 3.35:1 | 3 | pass |
| `color.border` `#55648a` | `color.surface` `#0d1424` | 3.13:1 | 3 | pass |
| `color.border.soft` `#2a3550` | `color.bg` `#070b14` | 1.62:1 | — | **decorative only** |

**The exemption is deliberate.** `border.soft` draws dividers and panel edges
that convey no information alone. It MUST NOT be the only boundary of an
interactive control — that is what `color.border` is for.

## Out of Scope

- Any screen (those belong to `006-viewer` and `007-renderer-export`).
- Any change to the poster's rendering or its tokens.
- The `pt-BR` catalog and locale switching — its own slice, after the retheme
  (vision D17).
- A light theme — declined by the owner, recorded as D5.

## Review

**Notes**: `/speckit-checklist` before the next stage. This feature has no
contract operations because the architecture has no API (ADR-0001); its
"operations" are CSS custom properties.