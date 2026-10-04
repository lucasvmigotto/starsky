# starsky — delivery

Status: Draft

Owner: `devsecops:pipeline` (security section by `devsecops:supply-chain`).

## Pipelines

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push (all branches), PR | Python: ruff, `ty`, pytest, no-server fitness check, and a real `cache warm` + `catalog` build asserting the JSON shape and counts |
| `site_ci.yml` | push/PR touching `site/**` or the render fixtures | Site: lint, `tsgo` typecheck, i18n key agreement, unit/component/reference tests, build, brotli bundle+data budgets, no-secrets scan |
| `site_e2e.yml` | push to `main`/`dev`, PR touching `site/**` | 54 Playwright journeys on **Chromium and Firefox**: J1–J4, a11y, contrast, font integrity, interactive poster, perf |
| `security.yml` | push to `main`/`dev`, all PRs, weekly | dependency review, Trivy (secrets, vulns, config), CodeQL (Python + TS) |
| `site_r2.yml` | push to `main` touching `site/**`, PR, manual | Builds the sky data + site and deploys to the starsky R2 bucket |
| `site_docs.yml` | push to `main` touching `docs/**`, PR, manual | Verifies the docs site and deploys to the docs R2 bucket |
| `ghcr.yml` / `dockerhub.yml` | push to `main` | Publish the CLI data-tool image |
| `release.yml` | manual | Tag from `pyproject.toml`, generate + attest an SBOM, create the Release |

### Gates by stage

| Stage | Blocks on |
|---|---|
| **PR** | failing tests; lint/typecheck; a **secret** found; **critical/high** vulnerability **with a fix available**; denied license; budget breach |
| **main / dev** | the PR set, plus the full browser matrix and a11y/contrast |
| **release** | the above; the SBOM is generated and attested |
| **scheduled (weekly)** | the deep Trivy + CodeQL scan, so drift is caught without a manifest change |

## Supply chain

**SLSA level: build L2** (GitHub-hosted runners, hosted build service, signed
provenance for the SBOM). L3 would need a hardened reusable builder workflow;
not attempted.

### Controls in place

| Control | Where |
|---|---|
| Lockfiles committed and enforced | `uv.lock` (`--frozen`), `site/bun.lock` (`--frozen-lockfile`) |
| Third-party actions pinned by **commit SHA** | every `uses:` in `.github/workflows/` (with the tag as a comment) |
| Pins and dependencies kept current | `.github/dependabot.yml`: uv, bun, github-actions, docker; minor/patch grouped, majors separate |
| SCA / dependency review | `dependency-review-action` on PRs; Trivy `vuln` on push |
| Secret scanning | Trivy `secret` — **blocks** |
| SAST | CodeQL, `security-extended`, Python + JS/TS |
| Config / container scan | Trivy `config` (warn-only: two Dockerfiles, no IaC to scan) |
| SBOM | CycloneDX 1.7 over both lockfiles (`docs/product/sbom.cdx.json`), regenerated and attested on release |
| Provenance | `actions/attest-build-provenance` on the SBOM at release |
| Licenses | `deny-licenses` in the dependency-review job |

### Verified, not assumed

- The **secret scan was tested both ways**: it detects a real AWS key / GitHub
  PAT / Stripe key in planted fixtures, and passes clean on this repo. It
  correctly *ignores* the canonical AWS example key.
- The **dependency scan found a real issue**: jsPDF 3.0.4 carried 2 critical and
  3 high CVEs; upgraded to 4.2.1 and re-scanned to **zero** critical/high with a
  fix (`docs/product/security/finding-jspdf-cves.md`).
- The **PDF export was re-run in a browser** after the major upgrade, so the fix
  is not assumed to be compatible.

### How to verify an artifact

```bash
# the SBOM attached to a release
gh release download <tag> -p sbom.cdx.json

# its provenance
gh attestation verify sbom.cdx.json --repo lucasvmigotto/starsky
```

### Exception process

Findings that are accepted rather than fixed go in
`docs/product/security/exceptions.md` with an owner and an expiry; an expired
exception fails the build. Currently **none**.

### Required secrets and variables (names only)

The R2 names follow the scheme shared across these projects
(`devsecops:pipeline`): the account id, endpoint and bucket are **identifiers**,
so they live as repository **variables**; only the secret is a secret.
`CLOUDFLARE_R2_ACCOUNT_ID` holds the **access-key id** — the S3 client reads it
as `AWS_ACCESS_KEY_ID`.

