# UI Specification: viewer

Feature: `006-viewer` | Layer: UI | Input: `docs/product/ux-vision.md`

This layer adds the UI contract for `006-viewer`. It does not change the
feature's business requirements, its share codec, or `render-spec.json`.

## Coverage matrix

| Screen / flow (vision) | Feature | User story | Data source |
|---|---|---|---|
| Landing — "which sky?" | `006-viewer` | US2 (extends it) | none |
| Studio — build and tune | `006-viewer` | US2 | Nominatim + `catalog.json` |
| Viewer — the product | `006-viewer` | US2 | `catalog.json`, `constellations.json` |
| Empty / Legacy / Invalid states | `006-viewer` | US2 | `#s=` decode only |
| Export controls (PNG/SVG/PDF) | `007-renderer-export` | US2 | see that file's `ui.md` |

**No screen is unowned and no story is screenless.** The vision's two surfaces
split cleanly: `006-viewer` owns the map and the moment; `007` owns the export.

**Contract substitution.** The architecture has no API (ADR-0001), so
`operationId` columns below name **static asset fetches** and the **share
codec** — the same substitution `specs/README.md` records. There is no
`contracts/openapi.yaml` to mock; `000-design-system` T006 records that.

## Routes

One route, one hash. `HashRouter` with `path="*"` stays — the static host has no
SPA fallback, and the share fragment must not fight router paths.

| Fragment | Surface | Title | Auth |
|---|---|---|---|
| *(empty)* | Landing | The night sky over any place and moment | none |
| `#s=<payload>` | Viewer | `<title> — Starsky` | none |
| `#studio=<draft>` | Studio | Make your own — Starsky | none |

**`#s=` and `#studio=` are separate prefixes (vision D13).** `#s=` is the
canonical shared artifact and stays byte-compatible with every link in the
wild. `#studio=` is a tuning session. Sharing from Studio re-encodes to `#s=`,
so a recipient lands on the map rather than in an editor.

## Screens

### 1. Landing

**Purpose**: get the visitor to the surface matching their intent.
**Primary action**: open a shared sky.
**Personas**: P1 (recipient) and P2 (giver) equally — neither is secondary.

```
mobile (≤ 40rem)                 desktop (≥ 64rem)
┌──────────────────────┐        ┌────────────────────────────────────┐
│ Starsky              │        │ Starsky                            │
│ The night sky over  │        │ The night sky over any place       │
│ any place and moment │        │ and moment                         │
│ ┌────────────────┐  │        │ ┌──────────────┐ ┌──────────────┐ │
│ │ Open a shared  │  │        │ │ Open a       │ │ Map a        │ │
│ │ sky            │  │        │ │ shared sky   │ │ moment       │ │
│ │ paste a link   │  │        │ │ paste link   │ │ place/date   │ │
│ └────────────────┘  │        │ └──────────────┘ └──────────────┘ │
│ ┌────────────────┐  │        │ Language: English ▾                │
│ │ Map a moment   │  │        └────────────────────────────────────┘
│ └────────────────┘  │
└──────────────────────┘
```

The two choices are **equal weight**. Ranking "open a shared sky" as primary
would demote the newcomer; ranking "map a moment" primary is the mistake the
current form-first landing makes (D2).

**Components**: `SiteFooter`, `Button` (primary + secondary), `Surface`,
`LocaleSelect`.

### 2. Studio

**Purpose**: compose a moment, seeing every change as it happens.
**Primary action**: none required — the map redraws live.

```
desktop
┌──────────────────────────────────────────────────────────────┐
│ Starsky — Make your own                          v1.0.0      │
├────────────────────────────────┬─────────────────────────────┤
│      ★     ·        ✦          │ Location                    │
│   ·          ★·                 │ (•) Coordinates             │
│                                │ (   ) Place                 │
│                                │                             │
│                                │ Moment                      │
│  ┌──────────────────────────┐  │   Date  2024-06-12          │
│  │ Our first flat           │  │   Time  21:40  Zone UTC     │
│  │ 40.7580°N, 73.9855°W     │  │                             │
│  └──────────────────────────┘  │ Appearance ▾                │
│  [Copy link]                   │   Projection stereographic▾ │
└────────────────────────────────┴─────────────────────────────┘
```

