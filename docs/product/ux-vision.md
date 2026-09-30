# starsky — UX and language vision

Status: Draft

Written 2026-09-30 by `frontend:uiux`, against `docs/product/brief.md`,
`docs/product/domain-model.md`, `specs/007-renderer-export` and the current
`site/` implementation. Supersedes nothing: where this document and the code
disagree, this document is the intent and the code is the debt.

---

## Summary

**starsky draws the night sky over a place and a moment, in the browser.**

The product's primary act is *seeing the map*: every star above 8 000 in the
catalog, the constellation figures drawn between them, the projection that
places the observer's horizon where it belongs. Export is real but secondary —
it exists for the moment someone says "this is my image now". The share link
comes before the download, because a link is how a map travels; a PNG is how
one person keeps it.

Three consequences run through every decision below:

1. **The map is the page.** Chrome recedes; the poster is the brightest object
   in the view and nothing competes with it.
2. **Two surfaces, one product.** Someone arriving from a shared link and
   someone arriving to build one are equally likely and must both be served
   excellently. They are different surfaces — **Viewer** and **Studio** — not
   one page with two moods.
3. **The UI agrees with the artifact.** The poster is drawn in Cormorant
   Garamond; the interface uses the same face for the same words, so the name
   "Cassiopeia" is not set twice in two different voices on the same screen.

Deliberately **not** done: a light theme (see *Decision log* D5), a TUI, and
any navigation beyond the two surfaces.

---

## Inputs used (and missing)

| Input | Status | Note |
|---|---|---|
| `docs/product/brief.md` | Read | Reconstructed by `project:introspec`; Audiences and Problem are still `[ASSUMPTION]`. The owner has since answered the audience question (below), which this document promotes from assumption to decision. |
| `docs/product/domain-model.md` | Read | Glossary terms used verbatim in the interface. |
| `docs/product/architecture.md`, `docs/product/adr/*` | Read | ADR-0001 (no server) is why place lookup is a browser `fetch` and why there is no account. |
| `specs/007-renderer-export` | Read | `render-spec.json` caption tokens and `qa.md` perf figures. |
| `site/src/**` | Inventoried | See *Current UI inventory*. |
| References directory | **None provided** | No `docs/product/references/`. Taste evidence is the brief, the domain and the rendered poster. |
| Real users | **Missing** | No analytics, no interviews. Personas below are reasoned from the brief and the owner's answers, and are marked as such. |

**Owner decisions this vision is built on** (asked 2026-09-30):

- Both audiences — shared-link reader and first-time creator — are equally
  likely; neither is secondary. Both get the same quality.
- Priority order: **read the map first**, then explore and tune, then share,
  then export. "The application main focus is to generate the sky map."
- Visual direction: a true dark-sky palette (option B), given maximum effort.
- No light theme.
- Improvements to a11y, i18n and WCAG AA are welcome; design regression is not.

---

## Current UI inventory

Kept, evolved or replaced — the `frontend:build` stage needs this list.

| Element | Today | Verdict |
|---|---|---|
| Routing | `HashRouter`, one wildcard route; `#s=` holds the payload | **Keep.** No SPA fallback on the static host, and the share fragment must not fight router paths. The two surfaces are states of one hash, not two paths. |
| Landing | A form — coordinates/place, date/time, tz, render options | **Replace with Studio.** The form is the Studio's controls; the landing becomes the choice between the two surfaces. |
| Viewer | Map + constellation list + hover scrim + focus overlay | **Keep and elevate.** It is the product. |
| Tokens | `--color-ink #0b0f19`, `--color-cream #f5efe0`, `--color-rose #b98a8a` | **Replace.** See *Visual direction* — the palette sat on an AI-default. |
| Display face | Cormorant Garamond, `font-display` | **Keep, with a defined role.** Load-bearing: BCR-0006/0007 withhold the poster if it fails to load. |
| `atlas-*` class names | ~50 classes | **Keep the names, replace the values.** Renaming them churns 506 lines and the e2e suite for no user-visible gain; retheming is a token change. |
| Copy | "Map your night sky"; three variants of the random-sky action | **Evolve.** One verb phrase everywhere; see *Microcopy patterns*. |
| Footer | Inlined in `ViewerPage.tsx` | **Extract to `SiteFooter`**, add the version. |
| Button colour | Patched per-element because the browser default failed at 2.11:1 | **Fix at the root** with `color-scheme: dark`, so the class of bug cannot recur. |

