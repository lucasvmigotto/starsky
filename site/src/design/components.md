# Component inventory

`000-design-system` T019/T020. The contract every surface is built from.

**Status legend** — `built` exists in `src/components/`; `planned` is named by a
`ui.md` and not yet written. Planned components are specified here so the next
surface is built from this vocabulary instead of inventing its own, but they are
**not** claimed to exist.

Nothing here may reference a raw colour or a hardcoded string: `tokens.ts` and
`t()` are the sources, and two lint rules (`design/no-raw-token-values`,
`design/no-literal-copy`) enforce it at error severity.

## Naming

Existing components keep their `atlas-*` CSS classes (vision D7 — renaming
churns 506 lines and every e2e selector for no user-visible gain), but they are
**React components**, referenced by their PascalCase export. `ds003` in
`atlas-classes.test.ts` guarantees the class names survive a retheme.

---

## Primitives

### `Surface` — planned

A panel. One purpose: group related content on the page background.

- **Variants**: `panel` (bordered, `--color-surface`), `raised` (hover/active)
- **States**: default · hover · (selected is the *content's*, not the surface's)
- **Radius**: `--radius-panel` (12px; controls use `--radius-control`, 8px; a surface that shows the poster uses `--radius-artifact`). Elevation is surface lightness, never a shadow
- **Do**: use for a group of controls or figures. **Don't**: use for a single
  control, or stack two surfaces inside each other

### `Button` — built as CSS classes, planned as a component

The three existing class families, which already satisfy the state matrix:

| Class | Role | Fill |
|---|---|---|
| `atlas-btn` | primary | `--color-text` on `--color-bg` |
| `atlas-btn-ghost` | secondary | transparent, bordered |
| `atlas-btn-subtle` | tertiary | transparent, faint |
| `atlas-export-trigger` | disclosure | accent border and text |

- **States**: default · hover · focus-visible · disabled · busy
- **Target**: `min-height: 44px` on every one (DS-A11Y-003), asserted by
  `atlas-classes.test.ts`
- **Focus**: `outline: 2px solid var(--color-focus)` at 2px offset, never removed
- **Do**: the label says what happens ("Copy link" → "Link copied"). **Don't**:
  append `→`, use ALL CAPS, or give one action two names

### `Tooltip` — built (as `ExplorerTooltip`)

The Explorer's star tooltip, one line: `<Name> • Magnitude <value>`
(`explorer.tooltip.detail`). The Viewer has none since BCR-0013.

- **States**: hidden · visible (after a mouse or pen rests on a star for 1.5 s)
- **A11y**: `aria-hidden` and `pointer-events: none` — the inspector gives the
  same facts to screen readers and it must never steal a click
- **Motion**: none. It appears on an action, so an entrance animation would lag

### `StatusRegion` — built (`.atlas-export-status`)

- **Role**: `role="status"`, `aria-live="polite"`
- **Content**: export idle / working / done / failed
- **Critical**: `min-height` is reserved so announcing a message does not shift
  the layout. And status is **never** conveyed by colour alone — `viewer.linkCopied`
  says "Link copied", not "green"
- **Assertive?** No. `role="alert"` is reserved for the font failure, which
  withholds the poster (BCR-0007)

### `LocaleSelect` — planned

`en-US` / `pt-BR`. A native `<select>`: two options do not justify a listbox,
and a native control gets keyboard behaviour and the platform picker for free.

- **States**: default · focus-visible
- **Do**: label it (`landing.locale.label`). **Don't**: ship it before `pt-BR`
  exists — a picker with one option is a lie about the feature

---

## Composites

### `SkyCanvas` — built

The poster itself, drawn with the browser as the only renderer (ADR-0003).

- **States**: loading (`viewer.loading`) · ready · error (`dataError.*`) ·
  font-withheld (`fontError.*`, **assertive**, poster not drawn)
- **Interaction**: none. The image is static: no hover, selection, drag, wheel,
  pinch or keys, and no zoom buttons (BCR-0013, FR-010). Zooming and exploring
  live in the Explorer, reached from "Explore this sky"
- **Image only**: the blit crops the composition to its square sky region, so
  the caption band the exports carry is never on the page
- **A blit of a cached composition**, not a re-render (BCR-0002)
- **A11y**: `role="img"` with a title-aware `aria-label` and the caption as
  `sr-only` text. It is not focusable: there is nothing to operate
- **Never**: take a colour from a UI token. Everything inside the canvas comes
  from `render-spec.json` (vision D19)

### `ExportControls` — built

One disclosure trigger, three formats.

- **States**: collapsed (`aria-expanded="false"`) · expanded · per-format busy
  (`aria-busy`, all three `disabled` — no concurrent exports) · done · failed
- **Never persisted**: the hash is the share payload, so "expanded" must not be
  written into it. It reverts on reload
- **Exports the composed poster, not the screen** — `renderPosterToCanvas` at
  `EXPORT_SIZE_PX`, so a panned or zoomed view never changes the artifact
- **A11y**: `aria-expanded` + `aria-controls` pointing at a real element; the
  group is named by the trigger that discloses it; no menu keyboard model
- **One export surface** (vision D15): no second download control anywhere

### `SiteFooter` — built

- **Content**: `footer.version` (with `__APP_VERSION__`), printed as the
  footer's one link `starsky@v<version>` to the source · `footer.attribution`
- **Actions on the right** (Viewer and Studio, FR-011): icon-only buttons for
  Share, Export and the page's hand-off, as `PosterActions`. Share and Export
  open a popover above their button, one at a time. On a phone the actions row
  comes first, then the version and attribution
- **Rule**: links the repository **root**, never `tree/<version>` — a tag may not
  exist for that version and the link would 404
- **Attribution is legal text** and is never translated or abbreviated

### `States` — built (`EmptyState`, `LegacyState`, `InvalidState`)

The three non-ready branches of the Viewer, sharing one `State` shape: a
heading, an explanation, and exactly one way forward.

| Component | Shown when | Copy |
|---|---|---|
| `EmptyState` | no `#s=` fragment | `empty.*` |
| `LegacyState` | a pre-`v1` fragment | `legacy.*` |
| `InvalidState` | the fragment will not decode | `invalid.*` + `{detail}` |

- **One action each**: `viewer.randomSky` in all three. Three variants of this
  phrase existed and read as three actions (vision D10)
- **Errors name the cause and a next step.** No apology, no blame
- **`{detail}` is shown, not swallowed** — but it is the parser's message, so
  the sentence around it carries the meaning

---

## Patterns

### Disclosure

One trigger, `aria-expanded` + `aria-controls`, content revealed in place. Used
by `ExportControls`. Chosen over a menu because it needs no arrow-key handling,
no `Escape` and no focus return — a menu's whole cost buys nothing for three
static buttons.

### Async gate

The three things that decide whether a visitor sees anything: catalog fetch,
caption font, fragment decode. Each has a distinct message and each keeps the
page usable. Loading reserves the map's dimensions so nothing reflows when the
poster arrives.

### Copy resolution

`t(key, params)` with `src/i18n/en-US.ts` as the catalogue and
`docs/product/ux-vision.md` as the source of truth.
`scripts/check_i18n_keys.py` fails the build if the two disagree in either
direction, so a key cannot exist in one and not the other. A key that does not
resolve renders as `⟨key⟩` and warns — visible, never silently blank.