# Data model: catalog-cli | Status: Draft.

- **CatalogJson** — `{"stars": [[hip:int, ra_deg:float, dec_deg:float, mag:float], …]}`
  filtered by mag limit. Consumed positionally by `site/src/lib/skymodel.ts`.
- **ConstellationsJson** — `{"segments": [[abbr:str, name:str, hip_a:int, hip_b:int], …]}`.
- Parquet caches: `hipparcos.parquet`, `constellations.parquet` under
  `STARPY__CATALOG__CACHE_DIR`.
- No database, no migrations, no personal data.