---

## Personas & jobs

No research exists; these are reasoned, and marked `[INFERRED]`.

**P1 — the recipient.** `[INFERRED]` Arrives from a link someone sent: "the
sky over our first flat", "the night we got married". They did not choose this
site and will never return to it. *Job:* see the map they were given, and
keep it. *Leaves when:* the link looks broken, the poster is blank, or the page
is slow on their phone. *Device:* phone, on mobile data, often in a messaging
app. This is the harder persona and the one the current design serves worst —
it greets them with a form.

**P2 — the giver.** `[INFERRED]` Wants a keepsake for a place and a date that
matter. *Job:* build the right moment, adjust until it looks right, share it.
*Leaves when:* they cannot tell whether the controls did anything.

**P3 — the self-hoster / developer.** `[INFERRED]` Runs their own instance,
shares links to demo it. *Job:* produce a good-looking poster quickly, share
the exact configuration. *Leaves when:* the share link is unstable or the
options are undiscoverable.

### Jobs-to-be-done

| Persona | Job | Succeeds when |
|---|---|---|
| P1 | "When someone shares their sky, show me it as they saw it." | Poster renders on a phone without interaction |
| P2 | "Help me get the night right for a place and date." | Coordinates/place and time resolve, and the change is visible |
| P2/P3 | "Let me make it mine without breaking it." | Options adjust the map and stay shareable |
| P2/P3 | "Let me keep it." | PNG/SVG/PDF matches what is on screen |

**P1 is primary for trade-offs.** Where speed of tuning conflicts with speed of
arrival, arrival wins.

---

## Principles

Five product-specific rules that settle future disputes.

1. **The map is the product, the export is the souvenir.** Never make the
   download the loudest thing on screen; the map is what was asked for.
2. **The interface never outshines the poster.** If a control draws more
   attention than the sky it describes, the control is wrong.
3. **A shared link is the primary artifact; a file is personal.** Copy the
   link before offering the download, and never imply the link is a lesser
   form of the file.
4. **The UI and the poster speak with one voice.** Celestial names and the
   caption are set in Cormorant, exactly as the artifact sets them.
5. **Say what happened and what to do next.** Errors name the cause and the
   next step; they do not apologise and never blame the visitor.

---

## Information architecture

No navigation chrome. Two surfaces, entered by intent, sharing one hash.

```
/                         landing — choose a surface
│
├── Viewer        #s=<payload>        a shared or composed moment
│                 ├── the map (primary, largest element)
│                 ├── moment caption — title, local time, projection
│                 ├── figure list — constellations, selectable
│                 ├── share actions — copy link
│                 └── export — PNG · SVG · PDF (secondary)
│
└── Studio        #s=<draft>         build and tune a moment
                  ├── the map (still primary, live)
                  ├── location — coordinates | place
                  ├── moment — date, time, timezone
                  └── appearance — projection, fisheye, separation,
                                  magnitude, glow, constellations, shape, title
```

**Why no tabs or sidebar.** Two surfaces, reachable from one decision, plus a
map that must stay dominant. A tab bar would imply more destinations than
exist; a sidebar would steal width the map needs. The Viewer is the resting
state; Studio is reached by an explicit, labelled action.

**The landing is not a form.** It is the choice: *open a shared sky* (paste a
link) or *map a moment* (Studio). A visitor with a link — P1 — must never be
made to fill in a form to see it.

**Terminology** uses the brief's glossary unchanged: **poster**, **place**,
**coordinates**, **observation**, **projection**, **shape**, **RenderOptions**.
UI-only additions: *Viewer*, *Studio*, *share link*, *figure*. New domain terms
go to the brief's glossary first, per the pipeline rule.

