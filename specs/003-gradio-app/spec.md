Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: gradio-app

**Feature Branch**: `feat/gradio-app` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: `src/starsky/gui/**`, `src/starsky/main.py`, `app.py`, `tests/gui/*`.

## User Scenarios & Testing

### User Story 1 - Interactive poster builder (Priority: P1)

Single-route `sky` page: Location tab → `mode radio(place|coordinates)`, lat/lon Numbers (40.7580/-73.9855, bounds enforced), place Textbox (default Times Square), resolved readout, when DateTime + tz Textbox (UTC) + auto-detect button, options Accordion (closed), Render → Image, share row, OSM footer. [OBSERVED: `gui/pages/sky.py:31-76`; `gui/components/sky.py:25-202`]

**Independent Test**: component `.dump()` + callback tests green in fast suite. [OBSERVED]

**Acceptance Scenarios**:

1. **Given** 16 render inputs, **When** Render clicked, **Then** `on_render(inputs) → output Image`. [OBSERVED: `pages/sky.py:78-96`]
2. **Given** place text, **When** changed, **Then** `on_geocode_preview → resolved display_name`. [OBSERVED: `pages/sky.py:103`; `callbacks/skymap.py:58-63`]
3. **Given** coords/place, **When** Detect clicked, **Then** `on_detect_tz → tz_name`. [OBSERVED: `pages/sky.py:100-102`; `skymap.py:51-56`]

### User Story 2 - Share from GUI (Priority: P2)

Share button → `on_share_link(same 16) → share_link_box` via `SharePayload + SHARE.BASE_URL`. [OBSERVED: `pages/sky.py:97-99`; `skymap.py:147-195`]

### Edge Cases

- Blank place preview → `""`. [OBSERVED: `skymap.py:58-63`]
- Bad lat → Pydantic `ValidationError` surfaced by callback test. [OBSERVED: `tests/gui/test_callbacks.py:58-85`]
- `coerce_when` accepts datetime/epoch/iso else `ValueError`. [OBSERVED: `skymap.py:22-30`]

## Requirements

- **FR-001**: MUST wire `on_render/on_detect_tz/on_geocode_preview/on_share_link` exactly as `main.py:36-40` binds.
- **FR-002**: MUST keep slider ranges: fisheye 0.1–3.0, separation 0–0.05, magnitude 1–7, glow 0–3. [OBSERVED: `components/sky.py:122-161`]
- **FR-003**: MUST launch via `app.launch(**GRADIO.config)` with `SERVER_NAME/PORT`, analytics off, share off. [OBSERVED: `settings/gradio.py:10-40`; `main.py:43`]
- **FR-004**: HF entry MUST honor `$PORT` defaulting 7860. [OBSERVED: `app.py:18`]

## Success Criteria

- **SC-001**: Component/callback suites green; manual smoke renders an image and copies a `#s=` link.
