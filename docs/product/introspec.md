Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# starpy — introspection evidence report

Status: Draft

## Scope and boundaries

- In scope: entire repo — Python package `src/starpy/` (~60 files), `app.py` HF entry, `static_site/` viewer, `Dockerfile`/`hf.Dockerfile`, `.devcontainer/`, `.github/workflows/`, `tests/`, `scripts/`. [ASSUMPTION confirmed with user 2026-09-29: everything.]
- Runs permitted (user: yes): `uv sync --all-groups`, `ruff`, `ty`, `pytest`, `bun test`, `bun install`. [OBSERVED]
- Database: none — file caches only. `db:inspect` N/A (user confirmed 2026-09-29). [OBSERVED: `.env.example:9-11`; no DB client in `pyproject.toml:8-21`]
- `contracts/openapi.yaml`: **N/A** — no HTTP/REST routes exist (CLI + Gradio + static viewer only). User confirmed. CI/Gradio seams documented in `specs/*/contracts/seam.md`, not as OpenAPI. [OBSERVED: repo-wide]

## Inventory

- Language/toolchain: Python `>=3.14` (`3.14`), `uv` 0.12.9, `ruff` (E,F,I,UP,B; 88 cols), `ty` 0.0.81, `pytest` (`-q --strict-markers`; markers unit/integration/golden/network). [OBSERVED: `pyproject.toml:6,39-54`]
- Static site: Vite + TS + React + Vitest, `bun.lock`, `eslint` + `tsc`. [INFERRED: `static_site/package.json`, `vitest.config.ts`; confirm with `bun run build`.]
- Delivery: `Dockerfile` (DHI builder/runtime, non-root 65532, EXPOSE 8080, cache volume), `hf.Dockerfile` (python:3.14-slim, uid 1000, EXPOSE 7860), `requirements.txt` (uv-exported, 71 pinned pkgs). [OBSERVED: `Dockerfile:18-72`; `hf.Dockerfile:11-30`; `requirements.txt:1-213`]
- SBOM: `docs/product/sbom.cdx.json` — 71 components from pinned `requirements.txt` (CycloneDX 1.5). `syft`/`cdxgen` are not installed, so this was generated from the lock's export; regenerate with `syft dir:. -o cyclonedx-json` when available. [OBSERVED]
- Licenses: GPL-3.0-only (code); Hipparcos + DE421 public domain; Stellarium IAU lines CC BY-SA 4.0 (one-way GPL-compatible); Cormorant Garamond OFL 1.1. [OBSERVED: `THIRD_PARTY_NOTICES.md`]

## Entry points (all covered by a feature)

| Entry | Feature | Evidence |
|---|---|---|
| `python -m starpy` (bare) → Gradio | 003 | `cli.py:75-82` |
| `starpy render` | 002 | `cli.py:85-226` |
| `starpy cache warm` | 005 | `cli.py:234-242` |
| `starpy export-static-data` | 006 | `cli.py:245-282` |
| Gradio `sky` route + 4 callbacks | 003 | `gui/pages/sky.py:31-103` |
| `app.py` HF Space entry | 003 | `app.py:10-23` |
| Static viewer routes `#s=` / landing | 006 | `static_site/src/App.tsx:18-36` |
| `scripts/*` (publish_space, export_space_requirements, make_og_banner, check_declarative_imports) | delivery / CI | listed in architecture |

No scheduled jobs, queue consumers, webhooks, gRPC/GraphQL observed.

## Integrations (labels + selecting config keys, names only)