---

## Key flows

### F1 — Open a shared sky (P1, primary)

Entry: a `#s=` link, possibly pasted or retyped.
1. Parse the fragment. *Fail → F1-E1.*
2. Load `catalog.json` + `constellations.json`. *Fail → F1-E2.*
3. Confirm the caption font loaded (`document.fonts.check`). *Fail → F1-E3.*
4. Draw the poster, then the figure list.
5. Done — map visible, no interaction required.

**Five steps, none removable.** Step 3 exists because BCR-0007 withholds the
poster rather than substitute a typeface. Steps 2 and 3 are the two async gates
that decide whether the visitor sees anything.

*Failure branches:* **E1** unreadable fragment; **E2** star data unreachable;
**E3** font missing — in all three, say which, and offer a next step.

### F2 — Map a moment (P2, P3)

Entry: landing → "Map a moment", or an existing Viewer → "Adjust this sky".
1. Choose coordinates or place.
2. Enter coordinates, *or* a place name → geocode → resolved coordinates
   shown for confirmation before anything renders.
3. Enter date, time, timezone (auto-detected, explicit wins).
4. **The map draws from step 2 onward** — before submission.
5. Tune appearance; every change redraws and updates the share link.
6. Share the link, or export.

**Flagged for removal:** step 3's timezone can be inferred from the resolved
place; the explicit field stays as the override, but the empty-state copy should
not imply it is required.

### F3 — Keep it (P2, P3)

Entry: from the Viewer, once the map is right.
1. Choose PNG, SVG or PDF.
2. Export renders at print resolution; the PNG is the current view.
3. Confirm completion in place, next to the button that started it.

**Secondary by design** (principle 3), but one click from the map — it is the
most *personal* action in the product, so it is never more than two steps away.

---

## Screen inventory & wireframes

### 1. Landing — "which sky?"

Purpose: get the visitor to the surface that matches their intent.
Primary action: open a shared link. Content order: heading → two choices →
footer.

```
mobile (≤ 40rem)                 desktop (≥ 64rem)
┌──────────────────────┐        ┌────────────────────────────────────┐
│  Starsky             │        │  Starsky                           │
│                      │        │  The night sky over any place      │
│  The night sky       │        │  and moment                        │
│  over any place      │        │                                    │
│  and moment          │        │  ┌──────────────┐ ┌──────────────┐ │
│                      │        │  │ Open a       │ │ Map a        │ │
│  ┌────────────────┐  │        │  │ shared sky   │ │ moment       │ │
│  │ Open a shared  │  │        │  │ paste link   │ │ place/date   │ │
│  │ sky            │  │        │  └──────────────┘ └──────────────┘ │
│  │ paste a link   │  │        │                                    │
│  └────────────────┘  │        │  starsky v1.0.0 · source          │
│  ┌────────────────┐  │        └────────────────────────────────────┘
│  │ Map a moment   │  │
│  │ place, date    │  │
│  └────────────────┘  │
│  starsky v1.0.0      │
└──────────────────────┘
```

Note: the two choices are visually **equal weight**. Making "open a shared sky"
primary would be wrong — both audiences are equally likely, and demoting the
newcomer to a link box is exactly the current design's mistake in reverse.

### 2. Viewer — the product

Purpose: show the sky as it was shared, and offer to keep it.
Primary action: none required; the map is the content.
Persona: P1 first, P3 for tuning.

