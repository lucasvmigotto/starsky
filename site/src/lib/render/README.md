# Browser poster renderer (`site/src/lib/render/`)

Slice 3 of the static-first refactor (`docs/product/refactor.md`). The browser
renders the poster; the Python CLI (`src/starpy/render/`) remains the offline
and parity-reference implementation. `site/render-spec.json` is the shared,
normative contract (ADR-0003).

## Parity status (2026-09-29, after the Slice-3 fixes)

Harness: `site/scripts/parity.ts` renders `specs/007-renderer-export/fixtures/parity.json`
and compares against CLI PNGs from `scripts/render_parity_fixtures.py`.
Measurements on `nyc-newyear-circle` (320 px):

| Aspect | CLI | Browser | State |
|---|---|---|---|
| star core area | 3203 px | 3412 px | close |
| star blobs | 130 | 119 | close |
| label (rose) area | 1717 px | 5428 px | **3× too heavy** |
| canvas size | 320×390 | 320×390 | exact |
| caption strings | identical | identical | exact |
| `meanAbs` (matrix) | — | 18.0–24.8 | tolerance 25 |

**Fixed during Slice 3** (each caught by the harness, not by eye):

1. star markers were drawn `size` pixels instead of `size` **points**
   (`size * 150/72` px) — the field rendered card-sized discs;
2. `shape: "circle"` had no circular alpha mask, so the corners were opaque;
3. constellation labels used the star colour instead of the line colour;
4. figure/label membership used decluttered stars instead of all visible ones
   (`render/figure.py` computes them pre-declutter);
5. every point size (labels, ring, caption, single-line caption) was scaled by
   canvas ratio `sizePx/800` instead of DPI — labels drew at 2.8 px where the
   CLI drew ~14.6 px. The shared contract now states the unit explicitly
   (`render-spec.json` `units.referenceDpi`).

**Still open — blocking the default flip (refactor Slice 5):**

- label weight/opacity: the browser's glyphs are ~3× the CLI's ink. Likely the
  bundled variable font's default weight (300) versus matplotlib's choice;
  needs an explicit `font-variation-settings`/weight to match.
- the single-line caption's detail string runs past the right edge at small
  sizes where the CLI's larger type wraps within the band.
- `channel_mean_abs: 25` is the **measured** gap, not a standard of quality;
  passing it is not evidence of visual parity.

Until those are resolved, `?renderer=poster` is an opt-in flag only and
`refactor.md` Slice 5 must not flip the default.

## Geometry notes

- matplotlib draws `scatter(s = size**2)` with a marker `size` points across,
  i.e. `size * 150/72` px at the CLI's DPI 150 (verified empirically: size
  0.6→1 px, 5.57→11 px, 14.0→29 px). `REFERENCE_DPI` captures this.
- The sky axes span `[-1.06, 1.06]` (`AXIS_EXTENT`), matching `ax.set_xlim`.
- Figure centroids are stored in **preview** pixels (the 800×1000 model), so
  callers pass the preview geometry (400/400/368), not poster pixels.
- `shape: "circle"` applies a circular alpha mask (`destination-in`) to the
  sky only; the caption band stays opaque, matching `figure_to_pil`.

