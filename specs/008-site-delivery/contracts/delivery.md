# site-delivery contract

## Deploy

1. CI builds `dist/` (Vite) and exports `data/*.json` (Python CLI).
2. Assets upload under `/assets/<git-sha>/` with `Cache-Control: public, max-age=31536000, immutable`.
3. Data uploads under `/data/<data-version>/` with a `manifest.json`; the current
   version pointer is a small mutable file with a short TTL.
4. `index.html` uploads last, referencing the new asset prefix — atomic from the
   visitor's view.
5. On failure, nothing after step 1 is uploaded; the previous prefix keeps serving.

## Rollback

Re-run the deploy job pinned to the previous commit's asset prefix, or flip the
version pointer back. Target: within 5 minutes (ADR-0004).

## Cache policy

| Path | Header |
|---|---|
| `/assets/<sha>/*` | `public, max-age=31536000, immutable` |
| `/data/<version>/*` | `public, max-age=31536000, immutable` |
| `/manifest.json` | `public, max-age=300` |
| `/index.html` | `public, max-age=0, must-revalidate` |

## Fitness functions (CI)

| Name | Check | Fails when |
|---|---|---|
| `no_server` | no `gradio`/socket use in Python; `python -m starsky` binds nothing | any listener or Gradio import |
| `contract_conformance` | `render-spec.json` parsed by Python + TS tests | renderer/spec mismatch |
| `bundle_budget` | `scripts/check_bundle_budget.sh` | bundle > 500 KB or data > 400 KB brotli |
| `no_secrets` | scan `dist/` for token/key patterns | any secret-like string |
| `offline_render` | render + export with network disabled | any network call at render time |

## Secrets (names only)

R2 sync reuses the existing names: `CLOUDFLARE_R2_ACCOUNT_ACCESS_KEY`,
`CLOUDFLARE_R2_ACCOUNT_SECRET`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET`.
HF OIDC secrets are removed with the Space (BCR-0003).
