# renderer-export contracts

## `render-spec.json` (normative, read-only here)

Every token the renderer uses comes from this file. Field list is frozen by
ADR-0003; a change updates the Python defaults in `src/starpy/settings/render.py`
and the TS `SPEC` in the same change. Conformance test: `site/src/lib/spec.test.ts`
(currently covers colours, star/line/shape/caption tokens and the size formula).

## Parity contract (browser ↔ CLI)

For a fixture matrix of (lat, lon, when_utc, tz, options, size):

| Field | Agreement |
|---|---|
| star count, constellation segment count, figure label count | exact |
| caption strings | exact |
| colours, ring, band geometry | exact token values |
| raster pixels | within tolerance: per-channel mean absolute difference ≤ 2/255, no pixel > 12/255 excluding antialiased edges |

The matrix, tolerance and how diffs are reported live in the harness added in
refactor Slice 0. Failures must be explained (rasteriser or font rasterisation)
before the default flips; unexplained diffs block the flip.

## Export contract

- **PNG** — canvas `toBlob`, chosen size and DPI, embedded caption.
- **SVG** — standalone document, `<text>` for caption, paths/lines for stars
  and constellations, embedded font (no external references).
- **PDF** — vector (no full-page raster), embedded font, selectable text,
  produced via `svg2pdf.js` + jsPDF from the SVG.

## Share payload (unchanged)

`v1` codec: canonical JSON (sorted, compact) → zlib-9 → base64url-no-pad →
`#s=`. New option fields are additive with defaults; the version is not bumped
for additive fields. [OBSERVED: `src/starpy/share/spec.py:20-45`]