**Controls beside a live map, never a submit-then-reveal** (D12). Entered with
`#studio=` empty, or seeded from the Viewer via "Make your own from this sky".

### 3. Viewer

**Purpose**: show the sky as it was shared, and offer to keep it.
**Persona**: P1 first.

```
mobile                             desktop
┌──────────────────────┐          ┌────────────────────────────────────────┐
│ Starsky      v1.0.0  │          │ Starsky                       v1.0.0    │
│ Our first flat       │          │ Our first flat                           │
│ 12 Jun 2024, 21:40   │          │ 12 Jun 2024, 21:40 · stereographic      │
│ ┌────────────────┐   │          │ ┌────────────────────────┐ ┌──────────┐ │
│ │     ★    ·     │   │          │ │       ★    ·           │ │ Cassiopeia│ │
│ │  ·     ✦   ·   │   │          │ │                        │ │ 42 stars │ │
│ └────────────────┘   │          │ └────────────────────────┘ └──────────┘ │
│ [Copy link]           │          │ [Make your own from this sky]           │
│ Figures ▸             │          │ [Copy link] [PNG] [SVG] [PDF]           │
└──────────────────────┘          └────────────────────────────────────────┘
```

The map is the largest element at every width. Below 40rem the figure list
becomes a horizontal scroller so the map keeps its aspect ratio.

**Components**: `SkyCanvas`, `FiguresPanel`, `ExportControls` (`007`),
`SiteFooter`, `Button`, `Tooltip`, `FigureList`.

## Data

| Screen | Source | When | On error |
|---|---|---|---|
| Landing | none | — | — |
| Studio | `geocodePlace()` → Nominatim | on place mode + submit, or debounced on input | `studio.place.unresolved` inline; mode unchanged, **no navigation** |
| Studio | `catalog.json` | on first successful resolve | `dataError.*` alert; controls stay usable |
| Viewer | `#s=` decode | on mount + `hashchange` | `invalid.*` / `legacy.*` state screen |
| Viewer | `catalog.json`, `constellations.json` | once per session, cached | `dataError.*` |
| Viewer | bundled font | before the poster is trusted | `fontError.*` **assertive**; poster withheld (BCR-0007) |
| Both | `Intl.DateTimeFormat` | render | `caption.ts` already falls back to UTC |

**Optimistic updates**: every Studio control updates the fragment immediately;
no server round-trip exists to be optimistic about.

**Stale**: the two JSON assets are content-hashed by `starsky catalog`; a stale
cache shows the previous sky, which is acceptable offline and must not be
signalled as an error.

## State matrix

| Region | Loading | Empty | Partial | Success | Error | Offline | Unauthorised |
|---|---|---|---|---|---|---|---|
| Poster region | `loading.poster`, map dimensions reserved | `empty.*` on Viewer without `#s=` | n/a | `ready`, announced politely | `fontError.*` **assertive** | cached assets only | **N/A** — no accounts (D18 scope) |
| Catalog fetch | quiet, no spinner over the map | — | — | map drawn | `dataError.*` | works from cache | N/A |
| Place lookup | `studio.place.resolving` | — | — | `studio.place.resolved` | `studio.place.unresolved` | unreachable | N/A |
| Figure list | hidden until `model` | — | — | list rendered | hidden with `dataError` | works from cache | N/A |
| Export | `viewer.export.working` | — | — | `viewer.export.done` | `viewer.export.failed` | n/a | N/A |
| Studio controls | disabled until place resolves | fields empty | — | live | stay usable | tuning works | N/A |

**No spinner over the map** — a spinner says "unavailable"; the map is
arriving. **No unauthenticated column values** anywhere: scope is closed, there
is no account (Q2).

## Interactions

- **Validation on blur**, never on keystroke. Coordinates: lat [-90, 90], lon
  [-180, 180]. Required fields say *why*, not just *that*.
- **Timezone is an override, not a requirement** — its hint says so.
- **No destructive actions**; no confirmation dialogs. Tuning is a draft in a
  fragment, so back is undo, and the copy says so rather than hiding it.
