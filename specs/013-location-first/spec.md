# Feature: Location-first creation

Feature: `013-location-first` | Status: In progress | Depends: 015 | Issue: #54 | Direction: BCR-0011, ADR-0008

## Why

The landing is still the old poster form. Under BCR-0011 the Explorer is the primary surface, so the first page asks one question, "Where do you want to explore the sky from?", and opens the Explorer. Poster choices belong in the Studio.

## User stories

### US1 (P1): choose a place on a map

- **Given** the landing, **then** a heading asks where to explore from, with a place search field and a map preview.
- Typing in search queries the existing geocoder (`site/src/lib/geocode.ts`, Nominatim), debounced at about 400 ms, with in-flight requests cancelled (AbortController) when the text changes. Results show as a listbox (ARIA combobox pattern). Choosing one moves the marker and pans the map.
- Clicking the map or dragging the marker sets the location. The coordinates shown update, and the place name becomes "Dropped pin" plus formatted coordinates; no reverse geocoding.
- The map preview is visible but not dominant: about 280 px tall on desktop and 220 px on phones. An "Expand map" icon button enlarges it within the page, and Escape or the same button shrinks it.

### US2 (P1): coordinates without the map

- A "Coordinates" toggle reveals latitude and longitude inputs with validation (lat -90..90, lon -180..180) and the existing error copy pattern. Valid input moves the marker.
- If tiles fail to load, the geocoder fails, or Leaflet's chunk fails, the page says so in place and the coordinate inputs and search still work. The map is never required to continue.

### US3 (P1): choose the moment

- Date and time and Timezone (with Detect) share one row, stacking on phones. The default timezone is detected from the chosen place where the existing code supports it, else the browser's, else UTC.
- A collapsed "Advanced" holds limiting magnitude only (an Explorer setting).

### US4 (P1): open the Explorer

- The primary button "Explore this sky" (centred) encodes an `#e=` payload (place, lat, lon, tz, when_utc, mag, title null, initial camera from `initialCamera`, default layers, sel null) and navigates to it.
- A secondary "Make a poster instead" opens the Studio (`#studio=`) with the same scene and default composition.
- "Just browsing? Load a random sky" stays.

### US5 (P1): compatibility and identity

- `#s=`, `#e=` and `#studio=` links behave as today. Old journeys J1–J4 in e2e move to the new flow where they started at the landing.
- The landing uses the 015 identity: SiteHeader, panel, form controls, footer with `starsky@v<version>`.

## Requirements

- **FR-001 Leaflet** is an npm dependency, loaded lazily (dynamic import) only by the landing, never in the main chunk; its CSS and marker images are bundled locally. No CDN.
- **FR-002 Tiles** follow ADR-0008 exactly: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` from one config value; on demand only, no prefetch, no offline cache; attribution "© OpenStreetMap contributors" always visible with the fixthemap link; Referer kept (no `referrerPolicy: no-referrer`).
- **FR-003 State** lives in a typed reducer or focused hooks (`site/src/lib/landing/`), not many independent `useState`s. Pure functions for payload building and validation, unit tested.
- **FR-004 Poster options leave the landing.** Projection, shape, glow, fisheye, separation, title and constellation toggles are Studio-only. Remove landing-only code and copy that becomes unused; `PosterFields` stays for the Studio.
- **FR-005 Network in tests:** e2e stubs tile and geocoder requests (`page.route`); the real-Nominatim job keeps working. No test reaches tile.openstreetmap.org.
- **FR-006 Accessibility:** the map has a label and is skippable; every map action has a keyboard equivalent (search, coordinates); the marker is not the only way to set a place. axe clean, keyboard journey, 360/390 px without horizontal overflow.
- **FR-007 Budget:** main chunk does not grow by Leaflet; report the lazy chunk size; the bundle budget passes.
- **FR-008 Docs:** vision (landing flow, copy tables), README quickstart line if it mentions the form, ADR-0008 cross-reference.
