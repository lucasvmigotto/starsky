# Feature: One visual identity across the Explorer, Studio and Viewer

Feature: `015-visual-identity` | Status: In progress | Depends: 014 | Issue: #60 | Direction: BCR-0013

Owner feedback after using 014 (2026-10-31). Lands before 013 (#54), so the new landing is built on this identity.

## Why

The three surfaces drifted apart: different fonts per machine, text buttons where an icon would do, a poster page that repeats its own caption, and a panel tab styled unlike anything else. The owner asked for one identity, icons where they help, and a poster page that is just the image.

## Requirements

### Font

- **FR-001** The interface font is a bundled sans-serif, self-hosted with no third-party request: Inter (OFL), latin subset, variable woff2, via an npm package such as `@fontsource-variable/inter`. Reason: `system-ui` resolved to a monospace face on the owner's Linux machine, so the UI looked different there and on the test browsers.
- `--font-body` becomes `"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif`. The Explorer canvas label fonts in `site/src/design/tokens.ts` use the same stack, drawn only after the font is ready (`document.fonts.load`), so labels don't jump.
- Cormorant Garamond stays the display face and the poster face, unchanged. The monospace rule in `index.css` (around line 328) is used only where code-like text is intended; check every use.
- Bundle budget still passes (fonts are excluded from it; report the woff2 size).

### Icons

- **FR-002** Icon buttons replace text where the meaning is clear, each a real `<button>` with an accessible name and a tooltip (`title`) from the copy catalogue, at least 44 px, inline SVG with `currentColor`, one shared stroke style (24 px grid, 1.75 px stroke, round caps), no icon library. Put the SVGs in one module, e.g. `site/src/components/icons.tsx`.
  - Moment strip: "Keep details open" becomes a **lock** icon (open lock when unpinned, closed when pinned, `aria-pressed`).
  - Explorer toolbar: zoom in, zoom out, reset view (home or recenter), layers (stacked squares), search (magnifier), create poster (frame or image). All icons, same size and shape.
  - Inspector: "Close inspector" becomes an × icon.
  - Viewer and Studio: secondary actions get icons where it helps alignment; keep text where an icon alone would be ambiguous (Share and Export disclosure triggers keep their labels with a leading icon).
- Update the e2e that click these by name only if the accessible name changes; it should not.

### Explorer

- **FR-003** Constellation list shows the name only. Drop the visible abbreviation and the visible "partly" word. Keep "partly above the horizon" for screen readers (visually hidden text in the item).
- **FR-004** The side panel slides in and out from the right with the existing motion token (transform, about 200 ms ease-out), and the panel tab moves with it. No motion under `prefers-reduced-motion`. The canvas still never resizes.
- **FR-005** The panel tab matches the identity: same surface, border and radius as the toolbar container, not the accent-blue outline. Audit any other element using the focus or accent colour as a resting border; the focus colour is only for focus rings and the selection ring.
- **FR-008** The Explorer star tooltip is one line, "<Name> • Magnitude <value>" (for example "Sirius • Magnitude -1.44"), with the HIP number when the star is unnamed, the magnitude formatted as in the inspector, and no horizon text. Copy key `explorer.tooltip.detail`.

### Forms

- **FR-009** The landing form and the shared `PosterFields` (so the Studio too) share one layout. Radio groups and checkboxes sit inline with even spacing and wrap on small screens. Date and time and the timezone (with Detect) share a row on wide screens and stack on small ones, labels visible. "Sky" and "Observation" merge into one collapsed **Advanced** disclosure (constellation lines, labels, limiting magnitude). Projection and Shape share a row; Shape is a two-option segmented switch over real radios (same group name `Shape`, options `circle` and `square`). Appearance is a compact grid: projection with shape, fisheye with minimum separation, glow toggle with glow intensity, title full width; each pair stacks on small screens and slider values stay aligned. The "What is this page?" disclosure leaves the landing. The primary "Show my sky" button is centred at its natural width (the Studio has no primary action). Every input keeps its id, name and accessible name.

### Viewer (poster page) — BCR-0013

- **FR-006** The Viewer page shows the heading text above (title, date and projection line) and the poster sky image, then Share, Export and the two actions. Remove from the page: the caption band below the image (it repeats the heading) and the "Figures in this sky" side panel with its hover highlighting. Center the image.
- The exported files are unchanged: PNG, SVG and PDF keep their caption band, byte-identical, and the reference images are untouched. Only the on-page preview drops the band.
- Remove now-dead components, copy keys and tests only if nothing else uses them; update the vision and its copy tables, and the existing e2e that assert the figures panel or the on-page caption, listing each.

### The poster page actions and a static image

- **FR-010** In the Viewer, Share, Export, "Explore this sky" and "Make your own from this sky" sit in one centred row that wraps on small screens, with no divider lines. Share and Export open their details below the row, full width, one at a time (opening one closes the other); trigger names, `aria-expanded`/`aria-controls` and the live status regions stay. The Studio's action area (Share, Export, Return to Explorer) follows the same pattern. The Viewer image is static: no wheel, drag, pinch or keyboard pan or zoom, no zoom or reset buttons, no view state; zooming and exploring live in the Explorer. The heading under the title (Viewer and Studio) shows the date, time and timezone only, with no projection; the exported caption is untouched.

- **FR-011** (supersedes the action-row part of FR-010) On wide, tall screens (1280×720, 1440×900, 1920×1080) the Viewer has no vertical scroll: header, heading, image and footer fit the viewport, the image sized from the space left (the smaller of width and height); phones may scroll. The Viewer's actions move into the site footer, right-aligned, as icon-only buttons of one 44 px size, vertically aligned, with names and titles from the catalogue unchanged: Share, Export, Explore this sky, Make your own from this sky. The separate action panel is gone. Share and Export open popovers anchored above their button and inside the viewport, one at a time; Escape closes and returns focus to the trigger; the status live regions stay. On phones the footer stacks: actions first, then the version and attribution. The footer's left side is the single link `starsky@v<version>` to the source (no separate "source" link) with the attribution below it; this applies to every page with the footer (Viewer and Studio). The Studio uses the same footer actions (Share, Export, Return to Explorer); its controls panel stays.

### Motion

- **FR-012** In the Explorer, Reset view (the toolbar button and the `0` key) glides from the current camera to the initial view instead of jumping: quaternion slerp along the shortest path for the orientation, the field of view in log space, eased in and out over 300 to 800 ms scaled by the angular distance. It runs in the controller's frame loop on an injected clock, so it is unit-testable. Any input (drag, wheel, pinch, key, another button) cancels it and takes over from the current pose. Under `prefers-reduced-motion` it jumps. `settled` fires once, when it ends or is cancelled, so the link updates only then. Center on map glides the same way. Without an injected clock (the pure controller tests) everything jumps.

### One layout language

- **FR-007** Explorer, Studio and Viewer share: the header (site name; the Explorer stays full-bleed with only its moment line over the sky, so the header is on the Studio and Viewer), surface colours, radii, the same button styles (primary, ghost, icon), the same form controls, the same panel style and spacing scale. Studio's controls panel and the Viewer's action area use the Explorer panel style. Remove one-off styles that duplicate a shared one.
- The Studio preview shows only the sky image too, like the Viewer, with the title and moment as text above or beside it; exports still include the caption.

## Must not change

Poster rendering and exports (`site/src/lib/render/**`, `render-spec.json`, reference images), `#s=`/`#e=`/`#studio=` codecs, Explorer math.

## Done when

Unit and e2e green on all projects, axe clean, no horizontal overflow at 360 and 390 px, screenshots of all three surfaces at desktop and phone reviewed side by side.
