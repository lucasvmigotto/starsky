# Implementation Plan: design-system

**Branch**: `000-design-system` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

## Summary

Establish the interface's design vocabulary — tokens, typography, layout, the
component inventory with states, motion, accessibility rules and i18n
conventions — as a Tailwind v4 `@theme` block plus `atlas-*` semantic classes,
without touching `site/render-spec.json`.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.1
**Primary Dependencies**: Vite 6.3.5, Tailwind CSS v4 (`@import "tailwindcss"`)
**Storage**: N/A — no API (ADR-0001); data is static JSON
**Testing**: `bun test` for unit/component, Playwright for e2e, axe for a11y
**Target Platform**: Any modern browser; WebKit/Safari must clear AA

## Frontend decisions not covered by a feature plan

*(`frontend:spec` records technical frontend decisions here, with rationale.)*

### Tokens live in `@theme`, not a second stylesheet

Tailwind v4's `@theme` generates both the CSS custom properties and the
utility classes from one declaration. Declaring the palette there means
`text-cream/65` and `var(--color-cream)` cannot drift, which is precisely the
class of bug that produced the existing `/opacity` suffixes scattered through
`index.css` (`text-cream/55`, `text-cream/70`).

**Semantic names only** (`--color-text-muted`), never primitives (`--color-gray-600`):
a component must not be able to name "gray-600" and bypass the role it is in.

### `color-scheme: dark` fixes the class, not the instance

The 2.11:1 button failure was patched by setting `color` on `.atlas-figure`
with a comment explaining why. The actual fix is one declaration on `:root`;
the patch then becomes unnecessary. It also darkens scrollbars and native
`<select>` popups, which no per-element rule reaches.

### No component library

The inventory is small (14 components), the stack is already Tailwind, and the
product's visual identity is the point. A library would add a second styling
system to fight and would have to be overridden to look like anything here.

### No state-management or form library

State is one hash fragment and a handful of `useState`. Adding Zustand or
React Hook Form for that is unjustified weight; `frontend:build` reconsiders
only if Studio's tuning state grows beyond the hash.

### Contrast is tested, not documented

The ratio table is enforced by a unit test that computes each pair, so a token
edit that breaks AA fails the build instead of shipping. A table in a document
drifts silently; this is the difference between a spec that says 4.5:1 and one
that *keeps* saying it.

### i18n: keys now, framework later

No i18n dependency is added in this feature. Components adopt the key convention
and resolve strings through a thin `t()` helper backed by an `en-US` catalogue
generated from the vision's tables. `frontend:build`'s later slice swaps the
catalogue implementation for a real framework without touching call sites.

## Constitution alignment

| Principle | How this plan honours it |
|---|---|
| I. Static-first, no server | Tokens are static CSS; no runtime dependency added. |
| II. One renderer, one contract | `render-spec.json` untouched (DS-008, D19). The UI palette is explicitly independent. |
| III. Determinism | The poster's caption format is unchanged; `pt-BR` must never reach the artifact (vision D16). |
| IV. Test-first, evidence-backed | The contrast table is enforced by a test; every component state is a test. |

## Risks

| Risk | Mitigation |
|---|---|
| The rose/verdigris tension looks wrong (D19) | Escalation path is a BCR against `render-spec.json`, not a CSS tweak. Screenshot review before the retheme is signed off. |
| A retheme breaks 88 e2e journeys | `atlas-*` names are preserved (DS-003); selectors are class- and role-based, not colour-based. |
| i18n keys adopted inconsistently | The lint rule in Phase 1 flags raw user-visible literals in components. |