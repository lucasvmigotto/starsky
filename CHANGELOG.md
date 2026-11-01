# Changelog

## 1.3.0 — 2026-11-01

### Added

- **site:** default the landing to São Bernardo do Campo, set at build time
- **site:** move the privacy notice to its own page
- **site:** stars in the figure, in the constellation inspector (019 T003)
- **site:** constellation hover tooltip (019 T002)
- **site:** constellation figure stars and tooltip content (019 T001)
- **site:** add the footer language switcher (018 T002)
- **site:** carry the poster language in links and draw the caption in it (018 T004, T005)
- **site:** add the pt-BR catalogue and the interface locale store (018 T001, T003)
- **site:** fill the square poster with the inscribed sky
- **site:** single-column landing, shared one-row footer, Studio on one screen
- **site:** one-screen two-column landing, Detect icon and the #c= creation link
- **site:** always-visible map, Coordinates switch, Title and one action on the landing
- **site:** Explore this sky, Make a poster instead and the shared identity
- **site:** compose the location-first landing with the moment row
- **site:** coordinates toggle with per-field validation
- **site:** lazy Leaflet map with OSM tiles per ADR-0008
- **site:** landing place search with debounce and cancellation
- **site:** landing state reducer and payload builders
- **site:** highlight the hovered constellation, linked with the panel list
- **site:** animate Reset view and Center on map with slerp and a log-space FOV
- **site:** static Viewer image, footer actions and a viewport-fitting poster page
- **site:** one form layout for the landing and the Studio
- **site:** one header, buttons, panels and form controls across the surfaces
- **site:** show the poster page as heading and sky image only
- **site:** slide the side panel and restyle its tab
- **site:** list constellations by name only
- **site:** icon buttons for the toolbar, pin and inspector close
- **site:** bundle Inter as the interface font
- **site:** read the star tooltip as name and magnitude
- **site:** show a tooltip after 1.5 s of hovering a star
- **site:** collapse the Explorer controls when idle
- **site:** add the chrome visibility machine
- **site:** move the toolbar to the bottom right and add a panel tab
- **site:** copy the link from an icon in the moment strip
- **site:** group the constellation list by the horizon
- **site:** draw brighter, larger stars in the Explorer
- **site:** round controls to 8px and panels to 12px
- **site:** connect the Explorer, the Viewer and the Studio
- **site:** add the Poster Studio behind #studio=
- **site:** add the studio draft codec and share the poster fields
- **site:** convert scenes between the Explorer and the poster
- **site:** choose Standard or Story in the export controls
- **render:** add the story format to SVG and PDF export
- **render:** add the 1080 x 1920 story format to the canvas path
- **site:** lay out the explorer interface for desktop, tablet and phone
- **site:** add the moment strip, toolbar and layers
- **site:** inspect a selection and search the sky
- **site:** move labels off bright stars
- **site:** centre, layer and zoom commands and a link that follows the view
- **site:** keep the moment readable as the view idles
- **site:** search the sky by name, abbreviation or HIP number
- **site:** describe the selected star or constellation
- **site:** open the explorer from #e= links
- **site:** draw explorer frames on Canvas 2D
- **site:** navigate the explorer with drag, pinch, wheel and keys
- **site:** declutter explorer constellation labels
- **site:** pick explorer stars and constellations from scene data
- **site:** plan explorer frames from the observer's sky
- **site:** add the explorer link payload
- **data:** export star names for the explorer
- **site:** prepare the explorer scene with stable ids
- **site:** add the observer horizon, separate from the camera
- **site:** add the gnomonic explorer camera
- **site:** add sky vector and quaternion primitives

### Fixed

- **site:** read the default location without import.meta.env under Node
- **site:** draw the poster caption in en-US for every visitor
- **site:** never blank on a failed chunk, an unreadable #s= or a hung search
- **site:** put the Explorer panel tab before its panel in tab order
- **site:** ignore a repeat search for the query already in flight
- **site:** search places only on submit, never while typing
- **site:** align action popovers to their panel, drop the phone switch nudge
- **site:** repair the pako version strings in package.json and bun.lock
- **site:** exclude woff2 fonts from the bundle budget sum
- **site:** keep the Advanced checkboxes and the glow row inline until they do not fit
- **site:** keep the Explorer full-bleed, without the shared header
- **site:** reject a share link whose moment is not a date
- **site:** keep the toolbar off the center on short screens
- **site:** keep the phone toolbar in reach and off the selected star
- **site:** keep the inspector module lint-clean
- **ci:** measure real files in the bundle budget check
- **ci:** move playwright and its e2e image to 1.64.1 together
- **deps:** upgrade certifi past the emSign root CA advisory
- **data:** fall back to a checksummed Hipparcos mirror when CDS is down

### Changed

- **site:** enable noUncheckedIndexedAccess
- **site:** share one dialog between the Viewer and the Studio

## 1.2.1 — 2026-10-15

### Fixed

- **Docs footer versions.** The docs footer reads
  `starsky@vX.Y.Z · docs@vX.Y.Z` (`site/package.json` and
  `docs/site/package.json`), each linked to the repository tree at the
  release tag, or the commit when untagged. The docs redeploy after the
  release workflow tags, and `scripts/release.py` bumps the docs version
  when `docs/site/` changed, apart from the product's.

## 1.2.0 — 2026-10-04

### Added

- **viewer:** share the scene before exporting the file
- **viewer:** name untitled skies above a known place

### Fixed

- **site:** guard happy-dom registration across component suites

### Changed

- **landing:** group settings into sky, appearance and observation
- **share:** migrate share payloads through a versioned entry point

## 1.1.6 — 2026-10-04

### Fixed

- **docs-site:** build public links from base URL, not relatives

## 1.1.5 — 2026-10-04

### Fixed

- **ci:** define R2 bucket vars under the names validation checks

## 1.1.4 — 2026-10-04

### Fixed

- **docs-site:** drop hash-router basename that blanks pages

## 1.1.3 — 2026-10-04

### Fixed

- **site:** drop the hash-router basename that blanked pages

## 1.1.2 — 2026-10-04

### Fixed

- **site:** name export format group on its own, not the trigger
- **site:** use typed BASE_URL for router basename

## 1.1.1 — 2026-10-03

### Changed

- **site:** derive Vite base and router basename from env

## 1.1.0 — 2026-10-02

### Added

- Poster navigation: drag to pan, scroll to zoom, pinch on touch, arrow keys
  with `+`/`-`/`0`, and zoom controls under the poster.

### Fixed

- The poster no longer opens zoomed into its upper-left corner on HiDPI or
  browser-zoomed displays; browser zoom re-renders instead of breaking until
  reload.
- The renderer no longer draws the mirror image of its own model, so canvas
  hover names the constellation under the cursor.
- The zoomed focus veil covers the frame instead of ghosting a disc over it;
  the hover tooltip no longer captures the pointer.
