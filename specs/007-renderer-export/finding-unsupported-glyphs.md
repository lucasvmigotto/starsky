# Finding — the poster face has no emoji or CJK, so the three exports disagree

Status: **open** — needs a product decision, not a code fix
Found by: charter C1 and C2 (007 T040/T041), 2026-10-02
Severity: **Medium** — every poster is affected only if the visitor uses one of
these characters in a title or place name; the failure is silent and the
disagreement is between formats.

## What happens

The poster is drawn entirely in `"Cormorant Garamond", serif` — measured at
`poster.ts:215`, `:272`, `:315`, `:409`. The bundled face covers Latin-1 accents
and punctuation. It has **no glyph** for emoji or CJK. Measured by comparing
each character's advance with the font's notdef advance (U+FFFF):

| present | absent (advance == notdef) |
|---|---|
| `° — · → ' " ( )` and `á à â ã ä å é è ê ë í ì î ï ó ò ô õ ö ú ù û ü ñ ç ø ß Æ æ Ø Ł ł ’` | `🌌 U+1F30C` · `✨ U+2728` · `🌙` · `東 U+6771` |

Nothing crashes. The missing glyph falls through the font stack to the generic
`serif` family, which has no emoji either, so the renderer produces a notdef box
and reports success.

The problem is not the box. It is that **the three output formats resolve the
same title three different ways**:

- **PNG** is rasterised at export time, so the notdef box is baked in and looks
  identical on every machine. Deterministic, and wrong.
- **SVG** carries the character faithfully — verified with an independent XML
  parser: `Noite 🌌` survives as U+1F30C inside the `<text>` node. What a reader
  sees then depends on which fonts *their* viewer has: a colour emoji on a
  desktop, a box on a bare system.
- **PDF** embeds a subset of the poster face carrying "exactly the glyphs the
  poster can draw" (`export.ts:260`). An absent glyph has no outline to subset,
  so the outcome is a viewer substitution or nothing at all.

So the same title can come out of the same viewer as three different posters.

## Why it was not caught

Every layer that could have noticed was looking at the wrong thing:

- The unit suites compare *structure* — counts, caption strings — and the caption
  is built correctly; only the glyph is missing.
- `reference.test.ts` compares pixels, but every reference case uses an ASCII or
  accented title. Nothing in the matrix uses a character the face lacks.
- `spec.test.ts` checks tokens, not glyph coverage.
- The e2e suite exports with a plain title. `j3-offline-export.spec.ts` proves
  the *embedded font* works, which is a different question from whether the face
  has the glyph.

BCR-0004 and BCR-0007 both hardened the *font loading* path, and BCR-0006
embedded the face in the PDF. All three are correct, and all three are silent
about a character the face does not contain. This is the same failure one layer
down: BCR-0007 made a *missing font* fail loudly; nothing makes a *missing glyph*
anything but silent.

## Verified clean on the same sweep

C1's other axes were swept against the real ~1.8k-star catalog and nothing broke,
so they are now pinned as regression tests:

| axis | result |
|---|---|
| latitudes +90, ±89.9, ±89, ±85, ±66.6, 0 | finite coordinates, no blank canvas, 1770–1921 stars, 40–56 figures |
| June/December solstice, both equinoxes, at 85°N | finite, on the disc |
| `min_separation` 0 → 0.2 | monotonic (2122 → 1866 → 541 → 53 stars); figures constant, built pre-declutter |
| accents and a comma in a place name | preserved: `São Paulo, Brasil`, `23.5500°S, 46.6300°W — … · Jan 15, 2026` |

The pole case is the one worth noting: a stereographic projection is normally
*undefined* at the pole, where every right ascension collapses and the divisor
goes to zero. It is fine, and `boundaries.test.ts` now pins it with a synthetic
72-star sphere that puts stars exactly on the axis.

C2's other checks, with parsers independent of the ones that produced the files
(Python's `xml.etree` and `struct`/`zlib`, not the DOM and canvas that wrote
them):

| check | result |
|---|---|
| PNG structure | 1600×1952, 8-bit RGBA, 58 chunks, valid CRCs, for every case |
| SVG self-containment | zero external `href`, zero `url()`, zero `<image>` — no rasterisation |
| element census stable across titles | 1880 circles, 408 lines, 52 text nodes in all four cases |
| clipped text | none observed; the caption-width constraint holds |

## The decision this needs

Three ways out, none of them obvious, and not this document's to pick:

1. **Reject a title the face cannot draw**, in the spirit of BCR-0007. A visitor
   gets a clear message naming the offending character instead of a box in their
   poster. Cost: a title someone can legitimately type is refused. Note this
   needs a *place*-name path too — place names are catalogue-driven, so this is
   mostly about the title.
2. **Bundle a fallback face** for the ranges above Latin-1. Cost: bundle budget
   (currently a 500 KB brotli ceiling, and the face is most of it), plus the
   decision of which ranges to cover.
3. **Accept it and document it** — state that output is Latin-1 plus punctuation
   and platform-dependent beyond that. Cost: the three formats still disagree,
   which is the part that is actually wrong rather than merely limited.

Option 1 is the smallest change that makes the failure visible, and visibility is
what every previous font BCR bought. Option 3 is honest but leaves two of the
three exports lying.

## What is pinned now

`site/src/lib/render/glyph-coverage.test.ts` asserts today's behaviour in both
directions: the Latin-1 + punctuation set the product emits **is** covered, and
the emoji/CJK set **is not**, with a message saying the finding is stale if that
stops being true. It also guards the probe — if the notdef advance ever equalled
a real glyph's, every assertion would pass vacuously.

Behaviour is unchanged. No title is refused, no fallback face is added; this
records the gap so it cannot be rediscovered from a finished poster.

## Not covered

- **The PDF path with a missing glyph** is untested. `exportPdf` loads the font
  through `fetch`, so it cannot run outside a browser; the browsers are not
  cached on the machine this sweep ran on. The green `j3-offline-export.spec.ts`
  covers the *embedded font* for a plain title, not a missing glyph.
- **What a browser actually draws** for the emoji is unverified. Browsers apply
  their own last-resort fallback, so the canvas finding may not transfer. The
  PNG result is the one that is certain, because PNG is rasterised here.