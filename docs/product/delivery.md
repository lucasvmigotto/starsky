# starsky — delivery

Status: Draft

Owner: `devsecops:pipeline` (security section by `devsecops:supply-chain`).

## Pipelines

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push (all branches), PR | Python: ruff, `ty`, pytest, and a real `cache warm` + `catalog` build asserting the JSON shape and counts |
| `site_ci.yml` | push/PR touching `site/**` or the render fixtures | Site: lint, `tsgo` typecheck, 91 unit/component/reference tests, build, bundle+data budgets, no-secrets scan |
| `site_e2e.yml` | push to `main`/`dev`, PR touching `site/**` | 54 Playwright journeys on **Chromium and Firefox**: J1–J4, a11y, contrast, font integrity, interactive poster, perf |
| `security.yml` | push to `main`/`dev`, all PRs, weekly | dependency review, Trivy (secrets, vulns, config), CodeQL (Python + TS) |
| `site_r2.yml` | push to `main` touching `site/**`, PR, manual | Builds the sky data + site and deploys to Cloudflare R2 |
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
| `CLOUDFLARE_R2_ACCOUNT_ID` | variable | `site_r2.yml` deploy (access-key id) |
| `CLOUDFLARE_R2_ACCOUNT_SECRET` | **secret** | `site_r2.yml` deploy (secret half) |
| `CLOUDFLARE_R2_ENDPOINT_S3_CLIENT` | variable | `site_r2.yml` deploy (the S3-API endpoint) |
| `CLOUDFLARE_R2_BUCKET_ID` | variable | `site_r2.yml` deploy |
| `STARSKY_STATIC_SITE_URL` | variable | site build (absolute OG URLs) |
| `DOCKER_HUB_PAT` | secret | `dockerhub.yml` |
| `GITHUB_TOKEN` | (automatic) | GHCR push, release, attestations (OIDC) |

## Environments and promotion

`dev` → `main`. Promotion to `main` is a merge, and `main` is what deploys the
site and publishes images. There is no staging tier: the site is static, so a
bad deploy is reverted by re-pointing the R2 prefix (see `docs/product/adr/0002`).

## Rollback runbook

1. **Site**: re-run `site_r2.yml` on the last good commit, or flip the data
   version pointer back. Assets are immutable and hashed, so the previous build
   keeps serving until the pointer moves.
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

- The workflows have not yet been observed green on GitHub (pushed 2026-09-29);
  the container bootstrap was verified locally instead.
- `dependency-review-action` needs GitHub Advanced Security on a **private**
  repo; the repo is public, so it runs.
- Branch protection / rulesets are a repository setting, not code — see the
  handoff note. Required checks to enable: `ci / lint-type-test`,
  `site_ci / checks`, `security / trivy`.
