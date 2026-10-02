# ADR-0004 — Resilience and observability for an originless static product

Status: proposed
Date: 2026-09-29
Deciders: lucas

## Context and drivers

Drivers: 99.9 % availability, free tier, correctness. RPO/RTO are unstated; there is no user data and no database.

## Considered options

1. **No formal DR** — relies on rebuild-from-git implicitly.
2. **Explicit rebuild contract + CDN analytics + optional client error beacon** (chosen).
3. **Server-side monitoring stack** — rejected: no server, and it would cost.

## Decision outcome

- **RPO/RTO**: RPO = last successful CI build (no mutable data); RTO = time to re-run CI and re-sync R2 (minutes). Backups are unnecessary because everything is reproducible from a commit — the recovery asset is git plus the CI config.
- **Degradation**: a stale or missing `data/` prefix fails the viewer's data fetch; the app must show an explicit error state (already has `EmptyState`/`InvalidState`) rather than a blank sky.
- **Observability**: Cloudflare/R2 analytics for traffic and operation counts (the free-tier alarm signal); optional client-side render-failure beacon, gated behind a consent-free, no-PII payload. No logs to retain.
- **Alarms**: R2 operation count approaching free-tier limits; bundle/data budget breach (CI, fitness function 4).

## Consequences

Good: recovery is a rebuild, not a restore; observability cost is ~zero; the failure surface is small.

Bad: no server-side error traces (client beacon is best-effort); free-tier ceilings need watching at virality.

## Confirmation

A documented rebuild drill restores the site from a commit; the beacon, if enabled, reports its first render failure; analytics show origin-fetch ratio low under a spike.
