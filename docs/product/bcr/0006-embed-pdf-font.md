# BCR-0006 — Embed the poster font in the exported PDF

Status: accepted (2026-09-30)
Owner: you
Date: 2026-09-30
From: `project:refactor` follow-up, found by 007 T031

## Current behavior

The PDF export is true vector with real, selectable text — but it uses the
**14 standard PDF fonts** and embeds nothing. The constellation labels are drawn
through `/BaseFont /Times-Roman`; a reader substitutes its own face. The poster's
Cormorant Garamond never reaches the file.

The PNG and the SVG are correct: the canvas and the inline SVG both use the
webfont supplied by `@font-face`. Only the PDF loses the face.

Evidence: `specs/007-renderer-export/finding-pdf-font-not-embedded.md`, and the
failing journey `site/e2e/j3-offline-export.spec.ts` ("embeds the font").

## Proposed behavior

Register the poster font with jsPDF before `svg2pdf` renders:

- ship a **subset** of the bundled TTF with the site (see *Measurements*),
- `addFileToVFS(name, base64)` then `addFont(...)` with a family name, then
  `setFont(...)` so the SVG's `font-family` resolves to it,
- keep the full TTF in the repo for the Python side and for regenerating the
  subset.

The PDF then carries the poster's own typography, self-contained on any reader,
which is what `contracts/render-spec.md` already requires.

## Why

BCR-0004 exists so the poster's typography is guaranteed rather than left to the
environment; the export contract states the PDF must embed its font. One of the
three export formats silently ignores that. A visitor exporting a PDF today gets
a poster set in Times.

## Measurements (taken 2026-09-30, jsPDF 4.2.1)

| | Result |
|---|---|
| Full TTF (1.2 MB) embedded | works — `/FontFile2` present, `/Subtype /Type0` |
| **Subset, ~80 glyphs (104 KB)** embedded | **works** — 12.7 KB PDF, font embedded |
| woff2 (209 KB) embedded | **fails** — jsPDF parses only TrueType; woff2 is Brotli-compressed |
| Variable-weight axis | not a problem — jsPDFembedded the variable TTF as-is |

So no build-time font instancing is needed; a subset is the only preprocessing,
and it cuts the shipped asset to roughly half the woff2 that already ships.

## Impacts

- **Bundle**: +104 KB (subset TTF) alongside the 209 KB woff2. Acceptable; noted
  against the bundle budget, which currently sits at 364 KB of a 5120 KB limit.
- **PDF size**: roughly 12.7 KB per export for the font subset at this glyph
  count — smaller than the current 300 KB output, because the standard fonts are
  no longer being registered wholesale.
- **Users**: PDFs render identically everywhere, in the poster's face.
- **Contract**: no change — this makes the implementation match what the contract
  already says.

## Data migration

None. Existing share links are unaffected; only the export path changes.

## Tests that will prove it

- `site/e2e/j3-offline-export.spec.ts` — the "embeds the font" assertion, which
  fails today, passes.
- A unit assertion in `export.test.ts` that a built PDF contains a `FontFile`
  table and no longer depends on a standard font for its text.
