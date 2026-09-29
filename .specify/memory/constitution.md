<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections: Core Principles (I–VI), Additional Constraints, Development Workflow
- Removed sections: none
- Follow-up TODOs: none
-->

# starpy Constitution

## Core Principles

### I. Static-First, No Runtime Server

The shipped product MUST be a static artifact: HTML, JS, CSS, JSON and font
served from a CDN. No server process, database, broker or identity provider
runs in production. Python MUST NOT open a network listener at runtime; it is
a build-time and CLI tool only.

Rationale: ADR-0001 — the only server existed for the removed UI; static-first
gives offline use, free-tier cost and CDN-backed availability.

### II. One Normative Render Contract

`site/render-spec.json` is the single source of truth for every visual token
(colours, star sizing, glow, lines, labels, ring, caption band, fonts, share
codec). Both the browser renderer and the Python CLI renderer MUST conform to
it, and each MUST have a conformance test. A change to a token MUST update
both renderers in the same change.

Rationale: ADR-0003 — correctness of the poster is the top driver, and two
implementations drift silently without a normative spec.

### III. Determinism and Correctness

A poster for the same place, moment, options and size MUST be byte-stable
(Python) and structurally identical (browser), and MUST NOT depend on network
availability at render time. The font MUST be bundled; a missing asset is a
hard error, never a silent visual fallback. Caption text and share payloads
MUST conform to their frozen formats (caption grammar; `v1` codec).

Rationale: correctness and offline operation are ranked above latency; a
wrong-looking poster is the worst failure mode.

### IV. Test-First, Evidence-Backed Status

Every user story MUST have an independent test that fails before the work and
passes after. Tests are written first at the layer the risk lives in
(unit for pure functions, conformance for the render contract, parallel-run
for renderer parity, end-to-end for journeys). A feature is `Implemented`
only when its tests pass and `Verified` only when its end-to-end tests pass
in CI.

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
contrast, reduced-motion respected) and MUST work in current evergreen
browsers. It MUST NOT offload poster generation to a third party; the only
permitted outbound call is place lookup to OpenStreetMap Nominatim, from the
browser.

Rationale: the browser is the whole runtime (ADR-0001); accessibility and
privacy are product requirements, and Nominatim is the sole approved external
dependency.

## Additional Constraints

- **Stack**: Bun + React (latest) + TypeScript 7 + Vite + Tailwind for the
  client; Python 3.14 + `uv` + `ruff` + `ty` + `pytest` for the CLI/data tool
  (ADR-0005). `bun:test` is the single JS test runner.
- **Licences**: code is GPL-3.0-only; bundled assets carry their upstream
  licence (Hipparcos and DE421 public domain, Stellarium IAU lines CC BY-SA
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

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
