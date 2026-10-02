# Finding — the poster could not be moved: no pan, no zoom, no way to get back

Status: **fixed** — `feat/006-restore-poster-navigation`
Found by: a visitor report on the deployed site, 2026-10-02 — *"the map is frozen
and without navegability"*, then *"Canvas renders, but it zooms in the left
upper corner and there is no zoom/pan"*
Severity: **High** — the primary artifact of the product has no navigation.
Every other surface works; this one was a picture.

## What happens

The poster is composed once into an offscreen canvas and blitted to the visible
one through a single transform. That transform could be changed by exactly two
things: selecting a figure, which animates to scale 2.4 on its centroid, and
resetting, which animates back to home. Nothing else.

There was no wheel listener, no pointer handler, no touch handler, no keyboard
handling on the canvas, and no button. `SkyCanvas` drew the transform and read
`view`; nothing wrote `view` except the two paths above. Hover lit a
constellation up — and because hover was the only interaction, it read as the
whole of the product's behaviour.

The view was also **not in the DOM**: `scale`, `fx`, `fy` are component state.
No test could assert it without a proxy, and the proxy in use could not tell the
view moving from a button appearing.

## Why it was not caught, in the order it happened

**The e2e suite asserted the zoom through a proxy it knew was weak.** 

```ts
// interactive.spec.ts — "selecting a figure zooms the view, and reset returns it"
// Scale is not exposed to the DOM, so assert the observable proxy: the
// component re-renders the canvas on view change without error, and the
// reset control appears then disappears.
```

The comment is honest and the reasoning is still wrong. "The reset control
appears" is satisfied by `setSelected(index)` alone — with no transform
anywhere. The test would have passed with `view` deleted.

**Then the first live probe reported the opposite of the truth.** Against the
deployed site it concluded *"zoom and pan both work"*, on two checks that read
`screenshot(A) !== screenshot(B)` — once around a wheel, once around a drag.

Both were hover. The "before" screenshot was taken *before any pointer had
moved*, so the first `mouse.move` lit a constellation up and every subsequent
comparison differed. The drag check compared two shots that differed only in
which figure was under the cursor.

Two measurements settled it:

| probe | result |
|---|---|
| canvas backing store read directly, pointer parked off the poster first | `drag_canvas_changed: false` |
| drag, then a *separate page load* hovering the same end point | both hash `76e56f03` — **byte-identical** |

The second is the decisive one: a drag ends the canvas in exactly the state a
plain hover would leave it in. The drag contributed nothing. There was never any
panning to detect.

The wheel check was a third false positive, and instructive: it reported
`wheel_canvas_changed: true` while `window.scrollY` stayed `0`, so it was not
scrolling. It was the `fontsReady` re-compose landing inside the measurement
window. **Measuring "did anything change" instead of "did the thing under test
change" is the same defect three times over**, and it is the same lesson the
emoji finding records for the glyph probes — worth pairing the two.

## The second bug, found by the same work

Once the view *could* be zoomed, the focus overlay turned out to be drawn
**outside** the transform it belongs inside (`SkyCanvas.tsx`, after the
`ctx.restore()`). The veil is a disc and the redrawn figure a set of segments,
both positioned in poster coordinates; the blit was drawn inside the transform
and they were not.

At scale 1 the two coincide, so nothing was visibly wrong. Zoomed to 2.4 the
mismatch is obvious in a screenshot taken of the live site:

- the veil covered only the middle of the frame, with a hard arc edge where the
  disc's own clip ended — the rest of the sky undimmed;
- **ANDROMEDA was drawn twice**, the blit and the overlay's redraw offset from
  each other, the label legible as two overlapping words.

So the interaction fix would have *exposed* a rendering bug that the missing
interaction had been hiding. Both are fixed: the overlay is now drawn inside the
same `save`/`translate`/`scale`/`translate` block as the blit.

## What is pinned now

- `site/src/lib/view.test.ts` — the transform's algebra, asserted against a
  `project`/`unproject` pair that mirrors the canvas, so the maths and the
  renderer cannot drift apart. Covers the anchor holding still under zoom, the
  pointer carrying the poster on pan, and the bounds. It caught one real defect
  while being written: `Infinity` fell through the finite-check to the home view
  instead of clamping to the maximum.
- `site/e2e/interactive.spec.ts` → *"navigating the poster"* — and every check is
  chosen to be unable to pass for the wrong reason:
  - **pan is a no-op at home** asserts the two screenshots are **equal**. "Not
    equal" would have been satisfied by the hover confound above.
  - **the wheel** asserts `window.scrollY === 0`. This is the one that catches
    the passive-listener bug on its own: React registers `onWheel` passively at
    the root, where `preventDefault` is ignored, so a correct-looking
    implementation scrolls the page away and appears to do nothing.
  - **the view moved** is read from the fit control's disabled state, which needs
    no pixels at all.
  - **the veil regression** samples canvas luminance at two corners the
    untransformed veil provably misses, hovering the figure **in the panel** so
    the geometry stays exactly as computed.
  - `openViewer` now waits for the reveal animation to land, because a screenshot
    taken mid-flight is offset by the transform it is animating.

The remaining untested path is **pinch**, which Playwright's touch API cannot
express — a two-finger gesture is synthesised in `page.evaluate` to reach the
branch, so it proves the code runs but not that a real pinch feels right.
`touch-action: none` is asserted directly, since on a phone the browser claiming
one-finger vertical drags to scroll would make panning impossible exactly where
it is most wanted.

## The copy is new, and needs sign-off

Five keys were added, and they are the first strings in this feature that no
vision document specified:

| key | copy |
|---|---|
| `viewer.canvasHint` | Night sky map. Drag to move it, scroll to zoom. With the map focused, use the arrow keys to move, plus and minus to zoom, and 0 to show the whole sky. |
| `viewer.viewControls` | View controls |
| `viewer.zoomIn` | Zoom in |
| `viewer.zoomOut` | Zoom out |
| `viewer.resetView` | Show the whole sky |

`viewer.resetView` is deliberately *not* "Reset view": `figures.reset` already
says that, and two identically-labelled controls on one screen is worse than two
different ones that do the same thing.

`docs/product/ux-vision.md` → *Key-screen copy* was updated in the same commit to
keep `scripts/check_i18n_keys.py` green in both directions, so the vision now
records these as decided copy rather than the catalogue contradicting it. They
should still be read as a proposal.
