Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Data model: data-cache | Status: Draft.

File stores only (no DBMS): `hipparcos.parquet`, `constellations.parquet`, `de421.bsp`, font TTF, `geocode.json`, `renders/{sha}.png`, `site/public/data/{catalog,constellations}.json`. Schemas mirror `Star` + `ConstellationLine`. No keys/constraints beyond parquet sort + cache-version checks.
