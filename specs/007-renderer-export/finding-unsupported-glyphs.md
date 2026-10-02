# Finding — the poster face has no emoji or CJK, so the three exports disagree

Status: **fixed** — 007 T042, `feat/007-reject-undrawable-titles`
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

## The decision, and what was done

Three ways out were laid out. **The first was chosen** (2026-10-02): make the
failure visible rather than ship a box. The two paths split on purpose, because
the visitor's situation differs.

- **Authoring refuses.** `LandingPage` awaits the face, probes the title, and on
  any undrawable character sets the existing inline `role="alert"` error naming
  it — `fontError.titleUnsupported`. Nothing was created, so nothing is lost.
- **Decode adjusts and says so.** `ViewerPage` strips the character once the
  face is loaded, renders the poster anyway, and states the adjustment
  (`fontError.titleAdjusted`). The recipient cannot fix the sender's title, and a
  link that refuses to render is a worse failure than an adjusted one. Silence
  would not be acceptable: a poster quietly differing from what was shared is
  the same dishonesty as the notdef box, one level up.

Both **measure** rather than ask, via a canvas set to `"Cormorant Garamond"`
*alone*, comparing each character's advance with the font's notdef advance
(U+FFFF). Advance, not pixels: a notdef box is a *shape*, so rasterising and
comparing would also pass on a glyph that merely resembles one. Advance is also
what the caption-width constraint does its arithmetic on.

Both wait on `document.fonts.ready` first. An unloaded face measures as notdef
for every character, which would refuse every title in the product.

> **The first implementation used `document.fonts.check()` and it was wrong.**
> CI caught it on 2026-10-02: the e2e asserted the adjustment notice appeared for
> a shared `E2E 🌌 Night` and it did not. `check()` treats the question as "can
> *any* available font render this", so on a machine with an emoji font installed
> — which the Playwright image has — it answered *yes* for 🌌. That is precisely
> the disagreement this work exists to report, answered backwards, and it failed
> silently: no error, no warning, just a poster with a box in it. The unit tests
> passed throughout, because they injected a fake probe and so could only ever
> test the branching. Worth remembering: **a probe of this kind has to be
> exercised against the real font in a real browser**, which is why
> `undrawable-title.spec.ts` exists even though the branching is already covered
> by 13 unit cases.

Stripping closes the gap it leaves — `Noite 🌌 Austral` becomes `Noite Austral`,
not `Noite  Austral`. A double space reads on the poster as a typo in the
sender's typing rather than as our adjustment.

The third option (bundle a fallback face) stays available and is still the answer
if the product ever wants emoji titles to work rather than be refused.

## What is pinned now

`site/src/lib/render/glyph-coverage.test.ts` asserts today's behaviour in both
directions: the Latin-1 + punctuation set the product emits **is** covered, and
the emoji/CJK set **is not**, with a message saying the finding is stale if that
stops being true. It also guards the probe — if the notdef advance ever equalled
a real glyph's, every assertion would pass vacuously. That test is why bundling
a fallback face later is a deliberate act rather than a silent improvement: it
will fail, and say why.

`site/src/lib/render/glyphs.test.ts` covers the branching with an injected probe,
including the two ways this can go wrong in production: refusing a title the face
*can* draw, and accepting one it cannot. That is not sufficient on its own — it
is what let the `document.fonts.check` version ship — so
`site/e2e/undrawable-title.spec.ts` exercises both paths against the real bundled
face in a real browser, which is the only place the *discrimination* can be
checked.

That spec also had to learn something about the form: the title field lives
inside the collapsed "Render options" `<details>`, so it is in the DOM but not
visible, and `getByLabel(/title/i).fill()` fails with a bare 30s timeout that
names nothing. It addresses `#landing-title` after opening the disclosure, as
`j4-place-lookup.spec.ts` already did for the other optional fields.

## Not covered

- **The PDF path with a missing glyph** is untested. `exportPdf` loads the font
  through `fetch`, so it cannot run outside a browser; the browsers are not
  cached on the machine this sweep ran on. The green `j3-offline-export.spec.ts`
  covers the *embedded font* for a plain title, not a missing glyph.
- **What a browser actually draws** for the emoji is unverified. Browsers apply
  their own last-resort fallback, so the canvas finding may not transfer. The
  PNG result is the one that is certain, because PNG is rasterised here.