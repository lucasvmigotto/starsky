Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: geocoding-time (as-is) | Status: Draft, no tasks.md.

- `geocode(place, settings, client=None)` injectable client for tests. [OBSERVED: `nominatim.py:85`]
- `resolve_latlon(mode, lat, lon, place, settings)`; place mode requires non-empty. [OBSERVED: `nominatim.py:153-173`]
- `GeocodingSettings(BASE_URL, USER_AGENT="", RATE_LIMIT_S 1.0, CACHE_PATH, TTL_DAYS 30)`. [OBSERVED: `settings/geocoding.py:16-21`]
- `utc_from_local / format_local` pure `ZoneInfo`. [OBSERVED: `observer.py:7-17`]
