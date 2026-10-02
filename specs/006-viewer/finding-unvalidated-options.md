# Finding — share payload options are type-checked but not range-checked

Status: **fixed** — BCR-0008, implemented 2026-09-30
Found by: `site/src/lib/render/boundaries.test.ts` (007 T035), 2026-09-29

## What happens

`decodeShareFragment` (`site/src/lib/share.ts:72-105`) validates the *shape* of
a payload — `lat`/`lon` are numbers, `when_utc`/`tz` strings, `options` an
object — but never the **ranges**. A shared link is user-controllable input: a
crafted `#s=` can carry any option values.

Observed consequence: `fisheye_strength: 0` is accepted. In
`projectFisheye` (`astro.ts:74-82`) the radius is `((90-alt)/90) ** strength`,
so with `strength = 0` **every star collapses to `r = 1`** — the whole sky lands
on the horizon circle. It renders without error, which makes it worse than a
crash: a plausible-looking, wholly wrong poster.

The CLI rejected this (`fisheye_strength <= 0` raised `ValueError`), and
`render-spec.json` documents the valid ranges. The browser has no equivalent
guard.

## Same class, other options

| Option | Valid range (render-spec/schema) | Browser behaviour out of range |
|---|---|---|
| `fisheye_strength` | `(0, 3]` | `0` collapses the sky; negatives give `r` > 1 |
| `magnitude_limit` | `[1, 8]` | unbounded — a huge value iterates the whole catalog |
| `min_separation` | `[0, 0.1]` | negative is a no-op; huge drops most stars |
| `glow_intensity` | `[0, 3]` | unbounded (alpha is clamped at `min(i, 2)` in glow only) |

The landing form's controls enforce these; a hand-edited link does not.

## Options

1. **Validate on decode** (recommended): reject out-of-range options with
   `ShareDecodeError`, matching the CLI's old behaviour and the spec's declared
   ranges. Small, localised change in `share.ts`; needs a test per option.
2. **Clamp silently**: coerce to the valid range. Renders *something* sensible
   but hides malformed input.
3. **Accept and document**: treat the payload as trusted. Weakest — a shared
   link is not trusted input, and the failure is silent.

## Recommendation

Option 1. It is the smallest change that makes a crafted link fail loudly
instead of rendering a wrong poster, and it restores parity with the range
rules the Python renderer used to enforce.

**Resolved (BCR-0008)**: `decodeShareFragment` now rejects out-of-range
options with a `ShareDecodeError` naming the field and its bounds, using the same
values the landing form's controls enforce. Verified that every committed
`SAMPLE_FRAGMENTS` entry and a defaults payload still decode.