```
mobile                             desktop
┌──────────────────────┐          ┌────────────────────────────────────────┐
│ Starsky      v1.0.0  │          │ Starsky                       v1.0.0    │
│                      │          │                                        │
│ Our first flat       │          │ Our first flat                           │
│ 12 Jun 2024, 21:40   │          │ 12 Jun 2024, 21:40 · stereographic      │
│                      │          │                                        │
│  ┌────────────────┐  │          │  ┌────────────────────────┐ ┌──────────┐ │
│  │                │  │          │  │                        │ │ Cassiopeia│ │
│  │      ★  ·      │  │          │  │       ★    ·           │ │ 42 stars │ │
│  │   ·    ✦   ·   │  │          │  │                        │ │ mag 1.6  │ │
│  │                │  │          │  │                        │ │──────────││ │
│  └────────────────┘  │          │  └────────────────────────┘ │ Orion    │ │
│                      │          │                                │ 58 stars │ │
│  [Copy link] [PNG ▾] │          │ [Copy link] [SVG] [PDF] [PNG ▾]   │ │
│                      │          │                                └──────────┘ │
│  Figures             │          │                                        │
│  · Cassiopeia        │          │ starsky v1.0.0 · GPL-3.0 · OSM       │
│  · Orion             │          └────────────────────────────────────────┘
└──────────────────────┘
```

The map is the largest element at every width. On mobile the figure list
becomes a horizontal scroller rather than a column, so the map keeps its
aspect ratio.

### 3. Studio — build and tune

Purpose: compose a moment, seeing every change as it happens.
Primary action: the map redraws live; the share link updates silently.

```
desktop
┌──────────────────────────────────────────────────────────────┐
│ Starsky — adjust this sky                        v1.0.0      │
├────────────────────────────────┬─────────────────────────────┤
│                                │ Location                    │
│      ★     ·        ✦          │ ( • ) Coordinates           │
│   ·          ★·                 │ (   ) Place                 │
│                                │   40.7580   -73.9855        │
│                                │                             │
│                                │ Moment                      │
│                                │   Date  2024-06-12          │
│                                │   Time  21:40   Zone UTC    │
│  ┌──────────────────────────┐  │                             │
│  │ Our first flat           │  │ Appearance                  │
│  │ 40.7580°N, 73.9855°W     │  │   Projection  stereographic▾│
│  └──────────────────────────┘  │   Magnitude ──────●────     │
│                                │   Shape      (•) Circle      │
│  [Copy link] [PNG] [SVG] [PDF] │              ( ) Square      │
├─────────────────────────────┴─────────────────────────────┤
│ starsky v1.0.0 · GPL-3.0 · Stellarium CC BY-SA · OSM        │
└──────────────────────────────────────────────────────────────┘
```

**Controls on the right, map always visible on the left.** Not a submit-then-
reveal: the map draws from the moment the place resolves, so every control has
visible consequences.

---

## Visual direction & draft tokens

### The subject

Celestial cartography — engraved star charts and the brass instruments that
produced them. The shared feature is **verdigris**, the blue-green patina of
oxidised copper. That is where the accent comes from, and it is *cool*, which
is what a night sky is.

### Draft palette — dark only

Near-black with a blue cast. A real night sky has colour; neutral black reads
as "a dark theme" rather than as night.

| Token | Value | Role | Contrast |
|---|---|---|---|
| `color.bg` | `#070b14` | Page | — |
| `color.surface` | `#0d1424` | Panels | — |
| `color.raised` | `#141d31` | Hover, active rows | — |
| `color.text` | `#f2ede1` | Body text — warm white, **not** pure | 16.85:1 on bg |
| `color.text.muted` | `#a9b3c8` | Secondary | 9.34:1 |
| `color.text.faint` | `#7d879e` | Hints, meta | 5.47:1 |
| `color.accent` | `#8ec9b4` | **Verdigris.** Links, focus, selected | 10.46:1 |
| `color.accent.ink` | `#05222c` | Text on accent fill | 8.78:1 |
| `color.border` | `#55648a` | Control borders | 3.35:1 (non-text AA) |
| `color.border.soft` | `#2a3550` | Decorative only — never a control edge | 1.62:1, exempt |
| `color.focus` | `#9ee6f5` | Focus ring | 14.14:1 |

All fifteen pairs verified with the WCAG 2.2 relative-luminance formula, not
estimated. `border` clears the 3:1 non-text requirement; `border.soft` does
not and is therefore restricted to decoration.

### Type

