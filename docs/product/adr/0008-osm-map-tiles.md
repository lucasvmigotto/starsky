# ADR-0008 — OpenStreetMap tiles for the location map, on demand

Status: accepted
Date: 2026-10-31
Deciders: lucas

## Context and drivers

The owner approved search plus a Leaflet map for choosing a place. A map needs tiles, and the constitution allowed Nominatim as the only outbound call. Cost (free tier), privacy and static hosting are the drivers.

## Considered options

1. **OpenStreetMap standard tiles, on demand** (chosen).
2. **Self-hosted tiles on R2** — no third party, but needs a build pipeline and is limited to about city-level zoom.
3. **Keyed commercial provider** — usage agreement, but a public key and free-tier limits.
4. **No map** — departs from the approved search + map decision.

## Decision outcome

Option 1, under the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/), checked 2026-10-31. Constitution 1.2.0, principle VI, permits this call.

- URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, held in one configuration value so the provider can change without other code changes.
- Tiles load only after the visitor opens the map. Leaflet itself is lazy-loaded. The poster, Explorer and shared links request no tiles.
- Attribution stays visible on the map, with a "report a map issue" link to `openstreetmap.org/fixthemap`.
- No prefetching, seeding or offline tile storage. No `Referrer-Policy` that strips the Referer.
- Automated tests never reach the tile server: e2e stubs tile requests.
- Coordinate fields always work without the map, so a tile failure blocks nothing.

## Consequences

Good: free, no key, no pipeline.

Bad: the visitor's IP reaches OpenStreetMap once they open the map. Availability is best-effort, with no SLA, and access may be blocked without notice. Self-hosting or a provider is the fallback if that happens.

## Confirmation

An e2e test asserts no tile request before the map opens, that attribution is visible once it does, and that a tile failure leaves the form usable.
