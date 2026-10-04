Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0.
Refreshed by project:init on 2026-10-04 to the static-first reality (BCR-0001–BCR-0009, ADRs 0001–0005); see Decision log.

# starsky — brief

Status: Draft

## Problem

People want a personalized night-sky poster for a place and moment ("our night") without proprietary SaaS or manual planetarium work. The poster must be exactly shareable — the same link renders the same sky for everyone — and keepable as a print-grade file.

## What the product does (observed)

starsky is a static, client-only night-sky poster studio. The browser is the product's sole renderer (BCR-0005); Python is a build-time data CLI. No server, no accounts, no backend. [OBSERVED: src/starsky/cli.py:1-6; docs/product/bcr/0005-remove-python-renderer.md; docs/product/adr/0001-static-first-no-server.md]

- Landing: pick coordinates or a free-text place (browser Nominatim lookup), a date/time/timezone, and appearance options → the poster renders live. [OBSERVED: site/src/components/LandingPage.tsx; site/src/lib/geocode.ts]
- Viewer: a `#s=` link (canonical JSON → zlib-9 → URL-safe base64, payload v1) renders the exact shared sky — map, constellation figures, caption — with pan/zoom/keyboard navigation and a figure list. [OBSERVED: site/src/components/ViewerPage.tsx; site/src/lib/share.ts:72-105; site/render-spec.json shareLink]
- Keep it: one export surface offers PNG, SVG and true-vector PDF with the poster typeface embedded; failures name the format and leave the map untouched. [OBSERVED: site/src/components/ExportControls.tsx:58-160; site/src/lib/render/export.ts]
- Share it: copy-link yields the canonical `#s=` artifact; "Make your own from this sky" seeds a new draft. A separate `#studio=` build-and-tune surface is planned, not built. [OBSERVED: site/src/i18n/en-US.ts:81; specs/006-viewer/tasks.md:81-108]
- Data tool: `starsky catalog` (Hipparcos mag ≤ 6.5 default + Stellarium lines → `catalog.json`/`constellations.json`) and `starsky cache warm` (parquet caches). It opens no socket and renders nothing. [OBSERVED: src/starsky/cli.py:26-101]
- Delivery: static site on Cloudflare R2 under the docs-hub prefix; CLI data-tool images on GHCR/Docker Hub; releases cut by automation. [OBSERVED: .github/workflows/site_r2.yml:199-235; docs/product/delivery.md:7-17]

## Audiences

Decided with the owner 2026-09-30 (see docs/product/ux-vision.md:52-60); both are equally likely and get the same quality:

- **P1 — the recipient.** Arrives from a link someone sent. Goal: see the map as shared, keep it. Phone, mobile data, never returns. Leaves when the link looks broken, the poster is blank, or the page is slow.
- **P2 — the giver.** Builds a keepsake for a place and date. Goal: get the moment right, adjust until it looks right, share it, keep the file. Leaves when controls seem to do nothing.
- **Operator (secondary).** Solo self-hoster running their own instance; wants cheap static hosting and deterministic data builds.

Priority order: read the map first, then explore and tune, then share, then export.

## Scope

In scope: browser Landing + Viewer, `#s=` share codec, PNG/SVG/PDF export, CLI data build (`catalog`, `cache warm`), R2 static delivery with fitness gates.

Out of scope: accounts, payments, multi-user library, mobile app (none observed; no backend exists to host them). No light theme (offered and declined, ux-vision D5). `pt-BR` catalogue ships as its own later slice (D17). No server-side render endpoint for v1 (rejected; revisit only on funded-backend triggers in site/PLAN.md).

## Capabilities (observed)

MVP — the primary job end to end (all shipped):
1. Render the poster in-browser from `render-spec.json` (stereographic/fisheye, declutter, glow, masks, caption). Reason: the map is the product. [OBSERVED: site/src/lib/render/poster.ts; site/src/lib/spec.ts]
2. Open a shared sky from `#s=` with corrupt/absent/wrong-version handling. Reason: the link is the primary artifact. [OBSERVED: site/src/lib/share.ts:72-105]
3. Build a moment on the Landing (coordinates | place lookup, date/time/tz, appearance). Reason: P2's entry point. [OBSERVED: site/src/components/LandingPage.tsx]
4. Export PNG/SVG/PDF + copy link. Reason: keep and share. [OBSERVED: site/src/components/ExportControls.tsx]
5. CLI data build + warm cache. Reason: the browser's data dependency. [OBSERVED: src/starsky/cli.py:26-101]
6. R2 deploy + fitness gates (budgets, no-secrets, no-server, i18n agreement, conformance). Reason: static hosting that cannot silently regress. [OBSERVED: .github/workflows/site_ci.yml:76-105]

Next: Studio `#studio=` build-and-tune surface with `#studio=`→`#s=` share re-encode (specs/006-viewer FT001–FT016); versioned R2 prefixes + manifest (specs/008-site-delivery T003); post-deploy smoke + rollback drill (008 T018/T021); `pt-BR` locale slice.

Later: reference-image regeneration inside the tools image (deferred by finding-reference-drift.md decision); server render endpoint only if revisit triggers fire.

## Constraints