| Role | Face | Notes |
|---|---|---|
| Display, celestial proper names, caption preview | Cormorant Garamond 300–700 | Same face as the artifact |
| UI chrome, labels, body, numbers | `system-ui` stack | Never a display face |
| Coordinates, dates, counts | system sans + `tabular-nums` | Cormorant has no tabular figures; numbers would jitter |

**The serif boundary is nouns from the sky vs. the interface's furniture.**
Constellation names in `FiguresPanel` are *the words the poster draws in the
same face*, so they are Cormorant. Buttons, labels and hints are not.

Cormorant is retained deliberately: BCR-0006/0007 make a font failure withhold
the poster, and it is already bundled (no third-party request).

### Type scale

`1.250` major third, `rem`-based, line height 1.1 for display and 1.6 for body
(serif needs the extra leading). Body line length capped at 68 characters —
serif tolerates more than sans, but the copy is short.

### Spacing, radius, elevation

4px base scale (`.25rem` … `4rem`). Radius `2px` on controls, `4px` on panels —
small, because the artifact's circle is the only curve the product needs.
Elevation is expressed with **surface lightness, not shadows**: a night sky has
no drop shadows, and `rgba(0,0,0,.1)` card shadows are an AI-default tell.

### Motion

One orchestrated moment: the map fades up once, when it is ready
(`atlas-rise`, 700 ms). Everything else is motion that answers an action — the
figure list on hover, the export button's progress. No entrance animations on
sections, no hover transitions on every card. `prefers-reduced-motion` is
already honoured in `index.css` and must survive the token change.

### Review against the AI-default list

| Default | This design |
|---|---|
| Cream bg + serif + terracotta accent | **Avoided.** Kept the serif (it is load-bearing), abandoned the cream for a blue-cast near-black, replaced rose with verdigris. |
| Near-black + single bright acid accent | **Revised.** My first draft used cyan `#7fd4e8` (11.70:1) — trait #2 almost exactly. Replaced with desaturated verdigris, which reads as patina rather than as a highlight colour. |
| Broadsheet, hairline rules, zero radius | Not used. |
| SaaS card kit, one radius, soft grey shadow | **Avoided.** Two radii by role; elevation by surface lightness. |
| Tracked-out caps eyebrow, ` · ` meta, `→` on buttons | **Avoided.** No eyebrows; meta uses `·` only inside the caption, mirroring the artifact; no arrow suffixes. |

### Tokens for `frontend:spec` to finalise

`color.bg`, `color.surface`, `color.raised`, `color.text`, `color.text.muted`,
`color.text.faint`, `color.accent`, `color.accent.ink`, `color.border`,
`color.border.soft`, `color.focus`; `font.display`, `font.ui`; `space.1`–`space.8`;
`radius.control`, `radius.panel`; `motion.duration.short`, `motion.duration.reveal`;
`shadow.none` (deliberately empty).

---

## Interaction patterns & states

**Forms.** Validate on blur, never on keystroke. Required fields state why,
not just that they are required. The timezone field is an override, not a
requirement — its hint says so.

**Feedback.** Inline and adjacent, never a toast. A toast is unreachable by
keyboard and invisible to a screen reader mid-task. Export progress renders in
place, under the button that started it.

**Destructive actions.** None exist. Overwriting a composed sky is not
destructive — it is a draft in a hash — so it needs no confirmation.

**Loading.** The poster region shows a quiet "Drawing…" with the map's own
dimensions reserved, so nothing reflows when it arrives. No spinner over the
map: a spinner implies the map is unavailable rather than arriving.

**Empty.** See *Key-screen copy*. Every empty state is an invitation to act.

**Error.** Three distinct, named states — see F1. Each says what happened and
what to do next, and each keeps the page usable.

**Undo.** Not needed — Studio state is fully described by the URL. Back is
undo, and this is worth stating in the Studio copy rather than hiding.

**Offline.** `catalog.json` is a static asset; once cached the map works with
no network. Place lookup is the only online action, and its failure is
specific ("couldn't reach the place search") rather than generic.

---

## Responsive behaviour

Breakpoints by content, not by device:

