# QA — renderer-export

**Risk: High** (impact High × likelihood High). The poster is the product, the
renderer is the only implementation, and the geometry was wrong five times
during the build. This feature therefore gets negative, boundary and
failure-mode coverage at every layer, plus an exploratory charter.

Constitution: v1.1.0 (one renderer; no cross-renderer parity).

## Traceability

| Story / FR / SC | Layer | Test (or planned) |
|---|---|---|
| US1 render a poster | unit | `poster.test.ts`: geometry, `unitToCanvas`, band, star size |
| US1 tokens come from the spec | conformance | `spec.test.ts` (field-for-field) |
| US1 star size = `size` points | unit | `poster.test.ts` "~29 px at mag −1.44" (matplotlib-verified) |
| US1 point sizes ignore canvas ratio | unit | `poster.test.ts` regression test |
| US1 figures from all visible stars | unit | `skymodel.test.ts` — **gap: assert pre-declutter membership explicitly** |
| US1 declutter keeps brightest | unit | `skymodel.test.ts` |
| US2 PNG export | e2e | click Export PNG → download opens, correct size — **planned** |
| US2 SVG export | unit | `export.test.ts`: valid SVG, texts, self-contained — **exists** |
| US2 PDF is true vector | e2e | open the PDF, select the caption text — **planned** |
| US3 offline reopen | e2e | export with the network disabled, font present — **planned** (fitness fn 6) |
| FR-001 no hard-coded tokens | conformance | `spec.test.ts` |
| FR-003 horizon + declutter | unit | `poster.test.ts`, `skymodel.test.ts` |
| FR-004 caption format | unit | `caption`/`export.test.ts` |
| FR-006 vector PDF | e2e | planned |
| FR-007 no network at render | unit + e2e | offline test; **partially covered** (SVG path only) |
| FR-009 DPI conversion | unit | `poster.test.ts` |
| SC-001 visual references match | visual | reference-image suite — **planned (T024)** |
| SC-002 exports open | e2e | planned |
| SC-004 spec conformance | conformance | `spec.test.ts` |

## Boundary and negative cases (High-risk requirement)

- **Empty sky** (a polar night with no stars above the horizon) → frame and
  caption still render; not a blank canvas.
- **Maximum density** (`magnitude_limit` at its ceiling, ~8870 stars) → renders
  within the time budget, no crash.
- **Minimum separation 0** → declutter is a no-op; every star drawn.
- **Fisheye strength at its bounds** ((0, 3]) → accepted; `≤ 0` rejected before
  rendering.
- **Font unloadable** → the render fails loudly; it must never fall back to a
  serif. **Currently untested in the browser** — and this is the exact failure
  BCR-0004 removed.
- **Font not yet loaded** when the poster renders → the most likely silent-fallback
  bug; needs a test that renders before `document.fonts.ready`.
- **Untitled payload** → single-line caption at the single-line size.
- **Very long title / place** → does not overflow the band.
- **Export at a large size** (higher than default) → still vector for SVG/PDF.

## e2e journeys (Chrome + Firefox)

**J1 — Land, render, export**
1. Open the landing page.
2. Enter coordinates; set a moment and a title; submit.
3. Viewer renders the poster; assert the canvas is non-empty and the title shows.
4. Click **PNG**; assert a download with a non-trivial size.
5. Click **SVG**; assert the file contains `<svg` and the title text.
6. Click **PDF**; assert a PDF opens with selectable caption text.
Expected: all three succeed; status text reports each.

**J2 — Shared link round-trip**
1. Build a payload with the `v1` codec, navigate to `#s=…`.
2. Assert the viewer renders the same moment and place.
3. Corrupt the fragment → `InvalidState`; use an old version → `LegacyState`.

**J3 — Offline export** (pt 1 of the fitness function)
1. Load a shared sky, allow assets to cache.
2. Disable the network.
3. Export SVG; open it; assert the bundled font renders (no serif fallback).

## Exploratory charters

- **C1 — Poster fidelity, 60 min.** Hunt for what a fixed matrix misses: extreme
  latitudes, the equinox/solstice edges, a title with accents and emoji, a place
  name with a comma, `min_separation` extremes. Report anything that renders
  wrong rather than merely different.
- **C2 — Export integrity, 45 min.** Open each format in a different viewer
  (browser, PDF reader, image editor); look for clipped text, missing stars,
  rasterised text in the PDF, and external references.

## Exit criteria

Passing e2e on Chrome and Firefox; axe clean on J1; visual references match; all
three exports open and are self-contained offline; no open High-severity defect.
