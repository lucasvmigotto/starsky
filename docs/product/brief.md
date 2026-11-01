Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0.
Refreshed by project:init on 2026-10-04 to the static-first reality (BCR-0001–BCR-0009, ADRs 0001–0005); see Decision log.
Refreshed on 2026-11-01 at the owner's request to the product as built after BCR-0011 (features 009–016); see Decision log.

# starsky — brief

Status: Draft

## Problem

People want to see the night sky of a place and moment that matters to them ("our night"), explore it, and keep it as a personalized poster, without proprietary SaaS or manual planetarium work. What they make must be exactly shareable: the same link shows the same sky to everyone. The poster must be keepable as a print-grade file.

## What the product does (observed)

starsky is a static, client-only night-sky explorer and poster studio. The browser is the sole renderer (BCR-0005). Python is a build-time data CLI. There is no server, no accounts and no backend. [OBSERVED: src/starsky/cli.py; docs/product/adr/0001-static-first-no-server.md]

- **Landing (013).** "Where do you want to explore the sky from?" The visitor searches for a place (Nominatim, on explicit submit or on leaving the field, never as you type: #65), or switches to coordinates. An always-visible OpenStreetMap map shows the place and accepts a click or a dragged pin. They add an optional title, a date, time and timezone, and a limiting magnitude under Advanced. The one action, **Explore this sky**, opens the Explorer. The form is mirrored to a `#c=` link in the address bar. [OBSERVED: site/src/components/LandingPage.tsx; site/src/lib/landing/]
- **Explorer (009–011, 014; BCR-0011, the primary experience).** A navigable sky at `#e=`, Canvas 2D:
  - Drag to look around, zoom between 5 and 120°, and reset with a glide.
  - Star tooltips, an inspector, search, layers (lines, labels, horizon, cardinal points, grid, below-horizon hidden or dimmed) and a constellation list grouped by the horizon.
  - The controls collapse after 4 s idle.
  - Objects below the horizon are never presented as observable.

  [OBSERVED: site/src/lib/explorer/; site/src/lib/sky/]
- **Poster Studio (012, 015, 016).** At `#studio=`: projection, shape (square fills the square, BCR-0014), fisheye strength, minimum separation, glow and title, with a live preview. It exports PNG, SVG and true-vector PDF in standard or 9:16 story layout (BCR-0012), and copies a `#s=` link. [OBSERVED: site/src/components/studio/StudioPage.tsx; site/src/lib/render/]
- **Poster page (Viewer).** A `#s=` link renders the exact shared poster: the image and its heading only (BCR-0013). It offers share, export, "Explore this sky" and "Make your own". Corrupt, absent and wrong-version links are handled. [OBSERVED: site/src/components/ViewerPage.tsx; site/src/lib/share.ts]
- **Data tool.** `starsky catalog` builds the browser's data from Hipparcos (mag ≤ 6.5 by default, 8,870 stars), Stellarium modern lines (843 segments, 88 figures) and HIP-keyed names (520): `catalog.json`, `constellations.json` and `names.json`. `starsky cache warm` fills the parquet caches. It opens no socket and renders nothing. [OBSERVED: src/starsky/cli.py; specs/002-catalog-cli/contracts/seam.md]
- **Delivery.** A static site on Cloudflare R2, data-tool images on GHCR and Docker Hub, and releases cut by automation. `dev` integrates and promotes to `main`, which deploys. [OBSERVED: .github/workflows/site_r2.yml; docs/product/delivery.md]

## Audiences

Decided with the owner on 2026-09-30 (see docs/product/ux-vision.md). Both audiences are equally likely and get the same quality:

- **P1, the recipient.** Arrives from a link someone sent. Goal: see the sky as shared, explore it, keep it. Uses a phone on mobile data and never returns. Leaves when the link looks broken, the sky is blank, or the page is slow.
- **P2, the giver.** Starts from a place and a moment, explores the sky, then makes and shares a poster. Leaves when controls seem to do nothing.
- **Operator (secondary).** A solo self-hoster running their own instance. Wants cheap static hosting and deterministic data builds.

Flow, owner decision of 2026-11-01: landing → Explorer → export.

## Scope

In scope:
- Landing (place search, map, coordinates, moment, `#c=`).
- Explorer (`#e=`).
- Poster Studio (`#studio=`).
- Poster page (`#s=`).
- PNG, SVG and PDF export in standard and story layouts.
- The CLI data build.
- R2 static delivery with fitness gates.

Out of scope:
- Accounts, payments, a multi-user library and a mobile app (no backend exists to host them).
- WebGL (not in this milestone).
- A light theme (offered and declined, ux-vision D5).
- A server-side render endpoint.
- Place autocomplete (forbidden by the Nominatim policy).

Later: a `pt-BR` catalogue as its own slice (D17).

## Capabilities (observed)

MVP, the primary job end to end (all shipped on `dev`):
1. Choose a place and moment on the landing, with search, a map or coordinates. Reason: the giver's entry point. [OBSERVED: site/src/lib/landing/]
2. Explore the sky honestly: correct orientation, nothing below the horizon presented as visible, figure-based constellations. Reason: the primary experience (BCR-0011). [OBSERVED: site/src/lib/sky/observer.ts; site/src/lib/explorer/visibility.ts]
3. Compose and export a poster from `render-spec.json`, the one render implementation. Reason: keep it. [OBSERVED: site/src/lib/render/]
4. Share by link: four versioned fragments (`#c=`, `#e=`, `#studio=`, `#s=`), with `#s=` byte-compatible forever. Reason: the link is the primary artifact. [OBSERVED: docs/product/domain-model.md, Links context]
5. CLI data build and warm cache. Reason: the browser's only data dependency. [OBSERVED: src/starsky/cli.py]
6. R2 deploy plus fitness gates (budgets, no secrets, no server, i18n agreement, conformance, reference images, third-party guard). Reason: static hosting that cannot silently regress. [OBSERVED: .github/workflows/site_ci.yml; site/e2e/network-guard.spec.ts]

Next: hardening (#55): accessibility and performance passes, docs, stability re-measure. Then promotion of `dev` to `main`, versioned R2 prefixes and a manifest (008 T003), a post-deploy smoke and rollback drill (008 T018/T021), and the `pt-BR` locale slice.

Later: WebGL renderer, only if Canvas 2D limits are hit (ADR-0007). A keyed geocoder or self-hosted tiles, if OpenStreetMap limits are hit (architecture evolution path).

## Constraints

- **Licenses.** Code is GPL-3.0-only. Hipparcos is public domain. Stellarium lines are CC BY-SA 4.0 (one-way compatible with GPL-3.0, attributed in the footer). Cormorant Garamond (poster) and Inter (interface) are OFL 1.1, bundled. OpenStreetMap data is ODbL, attributed on the map and in the footer. [OBSERVED: THIRD_PARTY_NOTICES.md; site/src/components/SiteFooter.tsx]
- **Toolchain.** Python ≥ 3.14, Bun, TypeScript native (`tsgo`), React 19, Vite 8, Tailwind 4 and Leaflet (lazy, landing only), pinned in `.tool-versions` and `site/package.json`.
- **Code rules.** Python is Click plus Polars only, with no server framework in `src/` (CI-enforced). Components may not use raw hex or inline copy (ESLint design rules), and copy must agree with ux-vision (`check_i18n_keys.py`).
- **Hosting.** R2 free tier. Budgets are 500 KB bundle and 400 KB data, brotli, CI-enforced. Today: 390 KB and 132 KB.
- **Accessibility.** WCAG 2.2 AA: axe suites, computed contrast, 44 px targets and keyboard-only paths, verified, not assumed.
- **Browsers.** Chromium and Firefox, plus a mobile viewport (the e2e matrix). WebKit is untested and not claimed.
- **Compliance.** No regime applies to starsky itself: no backend, no accounts, no stored personal data. Two third parties see the visitor's IP address (Nominatim on search, OSM tiles on the landing map). The landing says so in one line, and nothing is collected by us. Not legal advice.
- **Integrations and their failures:**
  - **Nominatim** (search only on explicit submit or leaving the field; per-session cache; at least 1 s between requests). A failure shows inline, and the map and coordinates still work.
  - **OSM tiles** (visible view only, Referer kept, attribution always visible; ADR-0008). A failure shows in the map box, and search and coordinates still work.
  - **Hipparcos and Stellarium hosts.** CI retries 3 times, then fails the build without deploying.
  - **R2.** A failed deploy leaves the previous build serving, because `index.html` uploads last.

  [OBSERVED: site/src/lib/geocode.ts; site/src/lib/landing/; .github/workflows/]
- **Top risk.** Being blocked by OpenStreetMap. Owner, 2026-11-01: "block is a Bigger no for us". See `architecture.md`, Risks.
- **Team and cost.** Solo; no freeze window; the owner is the sole BCR approver. Target: near-zero static hosting.
- **Privacy.** A link carries its own payload in the URL fragment, which never reaches the starsky host. Place text goes only to Nominatim, from the visitor's browser. No credentials exist for either OpenStreetMap service.

## Metrics

[ASSUMPTION: none defined in the repo. Suggested leading metrics: time to first sky on mobile data, Nominatim failure rate, export success rate. Lagging: shared-link opens, release cadence. Confirm with the owner.]

## Glossary

- Poster — the rendered night-sky image + caption block (PNG raster, SVG/PDF vector). Not: chart, plot. [OBSERVED: site/src/lib/render/poster.ts]
- Place — a location chosen by search (Nominatim), resolved to lat/lon and a name; a dropped pin or typed coordinates leave the place empty. Not: coordinates, search. [OBSERVED: site/src/lib/geocode.ts; site/src/lib/landing/state.ts]
- Coordinates — validated lat [-90,90] / lon [-180,180]; rejected, never clamped, in shared links. [OBSERVED: site/src/lib/share.ts:130-134]
- Viewer — the poster page: renders a `#s=` link as the image and its heading only (BCR-0013), with share, export, explore and "make your own" actions. In the interface: the poster page. [OBSERVED: site/src/components/ViewerPage.tsx]
- Studio — the Poster Studio at `#studio=`: compose appearance and title, then export or copy a `#s=` link; distinct from the Viewer so a draft can never overwrite the canonical artifact. Built (012). [OBSERVED: site/src/components/studio/StudioPage.tsx]
- SharePayload — versioned (`v=1`) flat JSON of lat/lon/place/when/tz/options; canonical-JSON → zlib-9 → base64url-no-pad after `#s=`. [OBSERVED: site/src/lib/share.ts:20-29; site/render-spec.json shareLink]
- RenderOptions — projection, fisheye_strength [0.1,3], min_separation [0,0.05], magnitude_limit [1,7], glow + glow_intensity [0,3], constellations, labels, shape, title; out-of-range shared values are rejected (BCR-0008). In the interface called "Appearance". [OBSERVED: site/src/lib/share.ts:9-18,122-129]
- Projection — `stereographic` | `fisheye`. Not: mercator. [OBSERVED: site/src/lib/share.ts:5]
- Shape — `square` | `circle`. A square poster fills the square, inscribed in the horizon (BCR-0014). [OBSERVED: site/src/lib/share.ts; site/src/lib/render/poster.ts]
- Landing — the location-first front door (013): "Where do you want to explore the sky from?" Place search or coordinates, an always-visible map, title, moment, limiting magnitude; its one action, "Explore this sky", opens the Explorer. Mirrored to `#c=`. [OBSERVED: site/src/components/LandingPage.tsx]
- Figure — one constellation drawing (stars + segments + name). A star belongs to a constellation only through its figure lines. Selectable in the Explorer's list or on the sky. [OBSERVED: site/src/lib/sky/scene.ts]
- Caption — the poster text block: `[Title]` + `coords — place · local tz`, drawn from the same formatter the UI speaks. [OBSERVED: site/src/lib/caption.ts]
- Explorer — the primary surface (BCR-0011): a navigable sky for a place and moment, opened from `#e=`. Not: planetarium app. [added by backend:domain 2026-11-01; site/src/lib/explorer]
- Explorer link — `#e=` fragment: scene (place, moment, title, limiting magnitude) plus durable view (camera, FOV, layers, selection). [site/src/lib/sky/payload.ts]
- Creation link — `#c=` fragment: a pre-filled landing form; tolerant per field. [site/src/lib/landing/creation.ts]
- Studio draft — `#studio=` fragment: the poster being composed; same codec as `#s=`, never overwrites it. The Studio is built (012). [site/src/lib/studio/draft.ts]
- Scene — the place, moment and title shared between Explorer and poster; composition and camera are not shared. [site/src/lib/scene/convert.ts]
- Camera — quaternion camera→world plus field of view (5–120°, default 100) in the equatorial frame (ADR-0006). [site/src/lib/sky/camera.ts]
- Limiting magnitude — faintest star drawn; 1–7 for posters and creation links, wider in `#e=`. Interface label "Limiting magnitude". [site/src/lib/share.ts]
- Below the horizon — altitude ≤ 0; such objects are never presented as observable. [site/src/lib/sky/observer.ts]
- Story format — 1080 × 1920 export layout chosen at export time, never stored in a link (BCR-0012). [site/src/lib/render/format.ts]
- Retired: Observation, Gradio app, Python renderer, HF Space (BCR-0001/0003/0005) — must not reappear in UI, API, or docs copy.

## Open items

- Success metrics are unconfirmed (assumed suggestions above).
- `dev` is not yet promoted to `main` (owner rule: "Do not PR into main yet"), so production still serves an older build and nothing is Verified.
- The R2 deploy token's ListObjects scope (delivery.md, Known gaps).
- `contracts/openapi.yaml` is N/A, re-verified on 2026-11-01: there is no API. The seams are the CLI JSON, `render-spec.json` and the four link fragments.

## Decision log

- 2026-10-04: brief refreshed to the static-first reality (BCR-0001/0002/0003/0005/0006/0007/0008/0009, ADRs 0001–0005). Removed the Gradio app, Python renderer, ephemeris/Skyfield, HF Space and `STARSKY__GEOCODING__USER_AGENT` from every section. Promoted the P1/P2 audiences from assumption to owner-decided (ux-vision 2026-09-30). Tagged capabilities MVP/Next/Later against specs/README.md statuses. Struck the retired glossary terms. Reason: the introspec reconstruction predated the refactor and contradicted the code in every section.
- 2026-11-01: brief refreshed to the product after BCR-0011 to BCR-0014 and features 009–016, at the owner's request ("update brief"):
  - The Explorer is primary.
  - The landing is location-first, with one action.
  - The Studio is built.
  - The poster page is image-only.
  - Square fills the square.
  - Story export.
  - Four link fragments.
  - OpenStreetMap policy compliance is the top risk.
  - The privacy line was added at the owner's request.

  The glossary updates Viewer, Studio, Landing, Place, Shape and Figure in place. The domain-model terms were appended the same day.
