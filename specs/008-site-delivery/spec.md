# Feature Specification: site-delivery

**Feature Branch**: `feat/site-delivery`

**Created**: 2026-09-29

**Status**: Draft

**Input**: BCR-0003 and BCR-0004 (accepted), ADR-0002 (R2-only hosting), ADR-0004 (resilience/observability), ADR-0005 (stack).

## User Scenarios & Testing

### User Story 1 - Deploy the site to R2 from CI (Priority: P1)

A push to `main` builds the client, exports the data, and syncs both to
Cloudflare R2 under immutable hashed asset paths and a versioned data prefix.
The site serves the full workflow with no origin compute.

**Independent Test**: after a push, the deployed URL renders a shared sky and
exports a poster; assets carry long-lived cache headers.

**Acceptance Scenarios**:

1. **Given** a merged change, **When** CI runs, **Then** a new asset prefix is
   deployed and the data prefix is updated with a manifest.
2. **Given** a broken build, **When** CI fails, **Then** the previous prefix
   keeps serving (no partial deploy).
3. **Given** a need to roll back, **When** the previous prefix is re-pointed,
   **Then** the site serves the older version within minutes.

### User Story 2 - Bundle the font and assets (Priority: P1)

The poster font and all first-party assets ship inside the bundle; the app
makes no font or asset request to a third party.

**Independent Test**: load the deployed site with a network log; no third-party
asset request except an optional place lookup; export an SVG offline and see
the bundled font.

**Acceptance Scenarios**:

1. **Given** a built bundle, **When** inspected, **Then** the font is present
   and referenced locally.
2. **Given** the font missing from a build, **When** the app loads, **Then** it
   fails loudly (constitution III), never falling back silently.

### User Story 3 - Keep budgets and fitness functions honest (Priority: P2)

CI enforces the architecture fitness functions: no server imports, contract
conformance, bundle/data budgets, no secrets in the bundle, offline render.

**Independent Test**: deliberately exceed a budget or add a `gradio` import on
a scratch branch; CI fails.

**Acceptance Scenarios**:

1. **Given** a `dist/` over budget, **When** CI runs, **Then** it fails with
   the measured size.
2. **Given** a secret-like string in the bundle, **When** CI runs, **Then** it
   fails.
3. **Given** a Python module importing `gradio`, **When** CI runs, **Then** it
   fails.

### Edge Cases

- R2 credentials missing → the deploy job fails before touching the bucket.
- The data export (Python) fails (JPL/Nominatim host flake) → retry, then fail
  without deploying a half site.
- Free-tier operation count approaching its ceiling → an alarm fires (ADR-0004).

## Requirements

### Functional Requirements

- **FR-001**: CI MUST build the client with Bun/Vite and MUST export the data
  with the Python CLI before deploying.
- **FR-002**: Assets MUST use content-hashed immutable paths with long
  `Cache-Control`; data MUST use a versioned prefix with a manifest.
- **FR-003**: The font MUST be bundled; a build without it MUST fail.
- **FR-004**: CI MUST enforce the fitness functions: no-server, conformance,
  bundle/data budgets, no-secrets, offline render. [ADR-0001 — fitness functions]
- **FR-005**: Deploys MUST be atomic per prefix and roll back by re-pointing.
- **FR-006**: The HF Space and its workflow MUST be removed; R2 is the only
  host. [BCR-0003]
- **FR-007**: The client MUST meet WCAG 2.2 AA and work offline after first
  load.

### Key Entities

- **BuildArtifact**: hashed assets, `index.html`, data JSON, font.
- **DataManifest**: version + hashes of `catalog.json` and `constellations.json`.
- **Budget**: bundle (≤ 500 KB brotli excluding font) and data (≤ 400 KB brotli).

## Success Criteria

### Measurable Outcomes

- **SC-001**: A merge to `main` deploys and serves the full workflow
  automatically, with no manual step.
- **SC-002**: A rollback restores the previous version within 5 minutes.
- **SC-003**: All five fitness functions fail CI when violated.
- **SC-004**: No third-party asset request occurs during a normal page load
  (place lookup is the only permitted outbound call, and only on demand).

## Assumptions

- [ASSUMPTION] R2 bucket and Cloudflare CDN already exist (used by
  `site_r2.yml` today); no new infrastructure beyond them.
- [ASSUMPTION] Bundle budgets are initial; they may be tuned once the real
  bundle is measured, and the change is recorded.
