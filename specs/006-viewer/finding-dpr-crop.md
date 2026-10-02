# Finding — the blit cropped in logical pixels from a device-pixel source

Status: **fixed** — `fix/sky-canvas-dpr-blit`
Found by: a visitor report on the deployed site, 2026-10-02 — *"Canvas renders,
but it zoom in the left upper corner"*, then *"Opening the first time, it get
zoomed in upper left corner. If zoom out browser level and reloaded, it get
fixed."*
Severity: **High** — every HiDPI and browser-zoomed display got a broken map on
first paint, with no gesture available to recover (navigation did not exist yet
on the branch this was found from).

## What happens

The poster is composed into an offscreen canvas at `CANVAS_W * dpr` by
`CANVAS_H * dpr` device pixels (`SkyCanvas.tsx`, the `useMemo`). The blit that
puts it on screen then read its source rect as `0, 0, CANVAS_W, CANVAS_H` —
logical pixels. That is the whole image only at `dpr = 1`. Anywhere else it
cropped the top-left `1/dpr` of the poster and stretched it over the frame.

The destination stayed logical under `setTransform(dpr, …)`, so the crop was
the only wrong term — which is why the symptom was precisely "zoomed into the
upper left" rather than a blank or shifted canvas.

## Why zoom-out-plus-reload "fixed" it

Two facts combine:

- Browser zoom scales `window.devicePixelRatio`, so zooming out drags the ratio
  back toward 1, where the crop equals the full image by accident.
- The reload was load-bearing, not incidental: `dpr` was read inside a
  `useMemo` with deps `[payload, model, fontsReady]` and nothing listened for
  ratio changes, so zooming alone recomposed nothing. Only a reload
  re-evaluated the ratio.

## What was done

- The source rect is the whole offscreen in device pixels
  (`0, 0, poster.width, poster.height`); the destination stays logical.
- `dpr` is component state fed by a self-resubscribing
  `matchMedia((resolution: …dppx))` listener, and the composition depends on it
  — so a browser-zoom change re-renders the map instead of breaking it until
  the next reload.

## What is pinned now

`site/e2e/dpr-blit.spec.ts` runs the viewer in a `deviceScaleFactor: 2`
context and reads the canvas backing store directly (never a screenshot, so no
tooltip or caret can move the number):

- the store is the logical poster times the ratio;
- the caption band carries text — thousands of light pixels, versus ~900 for
  the cropped render's magnified sky rows (measured on the old code:
  `light 905/192000`, threshold 1000).

The 1x control passed on the old code and still passes; the 2x case fails on
the old code and passes on the new. The one path still untested is a *live*
ratio change mid-session (Playwright cannot alter `deviceScaleFactor` without
a new context), so the listener branch is covered by construction, not by a
journey.
