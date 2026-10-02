# Finding — the browser degrades on a missing font; Python used to be fatal

Status: **fixed** — BCR-0007, implemented 2026-09-30
Found by: `site/e2e/font.spec.ts` (007 T032), 2026-09-29
Related: BCR-0004 (which removed the *silent* fallback on the Python side)

## What each side does

**Python (removed by BCR-0005):** `FontUnavailableError` — a missing bundled
font was a hard error. The process refused to render. BCR-0004 removed a silent
fallback precisely because a wrong-looking poster is the worst failure mode.

**Browser (current):** `ViewerPage` waits on `document.fonts.ready` and then
redraws (`ViewerPage.tsx:80-89`). If the `.woff2` request fails, the promise
still settles, the redraw happens, and the canvas draws whatever face the
browser resolved — a system serif, with different metrics. **No error is shown.**

Verified: with the font request aborted, the poster still renders
(`e2e/font.spec.ts`, test 3). The test asserts "does not crash", which is all the
current code guarantees.

## Why it is weaker than it looks

A poster drawn in the wrong face is not visually obvious in a screenshot and not
caught by the reference suite (which runs on `@napi-rs/canvas`, where the font is
loaded from disk). So a *deployed* font failure would produce wrong posters with
every gate green.

Likelihood is low (same-origin, bundled, hashed asset), but the failure is
silent — the exact class BCR-0004 was written to eliminate.

## Options

1. **Fail loudly**: if `document.fonts.check('16px "Cormorant Garamond"')` is
   false after `fonts.ready`, show a visible error instead of the poster.
   Matches BCR-0004's intent; costs a check on one code path.
2. **Block on the font**: render only after the font resolves *successfully*,
   with a timeout that errors. Removes the "redraw with fallback" window
   entirely.
3. **Accept and document**: same-origin hashed asset, treated as reliable; leave
   the degradation silent.

## Recommendation

Option 1 — a cheap check at the point the poster is about to draw, restoring the
guarantee BCR-0004 established. Option 2 is cleaner but changes the render
lifecycle.

**Resolved (BCR-0007)**: `ViewerPage` now checks `document.fonts.check()`
after the fonts settle. If the poster's face did not resolve, the viewer shows
a `role="alert"` naming the font and **withholds the poster** rather than drawing
it in a substituted typeface. Verified in a browser with the webfont aborted.
