# Finding — the tools image had no font backend, so text rendered blank

Status: **fixed** in the tools image; decision needed on the references
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

## Correction to an earlier claim

The `refactor/poster-default` commit reported "reference images matched
unchanged". True **on the host**, and it did not mean the suite was
environment-independent — this finding is what established that.
