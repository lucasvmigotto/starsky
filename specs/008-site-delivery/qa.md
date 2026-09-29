# QA — site-delivery

**Risk: Medium** (impact Medium × likelihood Medium). This is the release path:
if the deploy or the data build breaks, users get a broken site — and there is no
staging tier to catch it first.

## Traceability

| Story / FR / SC | Layer | Test (or planned) |
|---|---|---|
| US1 deploy builds and syncs | integration | CI `static_r2.yml` — **exists** (needs restructure: assets/data prefixes) |
| US1 broken build deploys nothing | integration | **planned** — assert the previous prefix still serves |
| US1 rollback within 5 min | manual drill | **planned** — documented runbook, one timed drill |
| US2 font bundled, no third-party asset | integration | CI: build and assert no `fonts.googleapis`/`gstatic` reference |
| US2 missing font fails loudly | unit | **exists** — Python `FontUnavailableError`; **browser side gap** |
| US3 bundle budget | fitness function | CI size check (`scripts/check_bundle_budget.sh`) — **planned** |
| US3 no secrets in the bundle | fitness function | CI scan over `dist/` — **planned** |
| US3 no-server check | fitness function | CI: no web-framework import, no bound socket — **planned** |
| FR-006 HF Space removed | integration | grep finds no HF/gradio reference — **satisfied by BCR-0003** |
| FR-007 WCAG 2.2 AA | e2e | axe on the journeys (owned by 006/007) |
| SC-004 no third-party asset request | e2e | assert the network log has no external asset |

## Boundary and negative cases

- **Build fails mid-way** → the previous prefix keeps serving; nothing partial is
  published.
- **Data export fails** (source host down) → retried, then fails without
  deploying a half-site.
- **Oversized bundle** (a heavy dependency added) → CI fails with the measured
  size.
- **A token-like string in the bundle** → CI fails.
- **R2 credentials absent** → the deploy job fails before touching the bucket.

## e2e journey

**J6 — Post-deploy smoke** (runs against the deployed URL)
1. Open the production URL.
2. Render a shared sky; assert the poster appears.
3. Export a PNG; assert a download.
4. Assert no request to a third-party asset host.

## Exploratory charter

- **C4 — Release integrity, 30 min.** After a deploy: hard-refresh, check the
  cache headers, confirm rollback re-points, and confirm the old prefix is gone
  from the deployed `index.html`.

## Exit criteria

Deploy green on `main`; all five fitness functions enforced in CI; the rollback
drill timed under 5 minutes; the post-deploy smoke passes on Chrome and Firefox;
no third-party asset request.
