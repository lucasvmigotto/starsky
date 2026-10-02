# Feature Specification: renderer-export

**Feature Branch**: `feat/renderer-export`

**Created**: 2026-09-29

**Status**: Draft

**Input**: BCR-0002 (accepted) and ADR-0003 — the browser is the **sole**
renderer (BCR-0005 removed the Python one).

## User Scenarios & Testing

### User Story 1 - Render a poster in the browser (Priority: P1)

A visitor opens a shared sky (or builds one on the landing page) and gets a
poster-quality image rendered entirely in the browser: stars, glow,
constellation lines and labels, circle/square frame and the caption block —
using the values in `render-spec.json`, which is this renderer's normative
contract.

**Why this priority**: this is the refactor's top-ranked goal (new capability)
and removes the product's dependence on a Python server.

**Independent Test**: open a known `#s=` link; the canvas is produced with no
network request for the poster, and the golden/reference suite
(`site/src/lib/render/`) passes.

**Acceptance Scenarios**:

1. **Given** a valid share payload, **When** the poster renders, **Then**
   stars are sized `14·10^(mag/-2.5)` clamped to [0.6, 14] and drawn `size`
   **points** across (`× referenceDpi/72` px), glow applies only below
   magnitude 3.5, the caption band is 0.22 of the height, and colours are the
   `render-spec.json` tokens.
2. **Given** a low-magnitude limit, **When** the poster renders, **Then**
   decluttering keeps the brightest stars by `min_separation`, and figures and
   labels are computed from **all visible** stars (not the decluttered set).
3. **Given** the fixture matrix, **When** the reference suite runs, **Then**
   the rendered PNGs match the stored references (visual regression), with no
   second implementation to compare against.

### User Story 2 - Export PNG, SVG and PDF (Priority: P1)

The visitor exports the poster as a PNG (raster), an SVG (vector) and a PDF
(true vector, selectable text), each with the caption block and bundled font.

**Independent Test**: export all three from a fixed sky; open each; assert the
caption text, star count and font are present (text selectable in the PDF,
`<text>`/paths present in the SVG).

**Acceptance Scenarios**:

1. **Given** a rendered poster, **When** the user exports PNG, **Then** the
   file is a valid image at the chosen size and DPI.
2. **Given** a rendered poster, **When** the user exports SVG, **Then** the
   SVG opens standalone with the embedded font and no external requests.
3. **Given** a rendered poster, **When** the user exports PDF, **Then** the
   PDF is vector (no full-page raster) and its text is selectable.

### User Story 3 - Reopen an exported poster offline (Priority: P2)

An exported SVG/PDF opens on a machine with no network and renders
identically, because the font and all assets are embedded.

**Independent Test**: open the SVG/PDF with network disabled.

**Acceptance Scenarios**:

1. **Given** an exported SVG with network disabled, **When** it opens,
   **Then** the typography matches the rendered poster (no fallback font).

### Edge Cases

- Empty visible sky → a poster with frame and caption and no stars, not a
  blank canvas. [OBSERVED: `render/figure.py:76-99`]
- `fisheye_strength <= 0` → rejected by validation before rendering. [OBSERVED: `astro/projection.py:51-52`]
- A missing font asset → a hard error surfaced in the UI; never a silent
  fallback (constitution III).
- Very small viewports → the render adapts size but keeps the caption band
  ratio.

## Requirements

### Functional Requirements

- **FR-001**: The renderer MUST read every visual token from `render-spec.json`
  and MUST NOT hard-code a token value (constitution II).
- **FR-002**: The renderer MUST implement stereographic and fisheye projection
  per `render-spec.json` `projection`.
- **FR-003**: The renderer MUST filter stars by `magnitude_limit`, drop
  `alt <= 0`, declutter brightest-first by `min_separation` for **drawing**,
  and compute figures/labels from all **visible** stars.
- **FR-004**: The renderer MUST produce the caption per `render-spec.json`
  `caption` (title line optional; detail line `coords — place · local tz`).
- **FR-005**: The renderer MUST support `circle` (ring + circular alpha mask)
  and `square` shapes.
- **FR-006**: Export MUST produce PNG, SVG and PDF; the PDF MUST be
  true-vector with embedded font and selectable text.
- **FR-007**: Rendering MUST be deterministic for the same inputs and MUST NOT
  make a network request.
- **FR-008**: Poster rendering and export MUST stay within the performance
  budget defined in `plan.md` on a mid-range phone.
- **FR-009**: All point-based sizes MUST convert by `units.referenceDpi`
  (`px = pt × referenceDpi / 72`), never by canvas ratio.

### Key Entities

- **ProjectedSky**: visible stars with unit-disc `x,y` and size.
- **Segments / Labels**: constellation lines and figure centroids.
- **Caption**: title and detail lines.
- **ExportFormat**: `png` | `svg` | `pdf`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The reference suite matches its stored PNGs for the fixture
  matrix — the browser is the only implementation, so there is no cross-renderer
  tolerance.
- **SC-002**: PNG/SVG/PDF exports open and contain the expected caption and
  star count in 100 % of the sample set.
- **SC-003**: A mid-range phone renders and exports within the time budget.
- **SC-004**: `render-spec.json` conformance tests pass.

## Assumptions

- [ASSUMPTION] Poster default size remains 1600 px at caption band 0.22; larger
  sizes are a user option, not a new default.
- [ASSUMPTION] `referenceDpi: 150` is the reference geometry; the browser may
  render crisper (higher device pixel ratio) without changing poster layout.
