# catalog-cli seam (no REST — OpenAPI N/A, ADR-0001)

- `starsky catalog [--mag-limit 6.5] [--output-dir site/public/data]` writes
  `catalog.json`, `constellations.json` and `names.json`.
- `starsky cache warm` downloads and parses the sources (Hipparcos, Stellarium
  modern lines, the HIP-keyed star names).
- Bare `python -m starsky` prints help and opens no socket (BCR-0005).

## Shapes (re-verified against `src/starsky/cli.py` on 2026-11-01)

| File | Shape | Notes |
|---|---|---|
| `catalog.json` | `{"stars": [[hip, ra_deg, dec_deg, mag], ...]}` | Numbers. Only `mag <= --mag-limit` (default 6.5, 8,870 stars) |
| `constellations.json` | `{"segments": [[abbr, name, hip_a, hip_b], ...]}` | One figure line per row (843 rows, 88 figures) |
| `names.json` | `{"names": [[hip, name], ...]}` | Sorted by HIP (520 names) |

These shapes are the contract with the browser (`site/src/lib/skymodel.ts`,
`site/src/lib/sky/scene.ts`). A change to them is a spec change on both sides.
