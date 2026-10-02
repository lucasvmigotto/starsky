<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles:
  - II. "One Normative Render Contract" → "One Renderer, One Contract"
    (BCR-0005 removed the Python renderer; the two-renderer conformance rule
    is void)
  - III. "Determinism and Correctness" (dropped the Python byte-stability
    clause; named the browser matrix; added the no-fallback font rule)
  - IV. "Test-First, Evidence-Backed Status" (replaced "parallel-run for
    renderer parity" with "visual regression"; named the e2e runner)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# starsky Constitution

## Core Principles

### I. Static-First, No Runtime Server

The shipped product MUST be a static artifact: HTML, JS, CSS, JSON and font
served from a CDN. No server process, database, broker or identity provider
runs in production. Python MUST NOT open a network listener at runtime; it is
a build-time and CLI tool only.

Rationale: ADR-0001 — the only server existed for the removed UI; static-first
gives offline use, free-tier cost and CDN-backed availability.

### II. One Renderer, One Contract

The browser is the **only** renderer (ADR-0003, BCR-0005). `site/render-spec.json`
is the single source of truth for every visual token (colours, star sizing,
glow, lines, labels, ring, caption band, fonts, share codec), and the renderer
MUST conform to it, with a conformance test guarding the pairing. A change to a
token is a change to the spec and the renderer together. No second
implementation exists to keep in step.

Rationale: correctness of the poster is the top driver. A second renderer was
pure maintenance cost and drifted (BCR-0005).

### III. Determinism and Correctness

A poster for the same place, moment, options and size MUST render identically
on every run, and MUST NOT depend on network availability at render time. The
font MUST be bundled; a missing or unloadable font is a hard error, never a
silent visual fallback. Caption text and share payloads MUST conform to their
frozen formats (caption grammar; `v1` codec).

Rationale: correctness and offline operation are ranked above latency; a
wrong-looking poster is the worst failure mode.

### IV. Test-First, Evidence-Backed Status

Every user story MUST have an independent test that fails before the work and
passes after. Tests are written first at the layer the risk lives in (unit for
pure functions, conformance for the render contract, visual regression for
rendered output, end-to-end for journeys). A feature is `Implemented` only when
its tests pass and `Verified` only when its end-to-end journeys pass in CI on
the supported browsers (Chrome and Firefox).

Rationale: characterization tests are the safety net of the refactor
(`docs/product/refactor.md`); nothing is claimed Verified without a passing
suite.

### V. Zero-Cost, CDN-Shaped Delivery

Deployment MUST stay within free tiers (R2 + GitHub Actions); the artifact
MUST be originless and cacheable. Immutable assets use hashed paths with long
`Cache-Control`; data uses a versioned prefix. Bundle and data sizes MUST be
budgeted and checked in CI.

Rationale: ADR-0002 — cost is a ranked driver and a public site must absorb
viral spikes without an origin.

### VI. Accessible, Self-Contained Client

The client MUST meet WCAG 2.2 AA (keyboard reachable, visible focus, labels,
contrast, reduced-motion respected) and MUST work in the supported browsers:
**Chrome and Firefox**, current stable, verified by the e2e matrix. WebKit is
untested and MUST NOT be claimed as supported (no `standalone-webkit` image).
It MUST NOT offload poster generation to a third party; the only permitted
outbound call is place lookup to OpenStreetMap Nominatim, from the browser.

Rationale: the browser is the whole runtime (ADR-0001); accessibility and
privacy are product requirements, and Nominatim is the sole approved external
dependency.

## Additional Constraints

- **Stack**: Bun + React (latest) + TypeScript 7 + Vite + Tailwind for the
  client; Python 3.14 + `uv` + `ruff` + `ty` + `pytest` for the CLI/data tool
  (ADR-0005). `bun:test` is the single JS test runner.
- **Licences**: code is GPL-3.0-only; bundled assets carry their upstream
  licence (Hipparcos catalogue public domain, Stellarium IAU lines CC BY-SA
  4.0, Cormorant Garamond OFL 1.1) and attribution MUST be preserved.
- **Secrets**: no secret, token, connection string or personal datum is ever
  committed, bundled, or written into an artifact; CI MUST fail on a
  secret-like string in the built bundle.
- **No personal data at rest**: the product stores nothing about visitors;
  share payloads live only in the URL fragment.

## Development Workflow

- **Versioning** follows `git:workflow`: a branch per context off `dev`,
  Conventional Commits, merge back into `dev`; promotion up the chain needs
  an explicit request.
- **Gates**: a feature is planned (`Planned`) → in build (`In progress`) →
  `Implemented` → `Verified`; only the named stage moves a status forward,
  and any stage moves it back when the claim stops holding. Status changes
  are recorded in `specs/README.md`.
- **Spec Kit**: features live under `specs/NNN-*`; plans carry a Constitution
  Check; `SPECIFY_FEATURE` is exported before any `/speckit-*` step so
  parallel work never crosses features.
- **Change to a principle** requires a minor version bump and a note in this
  file's Sync Impact Report.

## Governance

This constitution supersedes other practices where they conflict. Amendments
are proposed as a pull request that states the version bump and updates the
Sync Impact Report; ratification requires the repository owner's approval.
Every plan MUST include a Constitution Check; violations MUST be justified in
its Complexity Tracking table or the plan is rejected. Compliance is reviewed
at the end of each build stage and by `project:status`.

**Version**: 1.1.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