| Width | Change |
|---|---|
| ≥ 64rem | Viewer splits map / figure list side by side; Studio splits map / controls |
| 40–64rem | Single column; figure list beside the map where it fits |
| < 40rem | Single column; figure list becomes a horizontal scroller so the map keeps its aspect ratio; export actions wrap to their own row |

Touch targets: 44px minimum for every control, including figure buttons in the
scroller. Nothing is hidden at small widths except the subtitle line, which is
redundant with the caption below it.

---

## Accessibility targets

WCAG 2.2 AA minimum, verified not assumed.

- **Contrast** — all fifteen pairs in *Draft palette* computed and passing.
  `border` clears 3:1; `border.soft` is decorative-only and exempt.
- **`color-scheme: dark` on `:root`** — fixes the 2.11:1 default-button failure
  that `index.css` currently patches per-element, and makes browser scrollbars
  and form controls dark.
- **Focus** — a 2px `color.focus` ring with 2px offset on every interactive
  element, never removed. Already present in `index.css`; must survive retheming.
- **Keyboard paths** —
  - *F1*: the page requires no interaction; focus order is skip-link → figure
    list → share → export.
  - *F2*: mode radio → coordinate/place inputs → date → time → zone → each
    appearance control, in DOM order, with `aria-live="polite"` announcing
    "map updated" rather than the redraw itself.
  - *F3*: export is a `button`, never a bare link; completion is announced.
- **Reduced motion** — `atlas-rise` and every transition collapse to `none`.
- **Target size** — 44px minimum; figure buttons are the tightest case.
- **The canvas** — `role="img"` with a title-aware `aria-label` (already in
  `SkyCanvas.tsx`). It must also expose the selected figure's name and the
  caption text as text, so the map is not image-only for a screen reader.
- **Announcements** — poster ready, figure selected, export complete, and each
  error state are announced politely; only the font failure is `assertive`
  (`role="alert"`, already implemented for BCR-0007).
- **Language** — `<html lang="en">` today; the i18n keys below assume more.

---

## Voice & tone

**Voice: a cartographer's.** Precise, unhurried, quietly confident. It names
what it knows and does not perform wonder at the sky. It never says "amazing",
"stunning" or "explore".

| Moment | Tone | Do | Don't |
|---|---|---|---|
| Default | Plain and exact | "40.7580°N, 73.9855°W" | "Incredible skies!" |
| Guidance | Brief and useful | "Pick a place and a moment." | "Let's get started on your amazing journey!" |
| Success | Understated | "Link copied." | "Hooray! Your sky is ready to share!" |
| Error | Factual, then directive | "Could not read that link. It may have been cut short." | "Oops! Something went wrong." |
| Error | Own the cause | "Star data could not be loaded." | "We couldn't load your stars 🥲" |

**Rules.** No apology in an error. No exclamation marks. No emoji in
interface copy (the attribution line is prose, not a message). Say what
happened, then what to do. An error caused by the visitor's truncated link is
still stated plainly — no blame, no softening.

---

## Terminology

Glossary terms, used exactly:

| Term | In the interface | Never |
|---|---|---|
| Poster | "poster", "the poster" | chart, plot, map image |
| Place | "Place", "place name" | location, search |
| Coordinates | "Coordinates", "Latitude", "Longitude" | lat/lon in prose |
| Observation | *(not surfaced)* | — |
| Projection | "Projection", "stereographic", "fisheye" | mercator (not offered) |
| Shape | "Shape", "Circle", "Square" | round, box |
| SharePayload | *"share link"* (user-facing) | payload, fragment |
| RenderOptions | "Appearance" (the heading) | render options (technical) |

**UI-only terms:** *Viewer*, *Studio*, *figure* (a constellation drawing),
*share link*, *export*. **"Appearance"** replaces "Render options" in the
interface because it is what the controls do to a person; the domain term stays
in the code.

The `#s=` fragment is never shown raw to a visitor, except in the one error
state that needs to name it — and even there, "that link", not the payload.

---

## Microcopy patterns

**CTA verbs.** An action keeps its name through the flow: "Copy link" →
"Link copied." Not "Share" → "Shared!".

