# BCR-0008 — Validate share-payload option ranges on decode

Status: accepted (2026-09-30)
Owner: you
Date: 2026-09-30
From: finding `specs/006-viewer/finding-unvalidated-options.md`

## Current behavior

`decodeShareFragment` (`site/src/lib/share.ts:72-105`) validates the **shape** of
a payload — `lat`/`lon` are numbers, `when_utc`/`tz` strings, `options` an object
— but never the **ranges**. A share link is user-controllable input, so a crafted
`#s=` can carry any option values.

Observed consequence: `fisheye_strength: 0` is accepted. The projection radius is
`((90-alt)/90) ** strength`, so at `0` **every star collapses to `r = 1`** — the
whole sky lands on the horizon ring. It renders without error, which makes it
worse than a crash: a plausible-looking, wholly wrong poster.

The landing form's controls enforce these bounds; a hand-edited link does not.
The deleted Python renderer rejected `fisheye_strength <= 0` with a `ValueError`.

## Proposed behavior

Reject out-of-range options on decode with `ShareDecodeError`, naming the field
and its bounds. The ranges are the ones the landing form already enforces:

| Option | Accepted range | Source |
|---|---|---|
| `latitude` | `[-90, 90]` | `LandingPage.tsx:256` |
| `longitude` | `[-180, 180]` | `LandingPage.tsx:271` |
| `fisheye_strength` | `[0.1, 3.0]` | `LandingPage.tsx:362` |
| `min_separation` | `[0.0, 0.05]` | `LandingPage.tsx:372` |
| `magnitude_limit` | `[1.0, 7.0]` | `LandingPage.tsx:382` |
| `glow_intensity` | `[0.0, 3.0]` | `LandingPage.tsx:421` |
| `projection` | `stereographic` \| `fisheye` | enum |
| `shape` | `circle` \| `square` | enum |

**Reject, not clamp.** Clamping would silently alter what a link asked for;
rejection tells the visitor the link is malformed. That matches the Python
renderer's former behaviour and the `InvalidState` the viewer already shows for a
corrupt payload.

## Why

A malformed or crafted link should fail visibly, not render a wrong poster. The
existing `InvalidState` already exists for exactly this; the options are simply
the field set it forgot to check.

## Impacts

- **Users**: a link with out-of-range options now shows "this link holds no sky"
  instead of a wrong poster. Links the landing form produces are unaffected —
  its controls cannot emit values outside these ranges.
- **Compatibility**: verified that the five committed `SAMPLE_FRAGMENTS` in
  `site/src/lib/site.ts` all use in-range values, so the sample links keep
  working. A payload with the defaults (`fisheye_strength: 1.0`,
  `min_separation: 0.008`, …) is unaffected.
- **Contract**: the share payload's `v1` codec is unchanged; only which values
  are *accepted* narrows.

## Data migration

None — payloads live only in URLs, and every in-range payload keeps working.

## Tests that will prove it

- A crafted fragment with `fisheye_strength: 0` is rejected, and the viewer shows
  the invalid state rather than a collapsed sky.
- One case per bounded option, at both ends and just outside.
- The committed sample fragments still decode.