- Licenses: code GPL-3.0-only; Hipparcos public domain; Stellarium lines CC BY-SA 4.0 (one-way compatible to GPL-3.0, attributed in-app); Cormorant Garamond OFL 1.1, bundled. [OBSERVED: pyproject.toml:7; THIRD_PARTY_NOTICES.md:3-41]
- Toolchain: Python >= 3.14, Bun 1.4.2, TypeScript native (`tsgo`), React 19, Vite 6, Tailwind 4 — pinned in `.tool-versions`. [OBSERVED: pyproject.toml:6; .tool-versions]
- Python is Click + Polars only; no server framework in `src/` (CI-enforced `scripts/check_no_server.py`). No raw-hex or inline-copy in components (ESLint design rules). [OBSERVED: scripts/check_no_server.py]
- Hosting: R2 free tier + docs-hub prefix `/starsky/`; budgets 500 KB bundle / 400 KB data brotli (CI-enforced). [OBSERVED: site/scripts/check_bundle_budget.sh; vite.config.ts:14]
- Accessibility: WCAG 2.2 AA — axe suites + computed-contrast checks + 44px targets + keyboard-only paths (verified, not assumed). [OBSERVED: site/e2e/a11y.spec.ts; site/e2e/contrast.spec.ts; specs/000-design-system/tasks.md:71-77]
- Browsers: Chromium + Firefox (the e2e matrix); mobile widths via responsive single-column + horizontal figure scroller. [OBSERVED: .github/workflows/site_e2e.yml; docs/product/ux-vision.md:493-505]
- Compliance: N/A — no regime applies. No backend, no accounts, no stored personal data; the only outbound call is the visitor's own place lookup. No SLOs defined (static host; unknown).
- Integrations and their failures: Nominatim (place lookup fails inline, no navigation, map unchanged); Hipparcos/Stellarium source hosts (CI retries `cache warm` + `catalog` 3×, then fails the build without deploying — no partial site); R2 (failed deploy leaves the previous build serving; entry `index.html` uploads last). [OBSERVED: site/src/lib/geocode.ts; .github/workflows/site_ci.yml:49-59; .github/workflows/site_r2.yml]
- Team: solo; no freeze window; owner is sole BCR approver. Cost target: near-zero static hosting.
- Privacy: no backend, no accounts, no stored personal data — a share link carries its own payload in the URL. Place lookup is a client-side Nominatim fetch (Referer-identified, ~1 req/s); no credentials exist for it. [OBSERVED: docs/product/delivery.md:109-122]

## Metrics

[ASSUMPTION: none defined in repo. Suggest leading: time-to-first-poster on mobile data, Nominatim failure rate, export success rate; lagging: shared-link opens, release cadence. Confirm with owner.]

## Glossary

- Poster — the rendered night-sky image + caption block (PNG raster, SVG/PDF vector). Not: chart, plot. [OBSERVED: site/src/lib/render/poster.ts]
- Place — free-text location resolved via Nominatim to lat/lon + names. Not: coordinates, search. [OBSERVED: site/src/lib/geocode.ts]
- Coordinates — validated lat [-90,90] / lon [-180,180]; rejected, never clamped, in shared links. [OBSERVED: site/src/lib/share.ts:130-134]
- Viewer — the surface that renders a `#s=` link. The product's resting state. [OBSERVED: site/src/components/ViewerPage.tsx]
- Studio — the planned build-and-tune surface at `#studio=`; distinct from the Viewer so a draft can never overwrite the canonical artifact. Not built yet. [OBSERVED: docs/product/ux-vision.md:163-171]
- SharePayload — versioned (`v=1`) flat JSON of lat/lon/place/when/tz/options; canonical-JSON → zlib-9 → base64url-no-pad after `#s=`. [OBSERVED: site/src/lib/share.ts:20-29; site/render-spec.json shareLink]
- RenderOptions — projection, fisheye_strength [0.1,3], min_separation [0,0.05], magnitude_limit [1,7], glow + glow_intensity [0,3], constellations, labels, shape, title; out-of-range shared values are rejected (BCR-0008). In the interface called "Appearance". [OBSERVED: site/src/lib/share.ts:9-18,122-129]
- Projection — `stereographic` | `fisheye`. Not: mercator. [OBSERVED: site/src/lib/share.ts:5]
- Shape — `circle` | `square`. [OBSERVED: site/src/lib/share.ts:6]
- Landing — the choice surface (open a shared sky | map a moment); owns no sky state itself. [OBSERVED: site/src/components/LandingPage.tsx; site/src/App.tsx:18-30]
- Figure — one constellation drawing (stars + segments + name); selectable via the figure list or canvas hover. [OBSERVED: site/src/lib/skymodel.ts]
- Caption — the poster text block: `[Title]` + `coords — place · local tz`, drawn from the same formatter the UI speaks. [OBSERVED: site/src/lib/caption.ts]
- Retired: Observation, Gradio app, Python renderer, HF Space (BCR-0001/0003/0005) — must not reappear in UI, API, or docs copy.

## Open items

- Success metrics unconfirmed (assumed suggestions above).
- R2 deploy token lacks ListObjects scope — `Site to R2` deploy fails; product serves the 2026-09-18 build until fixed (infra, not scope).
- `contracts/openapi.yaml` is N/A — no API exists (CLI flags + `#s=` codec are the seams).

## Decision log

- 2026-10-04: brief refreshed to static-first reality (BCR-0001/0002/0003/0005/0006/0007/0008/0009, ADRs 0001–0005). Removed Gradio app, Python renderer, ephemeris/Skyfield, HF Space, `STARSKY__GEOCODING__USER_AGENT` from every section; promoted P1/P2 audiences from assumption to owner-decided (ux-vision 2026-09-30); tagged capabilities MVP/Next/Later against specs/README.md statuses; retired glossary terms struck. Reason: introspec reconstruction predated the refactor and contradicted the code in every section.
