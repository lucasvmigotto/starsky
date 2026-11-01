# Tasks — 017 hardening

Track A (site tests and code), branch `hardening/site`:
- [x] A1 axe e2e for the landing (map shown, results open, coordinates on), the Explorer (collapsed and expanded, inspector open), the Studio (export and share popovers open) and the poster page. Zero serious or critical violations.
- [x] A2 keyboard journeys: landing → Explore with keyboard only; Explorer keyboard navigation (arrows, zoom keys, Tab through the toolbar, select a constellation from the list); Studio → export PNG with keyboard only.
- [x] A3 failure e2e: data JSON 500 on each page; font load failure; Leaflet chunk 404; Nominatim 500 and timeout; `sessionStorage` and `localStorage` throwing; garbage and oversize (>4096) fragments for each link type. Each shows an alert or status and never a blank page.
- [x] A4 perf: Explorer drag frame-time measurement (p95 over a scripted drag) and a poster render and export budget in `perf.spec.ts`. Record the numbers in the spec's `finding-perf.md`.
- [x] A5 stability: fix the `explorer-motion` reset-glide flake at its root, then run `--repeat-each=3` on all projects. Record the result in `finding-stability.md`.
- [x] A6 enable `noUncheckedIndexedAccess` in `site/tsconfig.json`. Handle every error without `!` or `as` casts used only to silence them. References and SVG pins stay unchanged.
- [x] A7 (found during A5) pin the poster caption and moment line to en-US: the same `#s=` link drew different words per visitor locale. `CAPTION_LOCALE` in `site/src/lib/caption.ts`; pt-BR browser e2e in `j2-share-link.spec.ts`.

Track B (docs), branch `hardening/docs`:
- [x] B1 docs site en and pt-BR: new pages Explorer, Landing and links (`#c=`, `#e=`, `#studio=`, `#s=`) and Studio. Update the overview, viewer (poster page), concepts (glossary), architecture and roadmap. Correct the maturity labels. Generate `llms.txt` and the Markdown.
- [x] B2 README: product description, flow, screenshots path or none, OpenStreetMap policy and privacy, the data CLI unchanged.
- [x] B3 AGENTS.md: layout (lib/sky, explorer, landing, scene, studio), the four fragments, OpenStreetMap rules (no search-as-you-type, no unstubbed requests in tests), and that `noUncheckedIndexedAccess` is true once A6 lands.
- [x] B4 `specs/README.md` statuses and the `ux-vision` sweep for stale lines.

Close-out (me): final report, checkpoint, close #55.
