Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Data model: geocoding-time | Status: Draft.

- `Coordinates(lat, lon)`; `ResolvedPlace(display_name, lat, lon)`; `LocationInput(coordinates?, place?, resolved?)`. [OBSERVED: `schemas/inputs/location.py`]
- `Observation(when, tz="UTC")` + derived UTC moment. [OBSERVED: `observation.py:11-20`]
- Cache file `{v:1, at: iso, result}` — infrastructure, not domain rows.