- Nominatim: `[OBSERVED]` `GEOCODING__BASE_URL`, `GEOCODING__USER_AGENT` (required), `GEOCODING__RATE_LIMIT_S`, `GEOCODING__CACHE_PATH`, `GEOCODING__TTL_DAYS`. [`nominatim.py:85-139`; `settings/geocoding.py:16-21`]
- CDS Hipparcos `hip_main.dat`: `[OBSERVED]` constant URL [`data/catalog.py:30`].
- Stellarium `modern_iau/index.json`: `[OBSERVED]` [`data/constellations.py:26-29`].
- JPL DE421 via Skyfield Loader: `[OBSERVED]` `EPHEMERIS__CACHE_DIR`, `BSP_NAME=de421.bsp` [`data/ephemeris.py:11-30`].
- Google Fonts Cormorant Garamond: `[OBSERVED]` constant URL [`data/fonts.py:15-18`].
- Registries: `[OBSERVED]` GHCR (`ghcr.yml`), Docker Hub (`DOCKER_HUB_PAT`, `dockerhub.yml`), HF Space OIDC (`hf_spaces.yml`, no static secret), Cloudflare R2 for the static site (`static_r2.yml` secrets: `CLOUDFLARE_R2_ACCOUNT_ACCESS_KEY`, `CLOUDFLARE_R2_ACCOUNT_SECRET`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET`).

## What ran, and results (2026-09-29, local `uv` 0.12.9, Python 3.14 via uv env)

| Command | Result |
|---|---|
| `uv sync --all-groups` | OK |
| `uv run ruff check src tests` | `All checks passed!` |
| `uv run ruff format --check src tests` | `95 files already formatted` |
| `uv run ty check src tests` | `All checks passed!` |
| `uv run pytest` (full, 226s) | `78 passed` |
| `uv run pytest -m "not integration"` | `76 passed, 2 deselected in 2.33s` |
| `uv run pytest -m integration` | timed out at 120s locally (cold `de421.bsp` cache, Skyfield download); CI runs it with a warm cache. **Not timed to completion → cannot mark Verified.** |
| `cd static_site && bun install` | OK (227 pkgs) |
| `cd static_site && bun test` | `44 pass, 2 fail` — both in `geocode.test.ts` (`vi.stubGlobal/unstubAllGlobals is not a function`): the file is written for vitest's `vi`, run under bun's test runner here. Render-spec, astro, share, skymodel, encode, caption, site, og suites pass. |

All Python results are `OBSERVED` (run outputs above). Static-site pass/fail verified by run.

## Data

No DBMS, no migrations, no seeds. Models are Pydantic + Polars frames; persistence is file caches (`/tmp/starpy-cache/…`, `.env.example:9-11`) and exported viewer JSON. Every table/collection item is "file store" and enumerated in `specs/005-data-cache/data-model.md`; domain-only (non-infrastructure) entities in `docs/product/domain-model.md`. No personal data observed; no secrets copied.

## Rules, states, authorization

- Status fields: none (no workflows). Enums `Shape`/`Projection` are static options, not state machines. [`schemas/enums/*`]
- Invariants captured in `domain-model.md` (location one-of, time conversion, option ranges, cache-key determinism, geocode TTL).
- Authorization matrix: **N/A** — no users, roles, sessions or authz checks observed; single-user self-hosted tool.

## Drift against existing docs

No prior pipeline artifacts existed (`docs/product/`, `specs/`, `contracts/` all absent at start), so there is no upstream drift to report. Documentation drift found *within* the repo:

- `README.md:5` claims "never pandas" and CI enforces it (`tests/test_no_pandas.py`); confirmed true. No drift.
- `README.md:49` "renders are deterministic (content-hash cache)" — confirmed by `cache_key` + integration determinism test (not re-run to completion here). [OBSERVED: `figure.py:332-353`]
- `static_site/PLAN.md:45-60` describes the viewer as stereographic-only preview (mag ≤ 5.5, no vector); the shipped TS `SPEC` also implements fisheye/skymodel projection, a superset of the plan. Minor doc/code drift — the viewer supports more than PLAN states. [OBSERVED: `static_site/src/lib/skymodel.ts:63-68`; `render-spec.json:28-35`]

## Contradictions

- `.devcontainer/devcontainer.json` uses image `lucasvmigotto/devenv:python-3.14-trixie` and installs Node + nodemon; `nodemon.json` runs `python -m starpy`. No contradiction with the app, but the devcontainer is host-authored and not the `containers.md` `tools`-image reference environment; `Dockerfile`/`hf.Dockerfile` are the reproducible builds. [OBSERVED]
- No floating tool versions beyond image tags in devcontainer (`lucasvmigotto/devenv:python-3.14-trixie` is tag-pinned, not digest-pinned). Flagged under risks.

## Dead code / unreachable

- None observed in Python. Fast suite + import guard cover all modules; `scripts/*` all referenced by CI. [OBSERVED]
- Gradio `SHARE` flag defaults `False` (`settings/gradio.py:14`), so the built-in Gradio share tunnel is disabled — the app's own "Copy share link" is the share mechanism. Not dead, but easy to misread.

## Risks spotted (not fixed)

1. **Security — no HTTP auth, server binds 0.0.0.0:8080 by default** (`settings/gradio.py:11`; `.env.example:3`). Self-hosted single-user assumption; exposing it publicly allows arbitrary poster rendering (CPU) and uses the operator's Nominatim UA. Recommend documenting exposure/limits or adding a reverse-proxy gate. [OBSERVED]
2. **Operability — cold start downloads ~30 MB (`de421.bsp`) + catalog + lines + font**; on HF without a persistent cache volume they re-download each restart (`hf.README.md` notes this). Recommend pointing cache at persistent storage. [OBSERVED]
3. **Reliability — integration suite depends on JPL mirrors and network**; it timed out locally. CI mitigates with mirrors + skip-on-outage (`tests/integration/_helpers.py:19-75`). Green CI is the only Verified path today. [OBSERVED]
4. **Supply chain — images are tag-pinned, not digest-pinned**; devcontainer image tag not immutable. `dockerhub.yml` emits provenance+SBOM. Recommend digest pinning + Renovate. [OBSERVED]
5. **Static-site test runner mismatch** — `bun test` cannot run two vitest-based `geocode.test.ts` cases; CI uses its own path (see `static_r2.yml`), so keep the runner consistent. [OBSERVED]
6. **Nominatim 403** for `example.com` UAs is documented; a bad UA silently breaks place search. Fail-fast is in `geocode` (`nominatim.py:95`). [OBSERVED]

## Open Inferred / Assumed items (for the confirmation round)

- [ASSUMPTION] Purpose is personal keepsake/gift and possibly event/venue merchandising — why the product exists. Confirm.
- [ASSUMPTION] Primary audiences: non-technical buyers, self-hosters, and HF Space users. Confirm.
- [ASSUMPTION] Success metrics are undefined in the repo; proposed set in `brief.md`. Confirm.
- [INFERRED] Static site deploys to Cloudflare R2 (from `static_r2.yml` secret names + `site.ts` fallback URL) — confirm the environment/URL.
- [INFERRED] Font-download failure degrades to DejaVu/serif — confirm acceptable.
- [NEEDS CLARIFICATION] Is there any plan for a hosted/multi-user service (accounts, saved posters)? None observed; if yes it is to-be work (`project:refactor`).

## Coverage checklist

- [x] every entry point is in a feature or listed as delivery/dead — see table above
- [x] every table/collection is in the domain model or marked infrastructure-only (file caches only)
- [x] every integration has a label and the config keys that select it
- [x] every status field has a state machine (none exist) / authorization matrix (N/A, no authz)
- [x] every feature status is evidence-backed; nothing Verified (no passing e2e observed)
- [x] SBOM generated; stack + versions in `architecture.md`
- [x] drift against existing docs reported
- [x] no secrets, connection strings or data rows in any artifact
- [x] confirmation round queued; remaining Inferred/Assumed listed above
- [x] `contracts/openapi.yaml` marked N/A with reason; per-feature seams documented

## Handoff

- **Reconstructed**: `docs/product/{brief,architecture,domain-model,introspec}.md`, `docs/product/sbom.cdx.json`, `specs/README.md` + `specs/001..006/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/seam.md`). Spec Kit bootstrapped (`.specify/`). No `tasks.md` written.
- **Confidence**: the large majority of product claims are `[OBSERVED: file:line]`; stack/delivery partly `[INFERRED]` (static-site deploy, viewer parity). Purpose/audiences/metrics are `[ASSUMPTION]` pending your confirmation.
- **Riskiest findings**: public 0.0.0.0 Gradio with no auth; cold-start re-downloads on stateless hosts; integration/e2e not verified locally; tag-not-digest image pinning.
- **Next stage**: answer the confirmation round above (I'll flip labels), then choose — `project:retrofit` (upgrade/deps/CVEs), `project:refactor` (redesign/to-be), `project:architecture` (review mode) for a target architecture, or `project:docs` for the documentation site. Commits follow `git:workflow`.
