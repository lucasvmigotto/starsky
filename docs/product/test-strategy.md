Reconstructed by project:introspec on 2026-09-29; rewritten by qa:strategy on 2026-09-29 against the static-first target (BCRs 0001–0005, constitution v1.1.0).

# starpy — test strategy

Status: Draft

## What the product is, in testing terms

A static client-only app: the browser is the only renderer and produces the
poster plus PNG/SVG/PDF exports. Python is a build-time CLI that writes two JSON
files. No server, no database, no accounts, no personal data (ADR-0001,
BCR-0005). That shape decides most of this strategy:

- **No API contract layer** — `render-spec.json` and the share payload are the
  seams, not `openapi.yaml`.
- **No personas or authorization matrix** — there is no identity, no session and
  no data to protect. The skill's persona rule is **N/A with this reason**; the
  nearest equivalent is the "place lookup works / is unavailable" pair.
- **The risky surface is the browser's rendered output**, which unit tests
  cannot see.

## Risk per feature

Impact × likelihood → depth of coverage.

| Feature | Impact | Likelihood | Risk | Why |
|---|---|---|---|---|
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
| Component | Rendered DOM: export controls, viewer states | build stage | **gap** — the export UI was wired with no click test |
| Integration | Real dependencies: the exported JSON parsed as the client parses it | build stage | **partial** — CI builds the data and asserts shape/counts |
| Visual regression | Rendered poster pixels vs stored references | **QA** | **new** — `refactor.md` T024; replaces the deleted CLI parity harness |
| e2e | Cross-stack journeys in a real browser | **QA** | **new** — `qa:e2e`, Playwright |
| Accessibility | axe on the journeys; keyboard-only export | **QA** | **new** — axe in e2e |
| Performance | Render + export budget on a device class | **QA** | **new** — `qa:load`, budget from `architecture.md` |
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
- **Place lookup**: intercepted — never hit Nominatim from an automated test
  except the explicitly-marked, network-gated smoke.
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

**Stability, measured 2026-09-30:** the suite was run with `--repeat-each=10`
— **300 passes, 0 failures, no flake**. That is the evidence `qa:e2e` requires
before a feature can be marked Verified. Re-run it whenever a journey is added.

## Gates per pipeline stage

| Stage | Must pass | Rationale |
|---|---|---|
| **PR** | lint, `tsgo` typecheck, Python tests, unit, conformance, bundle/data budgets, no-secrets scan; **plus** e2e journeys when `site/**` changed | keeps PR feedback fast |
| **main** | all of the PR set + full Chrome **and** Firefox matrix + visual regression + a11y (zero axe violations) | the release gate |
| **Scheduled** | dependency/security scan, reference-refresh check | catches upstream drift |
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
5. for 007 additionally: PNG/SVG/PDF open and are self-contained offline.

**Nothing is Verified today.** Six features are Implemented or Planned, and no
browser test exists yet.

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

- No browser test exists at all — the export UI is unverified end to end.
- The visual-regression suite is planned (T024), not built.
- The performance budget is an `[ASSUMPTION]` (≤ 2 s on a mid-range phone) with
  no measurement.
- Component tests for `ExportControls` do not exist.
