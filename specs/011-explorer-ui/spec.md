# Feature: Explorer interface

Feature: `011-explorer-ui` | Status: In progress | Depends: 010 | Direction: BCR-0011, D20–D23

## Why

The Explorer can navigate but gives no way to learn what you are looking at or to control it without knowing the keys.

## User stories

### US1 (P1): inspect what is selected

- **Star:** common name if known, HIP id, apparent magnitude, RA and Dec (labelled catalog), altitude and azimuth (labelled as derived and approximate, per ADR-0006), horizon status, and "part of the figure of" with a constellation only if a figure uses it.
- **Constellation:** name, IAU abbreviation, stars in its figure, stars in the figure now above the horizon, brightest star and magnitude; actions to center and clear.
- Missing data is omitted, not invented. Map and inspector share one selection.

### US2 (P1): browse and search

- A constellation list in the inspector selects and centers.
- Search finds constellations by name or abbreviation, and stars by name or HIP number; choosing a result centers and selects it. Results are keyboard navigable and report no match.

### US3 (P1): the moment stays readable

- Metadata has three states: **expanded** on load and during activity; **compact** one line after 2.5 s idle, for example `Title · Place · Nov 17, 1998, 11:17 AM JST`; **pinned** by the user. It never hides by default, wraps instead of overflowing, and never rebuilds the scene. Transitions last about 250 ms and respect reduced motion.

### US4 (P1): visible controls

- A floating toolbar offers zoom in, zoom out, reset, layers, search and inspector toggle. Controls stay out of the central field of view.
- Layers: constellation lines, labels, horizon, cardinal points, equatorial grid, below-horizon `dimmed` or `hidden`.

### US5 (P1): responsive and accessible

- **Desktop:** right inspector of 300–360 px, collapsible. **Tablet:** narrower or collapsed. **Mobile:** bottom sheet with collapsed and expanded states, thumb-reachable controls, portrait and landscape.
- Every action works by keyboard. Focus is visible and managed. Touch targets meet 44 px on touch viewports. WCAG 2.2 AA.

### US6 (P1): the link follows the view

- The `#e=` fragment updates when the view settles, after 500 ms with no input, using `history.replaceState`, so copying the URL restores camera, layers and selection. A copy-link action is available. Pointer moves never write the URL.

### US7 (P2): labels avoid bright stars

- A label does not sit on a bright star where another nearby position is free.

## Requirements

- **FR-001** Sky redraws never rerender the React tree; panels update on coarse events only.
- **FR-002** All copy is in the catalogue and `ux-vision.md`; colors come from tokens; the `atlas-*` class conventions apply.
- **FR-003** Poster modules are unchanged.
- **FR-004** Altitude and azimuth come from `observerAltAz`; no astronomy lives in components.
- **FR-005** Toolbar entry for Poster Studio is a placeholder until 012 and is not shown yet.
