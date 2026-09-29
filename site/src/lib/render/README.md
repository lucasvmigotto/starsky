# Browser poster renderer (`site/src/lib/render/`)

The browser is the **only** renderer (ADR-0003; the Python renderer was removed
by BCR-0005). `site/render-spec.json` is its normative contract — colours, star
sizing, glow, lines, labels, ring, caption, and the unit rules
(`units.referenceDpi`).

`SkyCanvas` composes the poster **once** into an offscreen canvas and blits it;
zoom/pan transforms the blit and hover draws a focus overlay on top, so neither
recomposes the sky. There is no second renderer and no `?renderer` flag.

## Tests

| Suite | Covers |
|---|---|
| `poster.test.ts` | geometry, star/point sizing, masks, labels, SVG structure |
| `export.test.ts` | the three exports, self-containment, caption, escaping |
| `boundaries.test.ts` | empty sky, maximum density, fisheye bounds |
| `reference.test.ts` | **regression**: the render matrix, structure + pixels |

### Reference-image suite (`reference.test.ts`)

Renders `specs/007-renderer-export/fixtures/render-matrix.json` and, per case:

- asserts **exact** star / segment / figure counts and the caption string
  (the primary guard — a silent count change is the bug this exists to catch);
- compares the PNG against `__references__/` on two bars: **changed-fraction**
  (pixels differing by more than 2, budget 1 %) and **mean absolute difference**
  (budget 6/255).

Both bars exist for a measured reason: a mean over the whole image dilutes a
change confined to thin features. Quadrupling the ring width moved 20 356 pixels
(5.4 %) but only pushed `meanAbs` from 0 to 7.97, so the mean alone would have
let a visibly different poster through. The changed-fraction bar catches it
(verified: doubling *and* quadrupling the ring width both fail).

Regenerate after reviewing every diff:

```bash
STARPY_UPDATE_REFERENCE=1 bun test src/lib/render/reference.test.ts
```

**What it does not cover.** It runs on `@napi-rs/canvas`, not Chrome or Firefox,
so it cannot see browser rasterisation, font fallback, or whether a download
happens. Those belong to the Playwright journeys (`site/e2e/`). A green run here
means the renderer is unchanged — not that the site works in a browser.

## Geometry notes

- matplotlib drew `scatter(s = size**2)` with a marker `size` **points** across,
  i.e. `size × referenceDpi / 72` px (verified empirically: size 0.6→1 px,
  5.57→11 px, 14.0→29 px). `REFERENCE_DPI` captures this; the Python renderer is
  gone but the geometry it defined is the poster's geometry.
- The sky axes span `[-1.06, 1.06]` (`AXIS_EXTENT`).
- Figure centroids are stored in **preview** pixels (the 800×1000 model), so
  callers pass the preview geometry (400/400/368), not poster pixels.
- `shape: "circle"` applies a circular alpha mask (`destination-in`) to the sky
  only; the caption band stays opaque.
