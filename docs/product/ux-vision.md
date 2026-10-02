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
| Routing | `HashRouter`, one wildcard route; `#s=` holds the payload | **Keep, extend.** No SPA fallback on the static host, and the share fragment must not fight router paths. Studio adds `#studio=`; both stay in one hash, not two router paths. |
| Landing | A form — coordinates/place, date/time, tz, render options | **Replace with Studio.** The form is the Studio's controls; the landing becomes the choice between the two surfaces. |
| Viewer | Map + constellation list + hover scrim + focus overlay | **Keep and elevate.** It is the product. |
| Tokens | `--color-ink #0b0f19`, `--color-cream #f5efe0`, `--color-rose #b98a8a` | **Replace — in the UI only.** See *Two palettes*: `render-spec.json` keeps these exact values for the poster and is normative. The old CSS values were the *same* three colours as the poster's, which is what made the overlap easy to miss. |
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
├── Viewer        #s=<payload>        a shared or canonical moment
│                 ├── the map (primary, largest element)
│                 ├── moment caption — title, local time, projection
│                 ├── figure list — constellations, selectable
│                 ├── share actions — copy link
│                 ├── make your own — → #studio=
│                 └── export — PNG · SVG · PDF (secondary)
│
└── Studio        #studio=<draft>     build and tune a moment
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

**Why Studio has its own fragment (`#studio=`), and the Viewer keeps `#s=`.**
Studio is a *distinct surface with its own address*, so a tuned draft is
shareable before anyone copies a link. The fragment must stay separate for a
reason beyond convenience: **`#s=` is the canonical artifact** — the sky a
friend sent. If a tuned draft overwrote the same fragment, "the sky I was sent"
and "the sky I tweaked" would become indistinguishable, and the one thing worth
protecting (a shared memory) would be silently replaced. Separate prefixes make
that impossible by construction, and `#s=` stays byte-compatible with every
link already in the wild.

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

Entry: landing → "Map a moment" (`#studio=`), or the Viewer → "Make your own
from this sky", which seeds Studio from the shared payload.
1. Choose coordinates or place.
2. Enter coordinates, *or* a place name → geocode → resolved coordinates
   shown for confirmation before anything renders.
3. Enter date, time, timezone (auto-detected, explicit wins).
4. **The map draws from step 2 onward** — before submission.
5. Tune appearance; every change redraws and updates the `#studio=` fragment.
6. Copy the link — which yields a **`#s=`** link, not a `#studio=` one, so what
   is shared is the finished sky rather than an editing session.

**Flagged for removal:** step 3's timezone can be inferred from the resolved
place; the explicit field stays as the override, but the empty-state copy should
not imply it is required.

**Step 6 is where the fragment split pays off.** A visitor tuning a draft and
then sharing it must produce the canonical `#s=` link — otherwise the recipient
opens `#studio=` and lands in an editor rather than on the map they were sent.
`frontend:build` implements "share" as `#studio=…` → decode → re-encode as
`#s=…` → navigate.

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

### Two palettes, and why they differ

**`site/render-spec.json` owns the poster's colours** and is normative per
constitution principle II. It is currently:

```json
"colors": { "background": "#0b0f19", "star": "#f5efe0",
            "line": "#b98a8a", "ring": "#f5efe0" }
```

**The interface does not inherit them, and this is deliberate (D19).** The
poster is a physical artifact — a print, a file someone keeps — and prints do
not take the browser's theme. Keeping them separate means:

- a poster renders identically for every visitor, which principle III requires
  and which the frozen reference PNGs (`reference.test.ts`) depend on;
- changing the interface never changes the exported artifact, so a shared link
  cannot be silently invalidated by a CSS edit.

The consequence is real and must be stated rather than discovered: **the
poster's rose constellation lines (`#b98a8a`) will sit beside verdigris accents
(`#8ec9b4`).** They are related but not identical. This is accepted, with one
boundary:

