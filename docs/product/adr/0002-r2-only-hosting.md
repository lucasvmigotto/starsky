# ADR-0002 — R2 + Cloudflare CDN is the only hosting; recovered by rebuild

Status: proposed
Date: 2026-09-29
Deciders: lucas

## Context and drivers

Drivers: **cost** (free tier only), 99.9 % availability, viral-spike resilience, correctness. The site is a set of static files (~0.7 MB first visit, ~280 KB brotli data) plus a font. There is no user data.

## Considered options

1. **Cloudflare R2 + CDN** (chosen) — free tier, no egress fee, explicit cache control, analytics.
2. **GitHub Pages** — also free; less control over cache headers/prefixes and no analytics; would require rewiring.
3. **HF Space / container host** — an origin with cold starts and cost; rejected (BCR-0003).
4. **Multi-region or multi-provider** — no driver; doubles platform work.

## Decision outcome

Host only on R2 behind Cloudflare's CDN. Assets under immutable hashed paths; data under a versioned prefix with a short manifest; deploy by `git`-triggered CI sync. Disaster recovery is **rebuild from git** — assets and data are reproducible from a commit; RPO/RTO = the last successful CI build. Rollback re-points to the previous immutable prefix.

## Consequences

Good: $0, originless, absorbs spikes, simple rollback; nothing to patch or back up.

Bad: single-provider dependency; free-tier operation ceilings become the scaling limit; a broken CI build is the only failure mode for new releases (old prefix keeps serving).

## Confirmation

R2 operation counts and CDN hit-ratio stay within free tier across normal traffic and a modelled spike; a rollback drill re-points to the previous prefix in minutes.
