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

## Orientation (normative)

The sky is north-up, east-right, in canvas convention (y down-positive):
`project()` returns north as negative y, and every mapping from unit space to
pixels preserves the sign — no flip is due anywhere in the chain. A minus on
any mapping mirrors that layer against all the others, and because PNG, SVG
and PDF can share the same mirror while the hit-test reads the model, the
failure presents as hovering naming the mirror image of the cursor. Pinned by
`site/src/lib/render/orientation.test.ts` (model pixels coincide with drawn
pixels; north draws above centre) and the northern-sky journey in
`site/e2e/interactive.spec.ts`.

## Visual regression (replaces the old parity harness)

There is no second implementation, so no cross-renderer tolerance. The guard is
a **reference-image suite**: `fixtures/render-matrix.json` renders through the
real renderer and is compared against stored PNGs in
`site/src/lib/render/__references__/`, with exact structural counts as the
primary check and two pixel bars (changed-fraction, mean). See
`site/src/lib/render/README.md` for why two bars are needed.
