Reconstructed by project:introspec on 2026-09-29; rewritten by qa:strategy on 2026-09-29 against the static-first target (BCRs 0001–0005, constitution v1.1.0).
Updated 2026-11-01 at the owner's request for features 009–016, the OpenStreetMap policy risk (#65) and the suites that now exist.

# starsky — test strategy

Status: Draft

## What the product is, in testing terms

A static client-only app. The browser is the only renderer: it runs the
Explorer (a navigable sky, `#e=`), the Poster Studio (`#studio=`), the poster
page (`#s=`) and the location-first landing (`#c=`), and produces PNG, SVG and
PDF exports in standard and story layouts. Python is a build-time CLI that
writes three JSON files. No server, no database, no accounts, no personal data (ADR-0001,
BCR-0005). That shape decides most of this strategy:

- **No API contract layer.** The seams are `render-spec.json`, the four link
  fragments and the data JSON, not `openapi.yaml` (N/A, re-verified
  2026-11-01).
- **Two third-party services are in the runtime path**: Nominatim search and
  OSM tiles. Their usage policies are a test target in their own right,
  because breaking them gets the site blocked.
- **No personas or authorization matrix** — there is no identity, no session and
  no data to protect. The skill's persona rule is **N/A with this reason**; the
  nearest equivalent is the "place lookup works / is unavailable" pair.
- **The risky surface is the browser's rendered output**, which unit tests
  cannot see.

## Risk per feature

Impact × likelihood → depth of coverage.

