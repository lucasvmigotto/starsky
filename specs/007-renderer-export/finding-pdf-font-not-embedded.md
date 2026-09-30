# Finding — the exported PDF does not embed the poster font

Status: **open** — needs a decision; the export contract is not met
Found by: 007 T031 (opening an exported PDF standalone), 2026-09-30

## What happens

The PDF export produces a **true-vector** document (good) with **real text**
(good) — but it uses the **14 standard PDF fonts**, embedded nowhere:

```
/Type /Font        -> 14 occurrences
/BaseFont /Helvetica        /BaseFont /Helvetica-Bold
/BaseFont /Helvetica-Oblique /BaseFont /Courier
FontFile           -> 0 occurrences      ← nothing embedded
/Subtype /Type0    -> 0                  ← no composite/embedded font
```

`Helvetica` and `Courier` are the PDF standard fonts: a reader substitutes its
own face for them. These are jsPDF's defaults when no font is registered.

## Why it matters

`specs/007-renderer-export/contracts/render-spec.md` states the PDF must be
"true vector with **embedded font** and selectable text", and BCR-0004 exists
precisely so the poster's typography is guaranteed rather than left to the
environment. The PNG and SVG honour that; **the PDF does not.**

Concretely, a visitor who exports a PDF gets a poster whose title and caption are
in Helvetica — a different typeface from the one on screen, and one the poster
was never designed with. On a machine with no Helvetica (Linux readers commonly
substitute), the metrics shift again.

## Cause

`exportPdf` (`site/src/lib/render/export.ts`) builds an `SVGDoc` and hands it to
`svg2pdf.js` + jsPDF without registering any font. jsPDF falls back to its
built-in faces; svg2pdf maps the SVG's `font-family` to whatever jsPDF has,
which is those standards.

The frozen output shows it directly: the constellation labels are drawn with
`/F9`, which the resource dictionary binds to `/BaseFont /Times-Roman`, and the
caption carries the SVG's own sizes (`14.58`, `35.42`) through that substituted
face — so the metrics are the poster's but the glyphs are Times.

The browser path is unaffected: `@font-face` supplies the webfont for the canvas,
so PNG and SVG use the right face. Only the PDF loses it.

## Options

1. **Register the font with jsPDF and map the SVG's family to it.** The bundled
   `.ttf` is already in the repo (`assets/fonts/CormorantGaramond.ttf`), so this
   is `doc.addFont(...)` + `doc.setFont(...)` before `svg2pdf`, plus keeping the
   font file in the shipped bundle. Makes the PDF match the poster and self-
   contained in one step. **Recommended.**
2. **Ship the PDF with the standard fonts and document it.** Cheap, but it
   abandons BCR-0004's guarantee for one of the three export formats, and the
   contract would have to be weakened to say so.
3. **Rasterise the PDF.** Guarantees appearance but loses vector output and
   selectable text — a regression on two other contract points.

## Not fixed here

Registering a font changes what every exported PDF contains, so it is a
behavioural change to a user-facing artifact — a BCR decision, not a test tweak.
The journey that found it is written to assert what the contract *requires*
(an embedded font), so it will fail until this is fixed or the contract is
deliberately amended.