**One verb phrase for one action.** Today three variants exist for the random
sky action — "Load a random sky", "Load a random sky instead", and a lowercase
"random sky" link. All become **"Load a random sky"**, one key, every
surface. An action with two names is two actions to a first-time visitor.

**Errors.** Cause, then fix. No apology, no vagueness, no blame.

**Empty states.** An invitation to act, never an apology for absence.

**Numbers and dates.** Coordinates always `40.7580°N, 73.9855°W` — four
decimals, matching the caption exactly, because the UI and the artifact must
show the same string. Times render in the payload's own timezone, always with
the zone named (`12 Jun 2024, 21:40 UTC`), because a bare time is ambiguous
the moment someone shares it across zones.

**Placeholders.** Describe the expected shape, never repeat the label: Place →
"Times Square, New York". Title → "Our first flat".

**Never** a `→` suffix on a button, and no tracked-out capitals labels.

---

## Key-screen copy

Every key gets a stable id for `frontend:build` to wire i18n from.

**Landing**

| Key | Copy |
|---|---|
| `landing.title` | The night sky over any place and moment |
| `landing.subtitle` | Drawn from 8 000+ stars, in your browser |
| `landing.openShared` | Open a shared sky |
| `landing.openShared.help` | Paste a link that ends in `#s=…` |
| `landing.mapMoment` | Map a moment |
| `landing.mapMoment.help` | Choose a place and a date |

**Studio**

| Key | Copy |
|---|---|
| `studio.heading` | Map a moment |
| `studio.mode.coordinates` | Coordinates |
| `studio.mode.place` | Place |
| `studio.place.label` | Place |
| `studio.place.placeholder` | Times Square, New York |
| `studio.place.resolving` | Looking that place up… |
| `studio.place.resolved` | Showing {place} |
| `studio.place.unresolved` | Could not find "{query}". Try a fuller place name, or switch to Coordinates. |
| `studio.moment.legend` | Moment |
| `studio.zone.hint` | Optional — detected from the place. |
| `studio.appearance.legend` | Appearance |
| `studio.title.label` | Title |
| `studio.title.placeholder` | Our first flat |
| `studio.updated` | Map updated |

**Viewer**

| Key | Copy |
|---|---|
| `viewer.heading.default` | This night sky |
| `viewer.caption` | {coords} — {place} · {local} {tz} |
| `viewer.copyLink` | Copy link |
| `viewer.linkCopied` | Link copied |
| `viewer.linkFailed` | Could not copy the link. Select the address bar and copy it. |
| `viewer.export.png` | PNG |
| `viewer.export.svg` | SVG |
| `viewer.export.pdf` | PDF |
| `viewer.export.working` | Drawing at full resolution… |
| `viewer.export.done` | Saved {filename} |
| `viewer.export.failed` | The {format} export failed ({detail}). The map is unaffected — try again. |
| `viewer.adjust` | Adjust this sky |

**States**

| Key | Copy |
|---|---|
| `empty.title` | No sky on this page yet |
| `empty.body` | This page reads a shared moment from its address — look for a link ending in `#s=…`. |
| `empty.action` | Load a random sky |
| `legacy.title` | An older kind of link |
| `legacy.body` | That link comes from an earlier version. Map a fresh moment instead. |
| `invalid.title` | This link holds no sky |
| `invalid.body` | The link could not be read ({detail}). It may have been cut short. |
| `dataError.title` | Star data could not be loaded |
| `dataError.body` | Regenerate it with `starsky catalog` and reload. |
| `fontError.title` | The poster font could not be loaded |
| `fontError.body` | The poster is withheld rather than drawn in a substituted typeface. |
| `loading.poster` | Drawing the sky… |

**Footer**

| Key | Copy |
|---|---|
| `footer.version` | starsky v{version} |
| `footer.source` | source |
| `footer.attribution` | Star data from Hipparcos and JPL. Constellation lines from Stellarium (CC BY-SA 4.0). Place lookup by OpenStreetMap contributors. |

---

## Localization

