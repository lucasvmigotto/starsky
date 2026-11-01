# 017 — Hardening and docs

Feature: `017-hardening` | Status: In progress | Depends: 009–016 | Issue: #55

## Why

This is the last step of the approved plan, after 009–016 landed on `dev`. Its goal is to make the Explorer-first product dependable and documented before `dev` is promoted to `main`.

## User stories

- **US1 (P1) Accessibility.** A keyboard or screen-reader visitor can complete each journey: landing → Explore, Explorer navigation and selection, Studio → export, and poster page → export. Each must show no serious or critical axe violations.
- **US2 (P1) Failure honesty.** Every external or async dependency fails visibly and recoverably:
  - sky data;
  - fonts;
  - the Leaflet chunk;
  - tiles;
  - Nominatim errors and timeouts;
  - blocked storage;
  - a bad `#c=`, `#e=`, `#studio=` or `#s=`.

  The page must never blank.
- **US3 (P1) Performance.** The Explorer holds an interactive frame budget while dragging. Poster render and export stay inside the proxy budget. Both are measured in the container, and the numbers are recorded.
- **US4 (P1) Stability.** The e2e suite is re-measured with `--repeat-each`. The known flaky test (`explorer-motion` reset glide) is fixed, not retried to green.
- **US5 (P1) Type strictness.** `site/` enables `noUncheckedIndexedAccess`, as AGENTS.md states, with all 155 errors handled and none asserted away. Behaviour stays unchanged, proved by the reference images and SVG pins.
- **US6 (P1) Docs.** The docs site (en and pt-BR), README, AGENTS.md layout, `llms.txt` and the specs statuses describe the product as built:
  - landing → Explorer → export;
  - the Studio;
  - the four links;
  - OpenStreetMap use and privacy.
- **US7 (P1) Final report.** Estimation error, limits, and what remains for the owner to verify manually: real devices and pinch, a real screen reader, WebKit, and the production deploy and rollback once promoted.

## Out of scope

- WebGL.
- Promotion to `main` (owner rule: "Do not PR into main yet").
- New features.
