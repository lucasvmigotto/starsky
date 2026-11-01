# 019 — Constellation tooltip and star list

Feature: `019-constellation-tooltip` | Status: In progress | Depends: 014, 018 | Issue: #74

## Why

Owner, 2026-11-01: "When the user hover on constellation, could a tooltip appears with the constellation name and the starts that form it? Would be too much?" The agreed answer ("Great, do it") was a compact tooltip, with the full list in the inspector.

The data behind that choice: figures have 2 to 30 stars (median 6.5). They have 0 to 15 named stars (median 3), and 17 of the 88 have none. A full list in a hover box would mostly be catalogue numbers.

## User stories

- **US1 (P1).** When a mouse or pen rests on a constellation for 1.5 s, a tooltip shows its name, how many stars form it, and up to three of its named stars, brightest first.
- **US2 (P1).** A selected constellation's inspector lists every star of its figure, brightest first, and choosing one selects that star.

## Requirements

- **FR-001 Tooltip trigger.** The tooltip uses the same rest delay as the star tooltip (`HOVER_DELAY_MS`, 1.5 s) and the same close rules: movement off the constellation, a drag, a zoom, leaving the map, or Escape. The instant hover highlight (FR-013 of 011) stays as it is.
- **FR-001a** A star under the pointer keeps its own tooltip. A constellation hover never covers a star hover.
- **FR-001b** Only what is drawn can be hovered. There is no constellation hover where `pickConstellationAt` returns none. That covers the lines layer off with no label hit, and a figure hidden by "below the horizon: hidden".
- **FR-002 Tooltip content.**
  - Line 1 is `{name} • {count} stars`.
  - Line 2 lists up to three **named** stars by apparent magnitude (brightest first). When the figure has more stars than are listed, it ends with `+{rest}`, where `rest` counts every remaining star, named or not.
  - A figure with no named stars shows line 1 only.
  - Constellation and star names are never translated (018). The count and the joining words are copy.
- **FR-003 Tooltip placement.** The tooltip is anchored at the pointer, since a figure has no single point. It is placed with `placeTooltip` inside the visible stage and outside the side panel. It is a page overlay that paints no canvas frame. It is `aria-hidden`, because it repeats the inspector, as the star tooltip does.
- **FR-004 Inspector list.**
  - The constellation inspector gains "Stars in the figure": every member star, brightest first.
  - Each entry shows the proper name, or `HIP {n}`, with its magnitude. A star below the horizon is marked in text, not by colour alone.
  - Each entry is a button that selects that star, exactly like picking it on the map (selection, inspector, announcement, URL state).
  - Long figures (Eridanus, 30 stars) scroll inside the inspector. The no-y-scroll layouts at 1440×900 and 1920×1080 stay green.
- **FR-005 Copy.** New keys go in both `en-US.ts` and `pt-BR.ts`, and in both copy tables of `docs/product/ux-vision.md`. `check_i18n_keys.py` must pass. pt-BR reads `{name} • {count} estrelas`.
- **FR-006 Unchanged.** The poster renderer and every reference image and SVG pin are unchanged. All four link formats are unchanged. No new data file. Bundle within budget.
- **FR-007 Tests.**
  - Unit: the content builder (top three named by brightness, `+N`, zero named, exactly three named, ties), hover priority and close rules.
  - Component: the inspector list order, labels, and selection on activation.
  - e2e: driven by `page.clock`, with no sleeps. Cover the rest delay, star precedence, Escape, a list entry selecting a star, axe with zero serious or critical issues on the inspector with the list open, pt-BR copy, and no tooltip on touch.

## Out of scope

- Ringing the listed stars on the canvas. It was offered as optional and not chosen, and can be added later.
- Touch hover. A tap selects, and the inspector shows the list.
