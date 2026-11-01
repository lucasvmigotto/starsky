# Tasks — 019 constellation tooltip

- [x] T001 Content builder (pure, `site/src/lib/explorer/`): figure members → `{ name, count, named: string[] (≤3, by magnitude), rest }`; unit tests.
- [x] T002 Tooltip: generalise the hover rest machine to star or constellation targets (star wins), render the constellation variant in `ExplorerTooltip`, anchored at the pointer; unit + component tests.
- [x] T003 Inspector "Stars in the figure" list: brightest first, name or HIP, magnitude, below-horizon text marker, button selects the star; scroll within the panel; component tests.
- [x] T004 Copy: en-US + pt-BR keys, ux-vision tables, `check_i18n_keys.py`.
- [x] T005 e2e (page.clock): rest delay, star precedence, Escape, list selection, touch, axe, pt-BR, no-scroll layouts; full suite green.
- [x] T006 Docs: docs site Explorer page (en, pt), spec status Implemented, `specs/README.md` row.