| Name | Kind | Used by |
|---|---|---|
| `CLOUDFLARE_R2_ACCOUNT_ID` | variable | `site_r2.yml` + `site_docs.yml` deploy (access-key id) |
| `CLOUDFLARE_R2_ACCOUNT_SECRET` | **secret** | `site_r2.yml` + `site_docs.yml` deploy (secret half) |
| `CLOUDFLARE_R2_ENDPOINT_S3_CLIENT` | variable | `site_r2.yml` + `site_docs.yml` deploy (the S3-API endpoint) |
| `CLOUDFLARE_R2_BUCKET_STARSKY` | variable | `site_r2.yml` deploy (the product bucket) |
| `CLOUDFLARE_R2_BUCKET_DOCS` | variable | `site_docs.yml` deploy (the docs bucket) |
| `CLOUDFLARE_R2_BUCKET_ID` | retired | Replaced by the two per-site variables above; no workflow reads it anymore. Delete it once both deploys are green. |
| `STARSKY_STATIC_SITE_URL` | variable | site build (absolute OG URLs) |
| `DOCKER_HUB_PAT` | secret | `dockerhub.yml` |
| `GITHUB_TOKEN` | (automatic) | GHCR push, release, attestations (OIDC) |

Buckets are per-site on purpose: the product syncs to the starsky bucket
under `/starsky/`, the docs site to the docs bucket under `/starsky-docs/`,
and each workflow names only its own bucket variable — so neither site can
sync into the other's bucket even with a shared token.

## Environments and promotion

`dev` → `main`. Promotion to `main` is a merge, and `main` is what deploys the
site and publishes images. There is no staging tier: the site is static, so a
bad deploy is reverted by re-pointing the R2 prefix (see `docs/product/adr/0002`).

## Rollback runbook

1. **Product site**: re-run `site_r2.yml` on the last good commit (`workflow_dispatch`
    on that ref, or revert `main` to it). Assets are content-hashed, so the
    previous build's files keep their names and keep serving until the new
    sync overwrites the entry point — which uploads last by design.
    **Docs site**: same via `site_docs.yml`, against the docs bucket.
    Versioned `/assets/<sha>/` + `/data/<version>/` prefixes with a manifest
    pointer (contracts/delivery.md) are **planned, not built**: until then a
    mid-sync failure can leave a mix of old and new hashed assets, and there
    is no pointer to flip — the recovery is a fresh good deploy, not a flip.
2. **CLI image**: re-tag the previous digest (`ghcr.yml` publishes per-`main`).
3. **Data**: `starsky catalog` is deterministic for a given source snapshot;
   re-run it at the older commit.

### Place lookup sends no credentials, and needs none

Nominatim's policy asks for identification. The **browser cannot send a
`User-Agent`** — it is a forbidden header — so `site/src/lib/geocode.ts` relies
on the automatic `Referer` instead, which is the documented browser-side
compromise. The request fires at most once per form submit, in place mode only,
which keeps it inside the service's ~1 req/s expectation.

Consequently **no CI secret or variable exists for it.** The
`STARSKY_USER_AGENT_CONTACT` setting was retired along with the Python geocoder
(BCR-0005): nothing reads it, and nothing could. Live coverage is restored
where the integration now lives — `site/e2e/j8-live-place-lookup.spec.ts`, an
opt-in journey that runs on `main` (see `site_e2e.yml`'s `live-smoke` job)
against the real service.

## Known gaps

- `origin/dev` is 9 commits behind `origin/main` and carries no `site/`
  deploy path; work branches off `main` until `dev` is caught up or retired.
- R2 auth is being re-scoped: the token needs ListObjects on both buckets,
  and the per-site bucket variables (`..._BUCKET_STARSKY`,
  `..._BUCKET_DOCS`) must exist before either deploy job can pass validation.
  Until then both buckets keep serving their previous builds.
- Versioned R2 prefixes (`/assets/<sha>/`, `/data/<version>/` + manifest) are
  specified in `specs/008-site-delivery/contracts/delivery.md` but not built;
  the deploy is flat with `index.html` last, and rollback is re-deploy, not a
  pointer flip. The timed rollback drill (008 T021, 5-minute target) is unrun.
- `dependency-review-action` needs GitHub Advanced Security on a **private**
  repo; the repo is public, so it runs.
- Branch protection / rulesets are a repository setting, not code — see the
  handoff note. Required checks to enable: `ci / lint-type-test`,
  `site_ci / checks`, `security / trivy`.
