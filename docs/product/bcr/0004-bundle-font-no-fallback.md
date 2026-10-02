# BCR-0004 — Bundle the font; remove the silent DejaVu fallback

Status: accepted (2026-09-29)
Owner: you
Date: 2026-09-29
From: `project:refactor`, commit `51287a7`

## Current behavior

- On first run the app downloads Cormorant Garamond from a Google Fonts URL (`src/starpy/data/fonts.py:15-18,27-41`).
- On any `httpx.HTTPError` the download returns `None` and rendering silently falls back to `DejaVu Serif` (`FONT_STACK` in `render/figure.py:50`; `ensure_font` failure path).
- The static client relies on the same font stack (`render-spec.json` `fonts`), so its SVG/PDF export would depend on the visitor having the font.

## Proposed behavior

- Vendor the font file in the repository (e.g. `assets/fonts/CormorantGaramond.woff2` + `.otf`/`ttf`) under OFL 1.1, with the licence alongside.
- Python: `ensure_font` uses the bundled file; a missing/corrupt bundled font is a hard error at startup — never a silent fallback.
- Client: ship the webfont with the app and embed it in SVG/PDF export output, so exports are self-contained and deterministic.
- Keep OFL attribution in `THIRD_PARTY_NOTICES.md`.

## Why

The user wants the poster's typography to be guaranteed; silent fallback makes renders non-reproducible and can ship a wrong-looking poster (confirmed 2026-09-29).

## Impacts

- Users: posters always use the intended font; no first-run font download.
- Determinism: removes one network dependency from the render path; helps PNG/SVG/PDF parity.
- Repo size: a few hundred KB of font binaries; licence file travels with them.

## Data migration

None.

## Tests that will prove it

- `ensure_font` resolves the bundled path without network (a test with network disabled).
- A render test asserts the font family actually used is Cormorant Garamond, not a fallback.
- SVG/PDF export contains an embedded font reference.