> **`color.accent` is for interactive chrome only — never for anything that
> represents a constellation in the map.** A selected figure's highlight in the
> `FiguresPanel` is chrome (verdigris border, verdigris scrim). But anything
> drawn *inside* the canvas takes its colour from `render-spec.json` and never
> from a UI token.

If the rose/verdigris tension proves too strong once seen, the correct fix is a
**BCR against `render-spec.json`** — not a CSS tweak. Changing the poster's
palette regenerates every reference PNG and alters the artifact for every
existing share link, so it is a product decision in its own right.

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
| `landing.locale.label` | Language |
| `landing.randomSky` | Load a random sky → renders `viewer.randomSky` |
| `landing.title.legacy` | Map your night sky |
| `landing.subtitle.legacy` | Pick a place and a moment — your poster-grade sky renders right here. |
| `landing.mode.label` | Input mode |
| `landing.moment.legend` | Date and time |
| `landing.render.legend` | Render options |
| `landing.render.fisheye` | Fisheye strength |
| `landing.render.separation` | Minimum separation |
| `landing.render.magnitude` | Limiting magnitude |
| `landing.render.lines` | Constellation lines |
| `landing.render.labels` | Constellation labels |
| `landing.render.glow` | Glow intensity |
| `landing.browse` | Just browsing? |
| `landing.browse.action` | Load a random sky → renders `viewer.randomSky` |
| `landing.explain` | What is this page? |

**Landing · the figure panel**

| Key | Copy |
|---|---|
| `figures.legend` | Figures in this sky |
| `figures.subtitle` | {count} figures above the horizon. Rest on a name to light it up, open one to draw closer. |
| `figures.hint` | Use the list of figures beside the sky to explore each constellation by keyboard. *(screen-reader only)* |
| `figures.reset` | Reset view |
| `figures.stat` | {count} stars, brightest mag {mag} |
| `figures.tooltip` | {count} stars · brightest mag {mag} *(the hover tooltip)* |
| `figures.title` | Constellation figures |

**Viewer · shell**

| Key | Copy |
|---|---|
| `viewer.subtitle` | A night-sky atlas moment, recomputed in your browser |
| `viewer.loading` | Charting the stars… |

**Viewer · announcements** (`role="status"`, `aria-live="polite"`, `sr-only`)

