Re-scoped by project:refactor on 2026-09-29 (BCR-0005).

# Data model: data-cache | Status: Draft.

File stores only (no DBMS):

| File | Contents |
|---|---|
| `hipparcos.parquet` | `hip:Int64, ra_deg:Float64, dec_deg:Float64, mag:Float64`, mag-sorted |
| `constellations.parquet` | `abbr:String, name:String, hip_a:Int64, hip_b:Int64` |
| `site/public/data/catalog.json`, `constellations.json` | the exported pair |

No keys, constraints, migrations or personal data. A re-export is a cache
re-read, not a data migration.
