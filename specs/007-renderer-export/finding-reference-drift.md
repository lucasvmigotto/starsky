# Finding — the tools image had no font backend, so text rendered blank

Status: **fixed** in the tools image; the references stay host-generated for now —
decision taken 2026-10-01, see *Decision* below
Found by: `make test` in the `tools` image, 2026-09-30

## What happens

The reference-image suite passed on the host and failed in the `tools` image:

```
nyc-newyear-circle:  13.63% of pixels changed, over the 1% budget (meanAbs 11.31)
sydney-xmas-square:  15.03% of pixels changed, over the 1% budget (meanAbs 11.76)
```

All five pixel cases failed; every structural count still matched.

## Root cause — established, not inferred

The container shipped **no fontconfig and no system fonts**, so
`@napi-rs/canvas` had no font backend at all:

| Probe | Host | Container (before) |
|---|---|---|
| `32px "Cormorant Garamond"` — ink pixels | 1990 | **0** |
| `32px sans-serif` — ink pixels | — | **0** |
| `fc-list` available | yes | **no** |
| `/usr/share/fonts` | present | **absent** |

Even `sans-serif` drew nothing. So it was never about the bundled font being
missing — **every glyph silently vanished**, and the suite compared canvases
where all the text was simply absent.

## Why it matters beyond the test

Two separate conclusions:

1. **A test that lies.** On a bare image the suite compares blank text areas, so
   it would report "matches" for a renderer that draws no labels or caption at
   all. That is worse than no test: it is an assurance with nothing behind it.
2. **Not a product defect.** In a real browser the bundled webfont loads — the
   Playwright journeys prove the caption and labels render, and a browser does
   not depend on a system font backend the way a canvas library does. The gap was
   the *test environment's*, not the shipped site's.

## Fix applied

The tools image now installs `fontconfig` and the **bundled** poster font into
`/usr/local/share/fonts`, so its text rendering uses the product's own face
rather than whatever the base happened to carry. The build asserts
`fc-list | grep -qi cormorant`, so a regression fails the build rather than the
suite.

## Still open — the references

The stored references were generated on the **host**, which resolves fonts
differently from the fixed container. Under `containers.md` §2 the `tools` image
is the reference environment and its output is authoritative, so the references
should be regenerated **inside the tools image**.

**Not done here**: regenerating them changes what the suite approves, and it
should happen only once the container's text rendering is confirmed correct —
otherwise a genuinely wrong poster could be blessed as the baseline. The
regeneration is a deliberate step, with the diff reviewed.

## Decision (2026-10-01) — keep the host references, move the environment question

The references are **left as they are**, and the regeneration is not scheduled as
a 007 task. Two facts decided it:

1. **CI does not disagree with them.** `Site CI` runs `bun run test` on a plain
   runner, where the suite passes on every push — so the pixel bars are currently
   enforced against the same environment that produced the baselines. Nothing is
   red because of this.
2. **The tools image is green now.** The font backend is installed and the build
   asserts `fc-list | grep -qi cormorant`, so the cause above is closed. What
   remains is a *choice of reference environment*, not a broken test.

Regenerating would swap the approved baseline for a different rendering of the
same poster and make the diff un-reviewable at this point. The gap it would close
is small: the suite's text metrics are font-backend-sensitive, so it is
environment-coupled by design and the environment is asserted only where it
matters (the live font, the embedded-face checks).

**If it is taken up later**, it belongs to `008-site-delivery`, which already owns
making the `tools` image the delivery environment — at that point regenerate
inside the image, review the PNG diff by eye, and record the mean-absolute-delta
per case here. Do not do it as a side effect of unrelated poster work: a changed
baseline and a changed poster in the same commit cannot be told apart.

## Correction to an earlier claim

The `refactor/poster-default` commit reported "reference images matched
unchanged". True **on the host**, and it did not mean the suite was
environment-independent — this finding is what established that.
