Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Data model: render-core

Status: Draft.

- `StarCatalog(hip Int64, ra_deg/dec_deg/mag Float64)` sorted by mag. [OBSERVED: `data/catalog.py:65-100`]
- `ConstellationLines(abbr/name String, hip_a/hip_b Int64)`. [OBSERVED: `data/constellations.py:52-60`]
- `ProjectedVisible(hip,x,y,mag)`; `Segments(abbr,name,x_a,y_a,x_b,y_b)`; `Labels(abbr,name,x,y)`. [OBSERVED: `render/figure.py:65-111`; `render/constellations.py:11-82`]
- `RenderOptions(projection, fisheye_strength (0,3], min_separation [0,0.1], magnitude_limit [1,8], glow, glow_intensity [0,3], constellations, constellation_labels, shape, title?)`. [OBSERVED: `schemas/inputs/render.py:10-20`]
- No tables/collections persisted (file caches only); all frames transient. ER diagram N/A.
