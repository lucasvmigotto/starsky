# BCR-0007 — Fail loudly when the poster font does not load

Status: accepted (2026-09-30)
Owner: you
Date: 2026-09-30
From: finding `specs/007-renderer-export/finding-font-degradation.md`

## Current behavior

`ViewerPage` waits for `document.fonts.ready`, then redraws the poster
(`ViewerPage.tsx:80-89`). If the webfont request **fails**, that promise still
settles, the redraw happens, and the canvas draws whatever face the browser
resolved — a system serif, with different metrics. **Nothing is shown to the
visitor.**

Verified: with the font request aborted, the poster still renders and the test
can only assert "does not crash" (`site/e2e/font.spec.ts`).

## Proposed behavior

After the fonts settle, check that the poster's face actually resolved. If it did
not, **show an explicit error instead of a poster** rather than drawing in a
substituted face.

The browser has no start-up phase, so it cannot be fatal the way the Python
renderer's `FontUnavailableError` was. "Loud" therefore means: the visitor sees
that something is wrong, instead of silently receiving a poster in the wrong
typeface.

## Why

BCR-0004 removed a silent fallback specifically because a wrong-looking poster is
the worst failure mode. The browser reintroduced one: a deployed font failure
would produce wrong posters with every gate green — the reference-image suite
runs on `@napi-rs/canvas`, where the font comes from disk, so it cannot see a
browser-side load failure at all.

## Impacts

- **Users**: a broken font now surfaces as an error message rather than a
  subtly-wrong poster.
- **Tests**: `e2e/font.spec.ts`'s third case asserts the error rather than
  "does not crash" — a stronger assertion.
- **No contract change**: this restores the guarantee BCR-0004 established.

## Data migration

None.

## Tests that will prove it

- With `**/*.woff2` aborted, the viewer shows an error and does **not** present a
  poster as if it were correct.
- With the font available, the poster renders and no error appears.