| Key | Copy |
|---|---|
| `viewer.announced.ready` | Night sky poster ready. |
| `viewer.announced.figureSelected` | Showing {name}. |
| `viewer.announced.viewReset` | Showing the whole sky again. |
| `viewer.announcementRegion` | Sky viewer status *(the region's `aria-label`, so it is distinguishable from the export row's)* |
| `viewer.canvasLabel` | Night sky poster titled {title} |
| `viewer.canvasLabel.untitled` | Night sky poster |
| `viewer.canvasHint` | Night sky map. Drag to move it, scroll to zoom. With the map focused, use the arrow keys to move, plus and minus to zoom, and 0 to show the whole sky. *(screen-reader only, the canvas's `aria-describedby`)* |
| `viewer.viewControls` | View controls *(the button group's `aria-label`)* |
| `viewer.zoomIn` | Zoom in |
| `viewer.zoomOut` | Zoom out |
| `viewer.resetView` | Show the whole sky |
| `dataError.title` | Star data could not be loaded |
| `dataError.body` | Regenerate it with `starsky catalog` and reload. |
| `fontError.title` | The poster font could not be loaded |
| `landing.locale.en` | English |
| `landing.locale.ptBR` | Português (Brasil) |
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
| `viewer.randomSky` | Load a random sky |

`viewer.randomSky` is the **canonical** key for this action, not
`empty.action`: D10 requires one phrase in every place it appears (the empty
state, the landing page and the footer), so the key belongs to the action rather
than to one screen. `empty.action` is a screen-local reference to it, kept only
so an empty state can override the wording later without touching three files.
| `viewer.linkFailed` | Could not copy the link. Select the address bar and copy it. |
| `viewer.export.png` | PNG |
| `viewer.export.svg` | SVG |
| `viewer.export.pdf` | PDF |
| `viewer.export.working` | Drawing at full resolution… |
| `viewer.export.done` | Saved {filename} |
| `viewer.export.failed` | The {format} export failed ({detail}). The map is unaffected — try again. |
| `viewer.export.open` | Export |
| `viewer.export.close` | Close export |
| `viewer.export.preparing` | Preparing {format}… |
| `viewer.makeYourOwn` | Make your own from this sky |

The disclosure trigger carries **two** keys rather than one key plus a suffix,
because it is also what names the format group (`aria-labelledby`), and a group
announced as "Close export" is a group named after the control that closes it.
`viewer.export.open` is the name the group takes in its resting state.

`viewer.export.working` is the *status line* ("Drawing at full resolution…"),
which is why a separate `viewer.export.preparing` exists for the button that is
busy: a 44px control cannot carry a sentence, and the two are read at different
moments — one when the work starts, the other when it reports.

These three rows were added on 2026-10-01 to close 007's FT007. The strings are
not new copy: they are what `ExportControls.tsx` already shipped as literals
before the catalogue was extracted, recorded here so the key and the component
stop disagreeing.

`viewer.makeYourOwn` deliberately names the **sky**. The earlier wording,
"Adjust this sky", implied the shared sky was wrong and needed fixing — but a
visitor who received a link is not repairing anything. The shared sky is a
starting point, not a mistake, and the copy says so. Naming "sky" rather than
"link" or "poster" also keeps the object of "this" unambiguous.

**States**

| Key | Copy |
|---|---|
| `empty.title` | No sky on this page yet |
| `empty.bodyPrefix` | This page reads a shared moment from its address — look for a link ending in  |
| `empty.bodySuffix` | . |
| `empty.body` | *(assembled from bodyPrefix + a `#s=…` `<code>` + bodySuffix)* |
| `empty.action` | Load a random sky → renders `viewer.randomSky` |
| `legacy.title` | An older kind of link |
| `legacy.body` | That link comes from an earlier version. Map a fresh moment instead. |
| `invalid.title` | This link holds no sky |
| `invalid.body` | The link could not be read ({detail}). It may have been cut short. |
| `dataError.title` | Star data could not be loaded |
| `dataError.body` | Regenerate it with `starsky catalog` and reload. |
| `fontError.title` | The poster font could not be loaded |
| `fontError.body` | The poster is withheld rather than drawn in a substituted typeface. |
| `loading.poster` | Drawing the sky… |

**Errors — an undrawable character**

The poster face covers Latin-1 accents and punctuation but has no glyph for
emoji or CJK, so those characters render as a notdef box — silently, and
differently in each export. The two paths treat that differently on purpose,
because the visitor's situation differs:

| Key | Copy |
|---|---|
| `fontError.titleUnsupported` | The poster face cannot draw {character}. Remove it, or choose a title the face has glyphs for. |
| `fontError.titleAdjusted` | This title contained {characters}, which the poster face cannot draw. It has been left out so the poster matches its exports. |

The **first** is a form error: the visitor typed the title and has not made
anything yet, so refusing costs them nothing and names the character so they can
act. The **second** is a note on a sky somebody else shared. The recipient
cannot fix the sender's title, and a link that refuses to render is a worse
failure than a title that lost a character — so the character is dropped, the
poster still renders, and the adjustment is stated rather than hidden. Without
that sentence the poster would quietly differ from what was shared, which is the
same dishonesty as the notdef box, one level up.

Deliberately *not* rejecting on the decode path: BCR-0007 withholds a poster when
the font cannot load at all, which is a different failure. Here the poster is
mostly right, and a dead link is not a better answer than an adjusted title.

**Errors — the split keys**

`dataError` and `fontError` wrap inline `<code>` or nothing, so their prose is
split so the markup stays an element rather than literal backticks. The three
parts read as one sentence, asserted by `i18n.test.ts`.

| Key | Copy |
|---|---|
| `dataError.bodyPrefix` | Star data could not be loaded ({detail}). Regenerate it with |
| `dataError.command` | starsky catalog *(as `<code>`)* |
| `dataError.bodySuffix` | and redeploy. |
| `fontError.bodyPrefix` | The poster font could not be loaded ({detail}). |
| `fontError.bodySuffix` | The poster is not shown, because it would render in a substituted typeface rather than the one it was designed with. |

**Footer**

| Key | Copy |
|---|---|
| `footer.version` | starsky v{version} |
| `footer.source` | source |
| `footer.attribution` | Star data from Hipparcos and JPL. Constellation lines from Stellarium (CC BY-SA 4.0). Place lookup by OpenStreetMap contributors. |

---

## Localization

- **Locales: `en-US` default, `pt-BR` secondary.** The keys above are the
  contract; `pt-BR` ships as its own slice after the retheme, so neither change
  is buried in the other's diff.
- **No i18n framework is installed today** — every string is inline JSX
  (`LandingPage.tsx` alone holds ~15). Copy lands extraction-ready against these
  keys even before the framework is chosen.
- **The UI localizes; the poster does not.** `formatDetailLine`
  (`site/src/lib/caption.ts`) feeds *both* the UI caption and the poster
  artifact (`export.ts:112`, `poster.ts:300`), and
  `reference.test.ts:229` asserts the caption equals a stored string in
  `render-matrix.json`. A locale-dependent caption would make the **same
  `#s=` link render a different poster in São Paulo than in London**, and fail
  the reference test for any non-`en-US` visitor. A share link is a promise
  that everyone sees the same sky.
  - **UI chrome**: the active locale (`pt-BR` → `12 de jun. de 2024, 21:40`).
  - **Artifact**: fixed `en-US`, permanently — a product constraint, not a
    default that may drift.
  - `formatLocalTime` currently passes `undefined` to
    `Intl.DateTimeFormat`, which means "whatever the visitor's browser wants":
    neither `en-US` nor deterministic. Both call sites get an **explicit**
    locale parameter.
- **Text expansion: 40% allowance** on buttons and legend text — Portuguese is
  the near target and expands on both.
- **Do not translate:** the `#s=` / `#studio=` fragment formats; coordinate
  formats (`40.7580°N, 73.9855°W` — the artifact writes them and the UI must
  match); the version string; the GPL and CC BY-SA notices, which are legal
  text; constellation proper names, which the poster draws in Cormorant and
  which must match the star catalog's IAU names.
- **Numbers stay Latin digits** in every locale, because the poster's caption
  uses them.
- **`Intl.DateTimeFormat` always receives an explicit `timeZone`** — already
  the pattern in `caption.ts`; the i18n layer must not reintroduce a
  locale-dependent default.
- **`<html lang>`** follows the active locale, not a hardcoded `en`.

---

## Terminal interface

**Not applicable.** No TUI was requested, and `frontend:tui`'s own rule is
never to add one unasked. `starsky catalog` and `starsky cache warm` are the
CLI and are specified in `specs/002-catalog-cli` and `specs/005-data-cache`.

---

## Open questions

*All four are resolved. They are recorded rather than deleted, so the reasoning
survives the answer.*

1. **~~Version source and package name.~~ RESOLVED (owner, 2026-09-30).** The
   footer version comes from **`site/package.json`** via
   `define: { __APP_VERSION__ }` — not from `pyproject.toml`. The package is
   renamed **`starsky-site` → `starsky`**, so the package name and the footer
   string agree. `frontend:build` task.
2. **~~The brief's `[ASSUMPTION]`s.~~ RESOLVED (owner, 2026-09-30).** Scope is
   **decided**: no accounts, no payments, no library, no app. This promotes the
   brief's scope assumption to confirmed and removes the third-surface risk —
   the two-surface IA is now *complete*, not merely sufficient. **Metrics remain
   assumed**; nothing else in the brief is blocked on `project:init`.
3. **~~Two export surfaces.~~ RESOLVED.** **One surface: `ExportControls`.** The
   footer's "Save image" is removed. It duplicated a single action under a
   second name — against the microcopy rule that an action keeps its name — and
   as a `button`-triggered download it cannot be middle-clicked, exposes no
   URL, and is invisible to anyone scanning for a download.
   `ExportControls` already has the right shape (`role="status"`, keyboard
   reachability, a test). `frontend:build` task.
4. **~~Studio as a mode, or its own URL?~~ RESOLVED.** **Its own URL:**
   `#studio=`, with the Viewer keeping `#s=` untouched. "Make your own from this
   sky" replaces "Adjust this sky", which implied the shared sky was wrong.

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
| D13 | Studio gets `#studio=`; the Viewer keeps `#s=` | One shared fragment | A tuned draft would overwrite the canonical artifact, and "the sky I was sent" would stop being distinguishable from "the sky I tweaked". Separate prefixes make it impossible by construction and keep `#s=` byte-compatible with existing links. |
| D14 | "Make your own from this sky" | "Adjust this sky" | "Adjust" implies the shared sky was wrong. A visitor who received a link is not repairing anything. |
| D15 | One export surface (`ExportControls`) | Footer "Save image" + controls | One action must have one name. A `button` download also cannot be middle-clicked, exposes no URL, and is invisible when scanning for a download. |
| D16 | The poster stays `en-US` permanently | Localizing the artifact | `reference.test.ts:229` pins the caption; a locale-dependent caption would render the same `#s=` link differently per visitor and fail the test. A share link promises everyone the same sky. |
| D17 | `pt-BR` after the retheme, as its own slice | Both in one change | A ~60-file diff mixing palette and copy is where design regressions hide. Split, each stays reviewable; the keys exist now either way. |
| D18 | `site/package.json` is the version source, renamed to `starsky` | `pyproject.toml`; keeping `starsky-site` | One source for a static-only site, and the package name then matches what the footer prints. |
| D19 | **The UI palette is independent of the poster's**; `render-spec.json` is untouched | Repainting the poster to match the new palette | `render-spec.json` is normative (constitution II) and pinned by `spec.test.ts:32`, by literal hex assertions in `boundaries.test.ts`/`poster.test.ts`, and by stored reference PNGs. Changing it is a BCR that regenerates every fixture and alters the artifact for every existing share link. The poster is a print; it does not take the browser's theme. Accepted cost: rose lines beside verdigris chrome, bounded by "accent is chrome only, never a constellation in the map". |

---

## Carried to `frontend:build`

Tasks this vision creates, so they are not lost between stages.

1. **Retheme** to the dark palette and tokens above; keep the `atlas-*` class
   names, replace their values. Set `color-scheme: dark` on `:root` — this is
   the fix for the 2.11:1 default-button failure currently patched per element.
2. **Add `aria-live` announcements** for "poster ready" and "figure selected".
   Export status and place resolution already announce; these two do not.
3. **Add `#studio=`** — distinct from `#s=`, with Studio's controls beside a
   live map, and share that re-encodes to `#s=`.
4. **Rename the package** `starsky-site` → `starsky`; add `__APP_VERSION__` to
   `vite.config.ts`, declare it, and render `starsky v{__APP_VERSION__}` in a
   **shared `SiteFooter`** (currently inlined in `ViewerPage.tsx`), linking the
   repository root.
5. **Remove the footer's "Save image"** — `ExportControls` is the only export
   surface.
6. **Normalize the random-sky copy** to one phrase, one key.
7. **Extract every key-screen string** against the copy tables, extraction-ready.
8. **Then, as a separate slice:** the i18n framework, `pt-BR`, locale switching,
   and explicit locales at both `Intl.DateTimeFormat` call sites.

**Never in this work:** any change to `site/render-spec.json`. The retheme is
CSS only. A token change there is a BCR, not a task (see D19) — the conformance
test, the literal hex assertions and the reference PNGs all guard it.