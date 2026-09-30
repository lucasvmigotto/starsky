# BCR-0010 — Constrain the caption to its band in every renderer

Status: accepted (2026-09-30)
Owner: you
Date: 2026-09-30

## Current behavior

The poster's caption is drawn without any width constraint:

- `site/src/lib/render/poster.ts` — `ctx.fillText(detail, sizePx / 2, bandMid)`
- `site/src/lib/render/export.ts` — a single `<text>` element with the same string

Canvas 2D draws text at its natural width, and SVG does the same. The caption is
centred at `sizePx / 2` inside a band that is exactly `sizePx` wide, so any
detail line longer than the band runs off both edges and is clipped.

`formatDetailLine` produces `{coords} — {place} · {local} {tz}`, which is long
whenever a place resolves to a full `display_name` and the timezone is a full
IANA identifier. A real case from the Viewer's own caption preview:

```
40.7580°N, 73.9855°W — Times Square, New York, United States · Jan 1, 2026, 12:00 AM America/New_York
```

renders clipped to `0°N, 73.9855°W — … America/New`. The coordinates — the part
that identifies the moment — are the first thing lost.

## Proposed behavior

Constrain the caption to the band's usable width so it always renders whole:

| Layer | Change |
|---|---|
| `poster.ts` | Pass a `maxWidth` equal to the band's inner width (band width less a margin) to `fillText`, so the canvas scales the text down to fit. |
| `export.ts` | Apply the equivalent constraint to the SVG `<text>`, so both renderers agree. |

The inner width must be **identical** in both renderers. This is constitution
principle II: one renderer, one contract. A fix applied to only one of them
would produce a PNG and an SVG of the same moment that differ in caption
typography — precisely the drift the principle exists to prevent.

When the text must shrink, it shrinks uniformly; it is never truncated with an
ellipsis. A truncated coordinate is worse than a smaller one, because it looks
like a rendering fault rather than a layout decision.

## Why this is a BCR and not a bugfix

It changes the exported artifact for every moment whose caption is long, and it
requires **regenerating the reference fixtures** in
`specs/007-renderer-export/fixtures/`, because `reference.test.ts` compares
pixels and the caption string against stored values.

That is the same cost as repainting the poster's palette (vision D19), and it
gets the same treatment: recorded, accepted, and with the regeneration visible
in history. A silent fix here would alter what every shared link produces
without anyone having decided that.

## Impact

- **Affected**: any moment with a resolved place and/or a non-UTC zone — most
  real payloads.
- **Unaffected**: short captions (a coordinate-only moment with `UTC`) may
  render pixel-identical if they already fit.
- **Tests**: `reference.test.ts` fixtures are regenerated deliberately; the
  structural, boundary and font suites are unchanged.
- **Not affected**: `render-spec.json` values. `bandFraction` and the font sizes
  are unchanged; only the fitting behaviour is added.

## Measured effect, and a known limit

The caption's font size is fixed in points (`detailFontSize` 10.5pt at
`referenceDpi` 150 → 21.88px) while the band scales with the poster. That
asymmetry means **small posters were always the worst case**, not large ones.
With this long detail line (101 characters):

| Poster size | Band | Natural width | Fitted size | Shrink |
|---|---|---|---|---|
| 320px | 301px | 1016px | 6.47px | 70% |
| 640px | 602px | 1016px | 12.95px | 41% |
| 1024px | 963px | 1016px | 20.72px | 5% |
| 1400px | 1316px | 1016px | 21.88px | none |
| 2400px+ | — | 1016px | 21.88px | none |

So the defect clipped at **every size below ~1150px** — including the 320px
mobile export and the on-screen preview — and the fix restores all of them.

**Known limit, deliberately not solved here:** at 320px the caption shrinks to
6.47px, which fits but is barely legible. That is a *proportional-scaling*
limit, not a clipping one: the caption is one long line, and shrinking a single
line is the only way to keep it on one row without changing the spec's frozen
geometry. The correct fix is to **wrap the caption onto multiple lines** at
small sizes, which is a composition change and therefore its own BCR. Until
then, small posters are correct but small-typed — an improvement over clipped,
not a finished state.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Truncate with an ellipsis | A clipped coordinate reads as a bug and is less useful than a smaller complete one. |
| Widen the band | `bandFraction` is normative in `render-spec.json` (BCR-0007-era frozen geometry); changing it moves the whole composition. |
| Reduce `detailFontSize` in the spec | Same problem: a spec change affecting every poster, for a problem that only long captions have. |
| Fix only `poster.ts` | Produces PNG/SVG disagreement — a direct constitution II violation. |