- **Target locales: `en` first.** Keys above are the contract for adding more.
- **Text expansion: 40% allowance** on buttons and legend text — Portuguese and
  German are the likely next targets and both expand.
- **Do not translate:** the `#s=` fragment format; coordinate formats (the
  artifact writes them and the UI must match the artifact); the version string;
  the GPL and CC BY-SA notices, which are legal text.
- **Numbers stay Latin digits** even where a locale prefers otherwise, because
  the poster's caption uses them.
- **`Intl.DateTimeFormat` with an explicit `timeZone`** is already used in
  `caption.ts`; the i18n layer must not reintroduce a locale-dependent default.
- **`<html lang>`** is set per locale, not just `en`.

---

## Terminal interface

**Not applicable.** No TUI was requested, and `frontend:tui`'s own rule is
never to add one unasked. `starsky catalog` and `starsky cache warm` are the
CLI and are specified in `specs/002-catalog-cli` and `specs/005-data-cache`.

---

## Open questions

1. **`starsky-site` is at `1.0.0`** while the product has never been released.
   Is that the intended first public version, or should the footer's `version`
   track a repo-wide version shared with `pyproject.toml`?
2. **The brief's `[ASSUMPTION]`s** — metrics, out-of-scope list — are still
   assumed. This vision promotes the audience question to decided (from the
   owner's answer); the rest still need `project:init` confirmation.
3. **`ExportControls` vs. the footer's "Save image"** — the Viewer offers
   "Save image" in the footer and PNG/SVG/PDF in the controls. Consolidating to
   one export surface is a `frontend:build` call; the vision specifies one
   surface, with the copy keys above.
4. **Studio's entry from the Viewer** ("Adjust this sky") implies the Viewer
   owns a Studio session. Confirm whether tuning should be a *mode* of the
   Viewer or a distinct surface with its own URL — the IA above treats it as
   one surface in two states.

---

## Decision log

| # | Choice | Rejected | Why |
|---|---|---|---|
| D1 | Two surfaces, Viewer and Studio | One page with a form that morphs | The two audiences have opposite first needs. A visitor with a link must not face a form. |
| D2 | Landing offers both as equal weight | "Open a shared sky" as primary | Both audiences are equally likely; ranking one implies the other is secondary, which the owner rejected. |
| D3 | Verdigris `#8ec9b4` accent | Cyan `#7fd4e8` (my first draft) | Cyan on near-black is AI-default trait #2. Verdigris is subject-derived from oxidised brass and reads as patina, not as a highlight. |
| D4 | Blue-cast near-black `#070b14` | Keeping `#0b0f19`; warm cream | A night sky has colour. Cream + serif + warm accent is AI-default trait #1. |
| D5 | **Dark only** | Shipping a light theme too | Offered and declined. A second theme doubles the token and contrast surface, and "dark page, bright poster" is the concept — a light page competes with the artifact. Revisit only with a reason beyond symmetry. |
| D6 | Cormorant retained, scoped by role | Replacing it; or serif everywhere | It is load-bearing (BCR-0006/0007) and it is the artifact's voice. Serif everywhere would give "Save image" a display voice it has not earned. Boundary: celestial nouns vs. interface furniture. |
| D7 | Keep `atlas-*` class names, replace values | Renaming the classes | Renaming churns 506 lines of CSS and the e2e selectors for no user-visible gain; retheming is a token change. |
| D8 | Elevations by surface lightness | Shadows | A night sky casts no shadows, and uniform soft shadows are an AI-default tell. |
| D9 | `color-scheme: dark` to fix control colours | Per-element `color` patches | Fixes the class of bug; the current 2.11:1 patch is an instance of it. |
| D10 | One verb phrase for the random-sky action | Three existing variants | An action with two names reads as two actions. |
| D11 | Footer links the repository root | devenv's `tree/<version>` link | devenv assumes a tag per version; `1.0.0` has no tag, so that link would 404. |
| D12 | Live-updating map in Studio | Submit-then-reveal | Every control must have a visible consequence; principle 2 depends on the map staying dominant. |