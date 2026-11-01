# Feature: Location-first creation

Feature: `013-location-first` | Status: Implemented | Depends: 015 | Issue: #54 | Direction: BCR-0011, ADR-0008

## Why

The landing is still the old poster form. Under BCR-0011 the Explorer is the primary surface, so the first page asks one question, "Where do you want to explore the sky from?", and opens the Explorer. Poster choices belong in the Studio.

## User stories

Revised after the owner tried the page (see "Owner direction" at the end): the map is always shown, there is no expand, the coordinates are a switch, the Title is back, and Explore is the only action.

### US1 (P1): choose a place on a map

- **Given** the landing, **then** a heading asks where to explore from, followed by one row: the "Search for a place" field with a "Coordinates" switch (`role="switch"`) on its right (wrapping below on phones), and the map directly under it. Below the map, on one line: the hint and the Nominatim credit, "Click or drag the pin to set the place · Search by Nominatim" (one line from 1024 px, wrapping on phones; a small muted privacy line under it tells that OpenStreetMap sees the visitor's IP address when they search or view the map, linking its privacy policy; the OpenStreetMap credit is the map's own always-visible attribution, ADR-0008); then the summary as one line (its "Exploring from" label is visually hidden and read by screen readers) `<place> • <coordinates>`.
- The map is always rendered, about 280 px tall on desktop and 220 px on phones; Leaflet loads lazily, and until it does (or if it fails) a placeholder of the same size holds the space so nothing shifts. There is no hide or expand control.
- Search queries the geocoder (`site/src/lib/geocode.ts`, Nominatim) only on an explicit action: Enter in the field (with no list open), the search button at the right end of the field, or leaving the field (blur) with text that differs from the last searched or chosen one. Typing never sends a request: it aborts any request in flight (AbortController) and closes a stale list (the Nominatim usage policy forbids client-side auto-complete; issue #65). Requests start at least 1 s apart (a submit inside the window waits, showing the searching status), and answers are cached for the page session by trimmed, lower-cased query (successes only), so a repeated search sends nothing. Results show as a listbox (ARIA combobox pattern). Choosing one moves the marker and pans the map.
- Clicking the map or dragging the marker sets the location with no place name (no reverse geocoding); the summary shows the coordinates alone, announced to screen readers as "Dropped pin".

### US2 (P1): coordinates without the map

- Turning the Coordinates switch on replaces the search field, in place, with Latitude and Longitude inputs (lat -90..90, lon -180..180, per-field errors). Valid input moves the pin; dragging the pin or clicking the map updates the fields. Turning it off brings the search field back.
- If tiles fail to load, the geocoder fails, or Leaflet's chunk fails, the page says so in the map's own box or beside the field, suggests the Coordinates switch, and the rest still works. The map is never required to continue.

### US3 (P1): choose the moment

- An optional Title is the first field of the moment section, validated as in the Studio (200 characters; a title the poster face cannot draw is refused in place with the Studio's message). Date and time and Timezone (with Detect) share the next row, stacking on phones. The default timezone is the browser's, else UTC (the code has no place-based zone).
- A collapsed "Advanced" holds limiting magnitude only (an Explorer setting). Other poster options stay in the Studio, reached from the Explorer.

### US4 (P1): open the Explorer

- The only button, "Explore this sky" (centred), encodes an `#e=` payload (place, lat, lon, tz, when_utc, mag, title from the field or null, initial camera from `initialCamera`, default layers, sel null) and navigates to it. The flow is landing → Explorer → export; posters are made from the Explorer, not from the landing.
- "Just browsing? Load a random sky" stays under the card.

### US5 (P1): compatibility and identity

- `#s=`, `#e=` and `#studio=` links behave as today. Old journeys J1–J4 in e2e move to the new flow where they started at the landing.
- The landing uses the 015 identity: SiteHeader, panel, form controls, footer with `starsky@v<version>`.

## Requirements

- **FR-001 Leaflet** is an npm dependency, loaded lazily (dynamic import) only by the landing, never in the main chunk; its CSS and marker images are bundled locally. No CDN.
- **FR-002 Tiles** follow ADR-0008 exactly: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` from one config value; on demand only, no prefetch, no offline cache; attribution "© OpenStreetMap contributors" always visible with the fixthemap link; Referer kept (no `referrerPolicy: no-referrer`).
- **FR-003 State** lives in a typed reducer or focused hooks (`site/src/lib/landing/`), not many independent `useState`s. Pure functions for payload building and validation, unit tested.
- **FR-004 Poster options leave the landing.** Projection, shape, glow, fisheye, separation and the constellation toggles are Studio-only; the landing keeps the Title and, in Advanced, the limiting magnitude. There is no "Make a poster" action on the landing. Remove landing-only code and copy that becomes unused; `PosterFields` stays for the Studio.
- **FR-005 Network in tests:** e2e stubs tile and geocoder requests (`page.route`); the real-Nominatim job keeps working. No test reaches tile.openstreetmap.org.
- **FR-006 Accessibility:** the map has a label and is skippable; every map action has a keyboard equivalent (search, the Coordinates switch); the map container is not a tab stop; the marker is not the only way to set a place. axe clean, keyboard journey, 360/390 px without horizontal overflow.
- **FR-009 Layout:** nothing positioned absolutely may cover the summary; the map box keeps its size while loading, failed or clicked.
- **FR-010 One screen:** the card stays one column (about 45rem wide) at every width, and on a large display the landing, with Advanced closed, needs no page scroll at 1440x900 or 1920x1080. To fit, the gaps are tight, the map gives up height first (200 to 240 px from 1024 px wide, 220 to 280 px otherwise) and keeps the card's full width, the map hint and the search credit share one line, Advanced has a full-width row of its own and "Explore this sky" is centred on the row below it, at every width; phones may scroll.
- **FR-013 Footer:** the shared footer is one row: data credits on the left, the page's actions (Viewer and Studio) then the `starsky@v<version>` link at the end; on phones the credits stack above that row.
- **FR-011 Detect** is an icon button (locate), named and titled "Detect my timezone", with the same behaviour as before.
- **FR-012 `#c=` creation link:** `#c=<fragment>` opens the landing pre-filled. Same encoding as `#s=`/`#e=`, `{v:1}` with optional `place`, `lat`, `lon`, `when_local` (wall time in `tz`), `tz`, `title`, `magnitude_limit` (`site/src/lib/landing/creation.ts`, no React). Decoding is per field: an invalid field (range, IANA zone, date, title length or glyphs, magnitude) is dropped and the rest fills the form; latitude and longitude, and a place, stand or fall together. A wrong version or an unreadable payload leaves a blank form and a polite notice. Prefill makes no geocoder call. The page keeps `#c=` in step with the form by `history.replaceState`, debounced about 300 ms, only once the form differs from what it opened with, adding no history entries. There is no copy button: the address bar is the link. `#c=` collides with neither `#s=`, `#e=` nor `#studio=`, and the HashRouter takes no basename.
- **FR-007 Budget:** main chunk does not grow by Leaflet; report the lazy chunk size; the bundle budget passes.
- **FR-008 Docs:** vision (landing flow, copy tables), README quickstart line if it mentions the form, ADR-0008 cross-reference.

## Owner direction (after trying the page)

"Clicking in map, the layout brokes. Map should be always visible. Full screen map is not necessary. Make Place input search and right bellow, the map. Coordinate input could be a switch right side in line of place input - if active, replace place input with two lat lon inputs." Then: "Explore this sky should be the only CTA button here" (landing → Explorer → export); the Title returns; the summary is one line `<place> • <coordinates>`.

Consequence for ADR-0008: its line "Tiles load only after the visitor opens the map" no longer holds, because the map is always on the landing. Tiles are still on demand for the visible view only, with no prefetch or storage; ADR-0008 was amended accordingly on 2026-11-01.
