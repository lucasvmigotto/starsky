Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Data model: share-static-viewer | Status: Draft.

- `SharePayload(v=1, lat, lon, place?, when_utc, tz="UTC", options=RenderOptions)`; flat JSON. [OBSERVED: `schemas/share.py:11-28`]
- TS `SharePayload{v,lat,lon,place,when_utc,tz,options}` + `RenderOptions` mirror. [OBSERVED: `static_site/src/lib/share.ts:4-28`]
- Exported viewer data: `catalog.json {stars:[[hip,ra,dec,mag]]}` (mag ≤ 6.5), `constellations.json {segments:[[abbr,name,hip_a,hip_b]]}`. [OBSERVED: `cli.py:263-281`]
- No server storage; payload lives only in the URL fragment.
