# BCR-0002 — The browser becomes the canonical poster renderer (PNG/SVG/PDF)

Status: accepted (2026-09-29)
Owner: you
Date: 2026-09-29
From: `project:refactor`, commit `51287a7`

## Current behavior

- The browser (`site/`) only draws an 800×1000 **preview** canvas and a landing form; it does not produce a poster or export (`site/src/components/SkyCanvas.tsx:68-216`).
- Posters and all exports are produced by Python/matplotlib: `render_sky_map` + `export_image`/`export_vector` (`src/starpy/render/figure.py:259-380`).
- `site/PLAN.md:45-61` explicitly **decided Option C**: generic preview only (stereographic, mag ≤ 5.5, no vector), with a link out to the Gradio app for advanced options.

## Proposed behavior

- Implement a full poster renderer in the client: high-DPI raster (target the CLI's 1600 px / DPI 150 / caption band 0.22), circle/square mask, glow, constellation lines + labels, title/detail caption.
- Export **PNG**, **SVG** (vector DOM), and **PDF** (true vector via `svg2pdf.js` + jsPDF).
- `render-spec.json` is the frozen, normative contract for both renderers.
- The Python CLI renderer is kept in sync and remains the offline/batch path (decision 2026-09-29).
- Letter/Landscape-safe sizing and DPI selection become client options; defaults match today.

## Why

The product's value is a personalized poster; requiring a Python server for the real artifact is the main limitation. This is the refactor's top-ranked goal (new capability).

## Impacts

- Users: poster creation and export move to the browser; no server needed.
- Contract: `render-spec.json` gains normative status; `SPEC` (TS) and the Python constants must conform (a conformance test already exists: `site/src/lib/spec.test.ts`).
- `site/PLAN.md` Option C decision is superseded (record a `[UPERSEDED]`/note; do not silently edit history).
- Features: `specs/006-share-static-viewer` splits into a viewer feature and a new renderer/export feature.

## Data migration

None. The share payload stays version `1` and must remain backward compatible (new option fields only with safe defaults).

## Tests that will prove it

- **Parallel run**: for a fixed set of (place, moment, options), render in the browser and with the CLI; compare raster output within an agreed pixel tolerance and SVG structure; log/quantify differences before switching the default.
- PNG/SVG/PDF exports open and contain the expected caption and star count.
- `render-spec.json` conformance (both sides).
