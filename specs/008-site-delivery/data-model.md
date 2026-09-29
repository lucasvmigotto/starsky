# Data model: site-delivery

Status: Draft.

- **BuildArtifact** — `dist/` (hashed JS/CSS/HTML), `data/{catalog,constellations}.json`,
  bundled font. No runtime entities.
- **DataManifest** — `{ version, files: { name, sha256 } }`, written next to the
  data prefix so the client can cache-bust.
- **Budget** — `bundle ≤ 500 KB brotli (excluding font)`, `data ≤ 400 KB brotli`;
  measured in CI (`scripts/check_bundle_budget.sh`).
- **FitnessFunction** — named CI check: `no_server`, `contract_conformance`,
  `bundle_budget`, `no_secrets`, `offline_render`.

No tables, collections, migrations or personal data (ADR-0001/0002).
