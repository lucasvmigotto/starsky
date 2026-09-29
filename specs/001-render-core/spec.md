Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: render-core

**Feature Branch**: `feat/render-core`

**Created**: 2026-09-29

**Status**: Draft

**Input**: Reconstructed from `src/starpy/render/*`, `src/starpy/astro/*`, `src/starpy/schemas/inputs/render.py`.

## User Scenarios & Testing

### User Story 1 - Night-sky poster from place + moment (Priority: P1)

A user gives lat/lon (or resolved place), a local datetime + timezone, and render options, and gets a deterministic poster image with caption. [OBSERVED: `src/starpy/render/figure.py:259-329`]

**Why this priority**: the product's core value.

**Independent Test**: `uv run pytest tests/render tests/astro -q` green 2026-09-29 (part of 76-pass fast suite). [OBSERVED: test run output]

**Acceptance Scenarios**:

1. **Given** mag-filtered catalog and Skyfield ephemeris, **When** `project_visible` runs, **Then** only `mag <= limit` and `alt > 0` stars project to the unit disc via stereographic/fisheye. [OBSERVED: `figure.py:65-111`]
2. **Given** projected stars, **When** `declutter(min_separation)` runs, **Then** brightest-first `cKDTree` keeps no two within the separation. [OBSERVED: `render/density.py:12-44`]
3. **Given** options + caption inputs, **When** composing, **Then** glow (`mag<3.5`), constellation lines/labels, circle ring, and 1–2 line caption render with tokens `background #0b0f19 / star #f5efe0 / line #b98a8a`. [OBSERVED: `figure.py:114-232`; `render-spec.json:6-11`]

### User Story 2 - Print-ready vector export (Priority: P2)

Same inputs → SVG/PDF via native matplotlib backends. [OBSERVED: `figure.py:363-380`]

**Independent Test**: CLI vector path exercises `export_vector`. [OBSERVED: `cli.py:175-206`]

**Acceptance Scenarios**:

1. **Given** `--output poster.pdf`, **When** rendering, **Then** `compose_figure + fig.savefig(format=suffix)` writes the vector. [OBSERVED: `figure.py:374-379`]

### Edge Cases

- Empty visible sky → empty-schema frames propagate without crash. [OBSERVED: `figure.py:76-99`]
- `fisheye_strength <= 0` raises `ValueError`. [OBSERVED: `astro/projection.py:51-52`]
- Below-horizon stars kept by `altaz_for_stars`, filtered downstream. [OBSERVED: `astro/positions.py:24-25`]

## Requirements

### Functional Requirements

- **FR-001**: System MUST filter by `magnitude_limit [1,8]` and altitude `> 0`. [OBSERVED: `figure.py:75-89`]
- **FR-002**: System MUST support `stereographic` (`r=cos_alt/(1+sin_alt)`) and `fisheye` (`r=((90-alt)/90)**strength`), north-up. [OBSERVED: `astro/projection.py:33-55`]
- **FR-003**: System MUST declutter brightest-first with `min_separation [0,0.1]`. [OBSERVED: `render/density.py:12-44`]
- **FR-004**: System MUST format captions per `format_coords/format_caption` (4-decimal N/S/E/W; place segment omitted when unresolved; title gates 2-line vs 1-line). [OBSERVED: `render/caption.py:13-38`]
- **FR-005**: System MUST compute deterministic `cache_key = sha256(lat:.4f|lon:.4f|place|iso|tz|options_json|size)`. [OBSERVED: `figure.py:332-353`]
- **FR-006**: System MUST render circle ring + caption band 0.22 with `FONT_STACK=[Cormorant Garamond, EB Garamond, DejaVu Serif]`. [OBSERVED: `figure.py:50-51,191-231`]

### Key Entities

- **ProjectedVisible**: `hip,x,y,mag` unit-disc frame.
- **Segments**: `abbr,name,x_a,y_a,x_b,y_b` joined lines.
- **Labels**: `abbr,name,x,y` figure centroids.

## Success Criteria

- **SC-001**: Unit/golden render tests pass; output byte-deterministic for fixed inputs at fixed size (integration asserts this with warm cache). [OBSERVED: `tests/integration/test_smoke.py:34-74`]
- **SC-002**: Empty-sky and invalid-strength cases handled without crash.

## Assumptions

- [ASSUMPTION: poster aesthetics (fonts, colors, band fraction) are intentional product choices; confirm with owner.]