- **Escape** closes the zoom/selection overlay; **arrow keys** move between
  figures; the figure list is a roving-tabindex listbox.
- **No keyboard shortcuts for export** — it is one click away and must not be
  mistriggered.

## Copy

Every string is a key in `docs/product/ux-vision.md` → *Key-screen copy*. The
full tables are there; this layer adds only the ones the current code hardcodes
and must replace:

| Key | Copy | Replaces |
|---|---|---|
| `viewer.makeYourOwn` | Make your own from this sky | "Adjust this sky" (D14) |
| `viewer.randomSky` | Load a random sky | three variants today (D10) |
| `viewer.copyLink` | Copy link | — |
| `viewer.linkCopied` | Link copied | — |
| `landing.openShared` | Open a shared sky | — |
| `landing.mapMoment` | Map a moment | "Show my sky" |
| `studio.updated` | Map updated | new |

`landing.locale.*`, `studio.place.*`, `viewer.export.*` and `viewer.*` error
keys are specified in full in the vision — not repeated here.

## Accessibility

- **Landmarks**: `header` (banner), `main`, `footer` (contentinfo).
- **Heading outline**: `h1` = the surface's own title (poster title, or "Map a
  moment"); no `h2` skips. The `atlas-moment` heading is `h1`, not a `p` with
  display styling — a screen-reader user currently gets no heading at all.
- **Focus order**: skip-link → surface `h1` region → figure list → share →
  export. On route/fragment change, focus moves to the `h1`.
- **Announcements**: poster ready and figure selected are **missing today** and
  are added (`000-design-system` T035); export status already announces via
  `role="status"`.
- **Canvas**: `role="img"` + title-aware `aria-label` (already present), and
  the caption and selected figure name exposed as text.
- **`aria-pressed`** on figure buttons (already present) — selection is
  announced, not only coloured.

## Responsive

| Width | Landing | Viewer | Studio |
|---|---|---|---|
| ≥64rem | two choices side by side | map + figure list, split | map + controls, split |
| 40–64rem | stacked | single column | single column |
| <40rem | stacked | figure list → horizontal scroller | controls below map |

Touch targets ≥44px (DS-A11Y-003).

## Acceptance criteria

- **AC1** Given no fragment, when the page loads, then Landing shows both
  choices at equal weight and `SiteFooter` renders `starsky v<version>`.
- **AC2** Given a valid `#s=`, when it loads, then the poster renders with no
  interaction required, and the map is the largest element.
- **AC3** Given a corrupt `#s=`, then `invalid.*` shows and offers one action.
- **AC4** Given a legacy version, then `legacy.*` shows.
- **AC5** Given a place that does not resolve, then `studio.place.unresolved`
  shows inline and the URL does not change.
- **AC6** Given a Studio change, then the map redraws and the fragment updates
  without a page load.
- **AC7** Given "Make your own from this sky", then `#studio=` is seeded from
  the payload and the Viewer remains reachable at `#s=`.
- **AC8** Given any error state, then it names the cause and a next step, and
  never apologises.
- **AC9** Given a screen reader, then the surface has an `h1` and poster-ready
  and figure-selected are announced.
- **AC10** Given a shared link opened on mobile data, then the poster renders
  from cache without a second network round trip.

## Test plan

- **Component**: each state matrix row renders its copy key; `#s=`/`#studio=`
  routing; place-resolve success and failure.
- **a11y**: axe zero violations at AA on all three surfaces; keyboard walk of
  the figure list; `h1` present on each surface; announcement assertions.
- **e2e** (extend existing journeys in `qa.md`, do not duplicate): J2
  shared-link round-trip; J4 place lookup; **new** J9 Studio tuning updates the
  fragment without a reload; **new** J10 "Make your own" seeds `#studio=` and
  sharing from Studio yields `#s=`.
- **Visual**: screenshots at 3 breakpoints; the D19 rose/verdigris review.

## Gaps reported upstream

- **No `contracts/openapi.yaml`** (ADR-0001) — the data table names static
  assets and the share codec instead. Recorded, not invented around.
- **`ui.md` for `002`/`005`/`008`** — none have UI; correct, and no
  `tui.md` is created because no terminal interface was requested.