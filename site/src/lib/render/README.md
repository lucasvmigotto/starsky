# Browser poster renderer (`site/src/lib/render/`)

Slice 3 of the static-first refactor (`docs/product/refactor.md`). The browser
renders the poster; the Python CLI (`src/starpy/render/`) remains the offline
and parity-reference implementation. `site/render-spec.json` is the shared,
normative contract (ADR-0003).

## Parity status (2026-09-29, refactor Slice 3)

The harness `site/scripts/parity.ts` renders `specs/007-renderer-export/fixtures/parity.json`
with this code and compares against CLI PNGs from
`scripts/render_parity_fixtures.py`.

**Agreeing:** star field and positions, star light (core area 3208 px vs the
CLI's 3203 px on `nyc-newyear-circle`), constellation lines, circle ring and
circular alpha mask, caption text, bundled font, canvas dimensions.

**Diverging, and blocking the default flip (refactor Slice 5):**

1. constellation labels — the browser draws far fewer (and larger) than the CLI;
2. star rendering weight — the browser's markers read heavier, merging
   neighbouring cores (77 blobs vs the CLI's 130);
3. caption type size relative to the frame.

`channel_mean_abs: 25` in the fixture is the *measured* gap (10.6–19.5), not a
chosen standard; it is not evidence of visual parity. Until items 1–3 are
fixed or explained, `?renderer=poster` is an opt-in flag only.

## Geometry notes

- matplotlib draws `scatter(s = size**2)` with a marker diameter of `size`
  points = `size * 150/72` px at the CLI's DPI 150 (verified empirically:
  size 0.6→1 px, 5.57→11 px, 14.0→29 px). `REFERENCE_DPI` captures this.
- The sky axes span `[-1.06, 1.06]` (`AXIS_EXTENT`), so the unit disc sits
  inside the square with a small margin, matching `ax.set_xlim/ylim`.
- `shape: "circle"` applies a circular alpha mask (`destination-in`) to the
  sky only; the caption band stays opaque, matching `figure_to_pil`.
