# Feature: Explorer canvas and navigation

Feature: `010-explorer-canvas` | Status: Implemented | Depends: 009 | Decisions: ADR-0006, ADR-0007

## Why

Users need to move through the whole sky. This feature is the working Explorer behind `#e=` links, with no change to anything reachable today. Layout, inspector and search come in 011.

## User stories

### US1 (P1): see the sky through the camera

- **Given** an `#e=` link, **then** a full-viewport canvas shows stars, constellation lines, horizon and cardinal points for that place, moment and camera.
- **Given** a star below the horizon, **then** it is dimmed by default, or absent when the layer is `hidden`. No below-horizon star looks observable.
- **Given** any viewport size or DPR, **then** drawing stays sharp after a resize, and the backing store is capped.
- **Given** no input, **then** no frames are drawn.

### US2 (P1): navigate every direction

| Input | Result |
|---|---|
| Pointer drag, one-finger drag | Rotate, with the grabbed sky following the pointer |
| Wheel, pinch | Zoom, anchored at the pointer or gesture centroid |
| Arrow keys | Rotate |
| `+`, `-` | Zoom |
| `0` | Return to the initial view |
| Double-click | Center on the target |

- Rotating over a celestial pole or across RA 0° has no jump. `pointercancel` and lost capture end a gesture cleanly. The page does not scroll or zoom during a gesture.

### US3 (P1): select stars and constellations

- **Given** a click on or near a star, **then** that star is selected: nearest by angle, ties to the brighter. A drag never selects.
- **Given** a click near a line but not a star, **then** its constellation is selected.
- Selection stays stable by id, is shown by shape as well as color, and is announced to screen readers. `Escape` clears it.

### US4 (P1): subtle labels, always on

- Constellation labels show by default in muted text, do not overlap each other, thin out when crowded (more so on small viewports), and strengthen when selected.

### US5 (P2): reachable behind a link only

- `#e=` opens the Explorer. A bad link shows a clear error with a way back. `#s=`, `#studio=` and the landing behave exactly as today, and Explorer code loads lazily.

## Requirements

- **FR-001** Poster modules do not change. Reference images stay valid.
- **FR-002** `planFrame` and picking are pure and need no Canvas. The renderer only draws a plan.
- **FR-003** No React state changes per pointer move or per frame.
- **FR-004** Colors come from design tokens, and copy from the i18n catalogue and `ux-vision.md`.
- **FR-005** Colors in canvas meet the existing contrast approach; selection does not rely on color alone.