| Feature | Impact | Likelihood | Risk | Why |
|---|---|---|---|---|
| OpenStreetMap policy compliance (013 search and map) | High | Medium | **High (top)** | Owner, 2026-11-01: "block is a Bigger no for us". A block breaks search or the map for every visitor. The landing shipped with search-as-you-type, which the policy bans (#65), so the likelihood is proven, not theoretical |
| 013 location-first | High | Medium | **High** | New front door: search combobox, Leaflet map, coordinate switch, `#c=` tolerant decode, no-scroll layout |
| 012 + 016 poster studio and square fill | High | Medium | **High** | Poster output changed (BCR-0014 square) and a new edit surface; `#s=` must stay byte-compatible |
| 009–011, 014 Explorer | Medium | Medium | **Medium** | Camera math, below-horizon honesty, `#e=` codec, pointer and touch input; Canvas 2D only |
| 015 visual identity | Low | Medium | **Low–Medium** | Layout and copy; covered by identity and no-scroll e2e |
| 007 renderer-export | High | High | **High** | The poster *is* the product; all-new canvas code; geometry was wrong five times during the build; exports are new and unverified in a real browser |
| 006 viewer | Medium | Medium | **Medium** | Share-codec correctness, `#s=` state handling, a third-party place lookup, accessibility |
| 002 catalog-cli | Medium | Medium | **Medium** | The site's only data source — a quietly wrong export breaks every poster |
| 008 site-delivery | Medium | Medium | **Medium** | The release path; budgets and the no-secrets scan are gates |
| 005 data-cache | Low | Low | **Low** | Stable parsers, offline-tested, upstream-controlled |

High risk gets negative, failure-mode and boundary coverage at every layer plus
an exploratory charter. Low risk gets the happy path plus validation.

## Layers, tools and owners

| Layer | Covers | Owner | Tool / location |
|---|---|---|---|
| Unit | Pure functions: projections, declutter, codecs, caption/geometry, parsers | build stages | `bun:test` (`site/src/lib/**/*.test.ts`); `pytest` (`tests/**`) — **exists** |
| Conformance | `render-spec.json` ↔ TS `SPEC`, field for field | build stage | `site/src/lib/spec.test.ts` — **exists** |
| Component | Rendered DOM: export controls, viewer states, landing fields, place search | build stage | **exists**: Testing Library tests next to components (23 files) |
| Integration | Real dependencies: the exported JSON parsed as the client parses it | build stage | **partial** — CI builds the data and asserts shape/counts |
| Visual regression | Rendered poster pixels vs stored references | **QA** | **exists**: `site/src/lib/render/reference.test.ts` (6 references, including story and square) plus SVG hash pins in `standard-pin.test.ts` |
| e2e | Cross-stack journeys in a real browser | **QA** | **exists**: 27 Playwright specs, about 790 tests across chromium, firefox and mobile-chromium |
| Third-party discipline | No unstubbed OSM request; no Nominatim request on typing; repeat search served from cache; tile count per view | **QA** | **exists**: `network-guard.spec.ts`, `landing.spec.ts`; extended by #65 |
| Accessibility | axe on the journeys; keyboard-only export | **QA** | **exists**: `a11y.spec.ts`, `contrast.spec.ts` |
| Performance | Render + export budget on a device class | **QA** | **partial**: `perf.spec.ts` against an assumed 2 s budget, desktop container only |
| Security | SCA/SAST/secret scanning, dependency health | devsecops | outside this strategy; results feed exit criteria |
| Exploratory | Charters on High-risk features | **QA** | **new** — charter in `qa.md` |

**Deliberately not duplicated:** the build stages own unit/component/integration;
QA owns the strategy, visual regression, e2e, a11y, performance and the Verified
status (`qa-quality.md`).

## Test data

All synthetic; no real personal data exists in this product and none may enter a
fixture.

- **Star catalog**: a committed *slice* of the real Hipparcos export is
  acceptable for the visual suite because it is public scientific data, not
  personal. Prefer a small fixed fixture (a few hundred stars) so references are
  small and diffs are readable; the full 8870-star export is a boundary case,
  not the default fixture.
- **Constellation lines**: the committed Stellarium pairs.
- **Share payloads**: built by the test from the `v1` codec; never copied from a
  real URL.
- **Place lookup and map tiles**: intercepted. Every e2e fixture stubs
  Nominatim and the tile host and fails on any request it didn't stub. The
  only real call is the network-gated `j8-live-place-lookup` smoke (one search
  per push to `main`).
- **Links**: `#c=`, `#e=`, `#studio=` and `#s=` fixtures are built by the test
  through the codecs, never copied from a real URL.
- **Reset**: every test builds its own payload/model; no shared mutable fixtures,
  no order dependence.

## Environments

| Environment | Runs | Limits |
|---|---|---|
| Local | unit, conformance, visual, e2e via containers | laptop load numbers are relative only |
| CI (ephemeral) | everything; PR subset below | Windows/macOS not covered |
| Production (R2) | nothing automated beyond a post-deploy smoke | no staging tier exists |

Browsers come from containers, never the host (`browsers.md`): the Playwright
image (`mcr.microsoft.com/playwright`, pinned by digest) for the e2e and visual
suites. Playwright is the project's runner (user decision, 2026-09-29); its
browsers still come from the image, not `playwright install` on the runner.

**Supported browsers: Chrome and Firefox.** WebKit is **untested and not
claimed** — there is no `standalone-webkit` image; adding it is a documented
Playwright-container exception, not a silent gap.

**Mobile viewport:** the `mobile-chromium` project runs the same journeys at a
Pixel 7 viewport, Chromium-only (the default matrix in `qa:e2e`). CI runs the
fast project on PRs and the full three-project matrix on `main`.

**Stability, measured 2026-09-30:** the suite (then 30 tests) was run with
`--repeat-each=10`: **300 passes, 0 failures, no flake**. It has grown to about
790 tests since, and that measurement is stale. On 2026-11-01 one flaky
failure was seen (`explorer-motion.spec.ts`, reset glide, passed on retry).
Re-measuring with `--repeat-each` is a hardening task (#55) and a precondition
for Verified.

## Gates per pipeline stage

| Stage | Must pass | Rationale |
|---|---|---|
| **PR** | lint, `tsgo` typecheck, Python tests, unit, conformance, reference images, i18n/ux-vision agreement, bundle/data budgets, no-secrets scan; **plus** chromium e2e (including the third-party guard) when `site/**` changed | keeps PR feedback fast; no OSM request can merge unnoticed |
| **main** | all of the PR set + full Chrome **and** Firefox matrix + visual regression + a11y (zero axe violations) | the release gate |
| **Scheduled** | dependency/security scan, reference-refresh check | catches upstream drift |
| **main (live)** | `j8-live-place-lookup`: one real Nominatim search | early signal that the service still answers us |
| **Post-deploy** | smoke: the deployed URL renders a shared sky and exports a PNG | the release actually works |

Thresholds: zero axe violations on the journeys; bundle ≤ 500 KB brotli
(excluding font); data ≤ 400 KB brotli; poster render + export within the
device budget (see `007-renderer-export/qa.md`).

## Exit criteria for Verified

A feature is `Verified` when, on `main`:

1. its e2e journeys pass in CI on **Chrome and Firefox**;
2. its accessibility checks pass (no serious/critical axe violations, keyboard
   path works);
3. its visual references match, or every difference is explained and re-approved;
4. no High-severity defect is open against it;
5. for 007 additionally: PNG/SVG/PDF open and are self-contained offline;
6. for 013 additionally: the third-party guard passes (no request on typing,
   cache hit on repeat, fewer than 40 tiles per view, attribution and privacy
   line visible).

**Nothing is Verified today.** Features 009–016 are Implemented on `dev`.
Verified requires their journeys green on `main`, and `dev` has not been
promoted to `main` (owner rule: "Do not PR into main yet").

## Flaky-test policy

- Detection: CI rerun history; a test that fails then passes without a change is
  flaky by definition.
- Quarantine with an owner and a deadline; a quarantined test is excluded from
  the gate and tracked, never silently retried to green.
- No `sleep()` for synchronisation — wait on a condition; Playwright's
  auto-waiting is the default.
- Failures upload artifacts: trace, screenshot, console log.

## Metrics

Escaped defects (found after `main`, not by the suite); flake rate per suite;
suite durations (PR budget vs main); and mutation score on the renderer's pure
modules once the visual suite is stable. **Raw coverage is not a target.**

## Open gaps this strategy names

- The performance budget is still an `[ASSUMPTION]` (≤ 2 s on a mid-range
  phone), measured only on desktop containers.
- WebKit, real touch devices and pinch, and real screen readers are untested.
- The e2e stability measurement is stale (see Environments).
- No alert exists if OpenStreetMap blocks the site; the live smoke on `main`
  is the only signal.
