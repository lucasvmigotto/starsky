# Feature: Explorer polish

Feature: `014-explorer-polish` | Status: In progress | Depends: 012 | Issue: #57

Owner feedback after using the Explorer. It lands before 013 (#54), though numbered after it, because 013 keeps its reserved number.

Small Explorer interface changes, requested by the owner after trying the Explorer. Order: after 012 (#53) lands, before 013 (#54). Depends on 011.

## Idle collapse

After **4 s** without activity, the toolbar, copy link button, side panel and the moment strip's pin button fade out. Only the one-line moment remains (title, place, date and time). The strip keeps shrinking to that line at 2.5 s as it does today.

- **The Explorer opens collapsed:** on load, only the one-line moment shows, even for a link with a selection, which stays marked in the sky. This replaces today's expanded strip on load.
- Any pointer movement, touch, scroll or key press brings everything back.
- A selected star or constellation stays selected and marked; its panel returns with the controls.
- Nothing hides while search or layers is open, while keyboard focus is on a control, or while the strip is pinned.
- On touch screens, the first tap while hidden only restores the controls and never selects anything in the sky.
- Controls stay reachable by keyboard and screen reader; tabbing to one restores them. Screen-reader text is unchanged.
- With reduced motion, controls hide and appear without a fade.

## Constellation list grouped by the horizon

The side panel list splits into **Above the horizon**, open, and **Below the horizon**, collapsed, each with a count.

- A constellation with at least one star above the horizon goes in the top group. If some of its stars are below, it's marked "partly".
- Groups depend only on place and time, so they don't change while the camera moves.
- Below-horizon constellations can still be chosen and are still shown as below the horizon.
- The groups don't depend on the Layers setting for below-horizon objects.

## Copy link as an icon

The "Copy link" text button becomes a link icon button inside the moment strip, beside the pin button.

- Its accessible name and tooltip stay "Copy link", with a touch target of at least 44 px.
- After copying, the icon briefly changes to a check mark. Success and failure are still announced to screen readers, and a failed copy still shows its message as text.
- The icon is inline SVG that follows the design tokens; no icon library is added. It hides with the other controls.

## Star tooltip on hover

Holding a mouse pointer still over a star for **1.5 s** shows a tooltip beside it: name (or HIP number if unnamed), apparent magnitude, and above or below the horizon.

- It closes when the pointer moves off the star, when a drag or zoom starts, or on Escape. It never covers the star itself and stays inside the viewport.
- Mouse and pen hover only. Touch and keyboard keep using selection and the side panel, which show the same facts, so the tooltip is hidden from screen readers.
- It is a page overlay: showing it draws no extra canvas frames, and the timer only runs while the pointer rests on a star.
- It uses the existing star picking, covers stars only, and appears independently of the idle collapse.

## Controls at the bottom right, and a panel tab

The toolbar moves from the top right to the bottom right.

- With the side panel open, the toolbar sits to the panel's left, never under it. Search and layers popovers open upward and stay inside the viewport.
- It must not overflow on short landscape screens. Phones keep the row above the bottom sheet, aligned right.

A collapsed side panel shows a small tab with a `<` chevron on the right edge, vertically centered. Opening the panel moves the tab to the panel's left edge and turns it into `>`.

- The tab replaces the toolbar's "Inspector" button, which is removed.
- It is a real button with `aria-expanded`, `aria-controls` and the "Show details" / "Hide details" names, with a touch target of at least 44 px even though it looks small.
- It hides with the other controls in the idle collapse.
- Phones keep the bottom sheet and its existing handle instead of a side tab.

## Rounder corners across the site

Replaces the vision's 2px and 4px radii, approved by the owner. Rewrite the reasoning in `docs/product/ux-vision.md` ("Spacing, radius, elevation").

| Element | Now | New |
|---|---|---|
| Buttons and inputs (`--radius-control`, `radius.control`) | 2px | 8px |
| Panels, info strip, popovers (`--radius-panel`, `radius.panel`) | 4px | 12px |
| Icon-only buttons (copy link, zoom) | 2px | Fully round, or 8px if circles look wrong in the stacked toolbar; decide from a screenshot |
| Panel tab | new | Rounded on the side facing the sky, square against the screen edge |

- No pill-shaped buttons or panels.
- Applies to every surface through the tokens. Focus rings follow the new corners.
- Posters are unaffected: exports and reference images stay byte-identical, and the Square shape stays square.

## Brighter stars in the Explorer

Owner: stars are "too shy and barely visible". 82% of the catalog is fainter than magnitude 5, and `radiusClass` in `site/src/lib/explorer/frame.ts` draws magnitudes above about 5.4 at 0.5 px radius, so on a 1x display they blur into grey specks. Only stars of magnitude 1 or brighter get a glow.

Starting values, to tune from screenshots at FOV 100, 60 and 30 on a 1x and a 2x display:

| | Now | New |
|---|---|---|
| Radius before zoom | `2.9 - 0.4 * mag`, 0.6 to 3.6 | `3.6 - 0.5 * mag`, 0.8 to 4.5 |
| Rounding | Nearest 0.5 px | Keep the batches, but never below 0.8 |
| Faint star opacity | 1 | Scales with magnitude, about 0.6 at 6.5 to 1 at 4, so the larger dots don't turn into even noise |
| Glow | Magnitude 1 or brighter, alpha 0.16 | Magnitude 2 or brighter, alpha 0.25 |

- Below-horizon stars stay clearly dimmer than any star above the horizon, including the faintest. Keep the dim alpha multiplied on top.
- The frame budget and idle checks still pass with the larger circles.
- The poster renderer is separate and unchanged.

## Done when

Unit and e2e tests cover these behaviors on all projects, including keyboard, axe and a 390 px phone layout. Copy is in the catalogue and `docs/product/ux-vision.md`.


## Additions from review

- **Resting pointer:** a pointer resting on a control or the side panel counts as activity, so nothing fades out from under it.
- **No layout shift:** hiding must not resize the canvas or leave an empty band where the side panel was. The panel floats over the sky.
- **Artifact shapes:** any surface that shows the poster itself keeps its existing corners, so the Square shape's preview stays square.
- **Moment on load:** the strip starts compact. This supersedes "expanded on load" in `docs/product/ux-vision.md` and `ExplorerMetadata`.
