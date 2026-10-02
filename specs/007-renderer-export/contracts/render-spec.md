# renderer-export contract

## `render-spec.json` (normative)

`site/render-spec.json` is the renderer's contract (ADR-0003 — the browser is the
sole renderer). It carries:

- `units.referenceDpi: 150` — every size below is **points**; pixels =
  `pt × referenceDpi / 72`. This field exists because the browser once scaled
  sizes by canvas ratio, drawing 2.8 px labels where the reference geometry is
  ~14.6 px.
- `units.starMarkerNote` — a star of magnitude `m` is `size(m)` points across.
- `colors`, `stars` (formula, min/max, glow, alpha), `constellations`
  (line, label), `shape` (ring), `caption` (band, fonts, single-line size),
  `projection` formulas, `fonts`, `shareLink` codec.

Conformance is tested on the TS side (`site/src/lib/spec.test.ts`): the spec on
disk and the `SPEC` constant must match field for field.

## Export contract

- **PNG** — canvas `toBlob`, chosen size, embedded caption.
- **SVG** — standalone document, `<text>` for caption and labels,
  paths/lines for stars and constellations, no external references.
- **PDF** — true vector via `svg2pdf.js` + jsPDF from the SVG; embedded font,
  selectable text, no full-page raster.

## Visual regression (replaces the old parity harness)

There is no second implementation, so no cross-renderer tolerance. The guard is
a **reference-image suite**: `fixtures/render-matrix.json` renders through the
real renderer and is compared against stored PNGs in
`site/src/lib/render/__references__/`, with exact structural counts as the
primary check and two pixel bars (changed-fraction, mean). See
`site/src/lib/render/README.md` for why two bars are needed.
