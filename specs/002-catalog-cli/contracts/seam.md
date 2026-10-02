# catalog-cli seam (no REST — OpenAPI N/A, ADR-0001)

- `starsky catalog [--mag-limit 6.5] [--output-dir site/public/data]` → writes
  `catalog.json`, `constellations.json`.
- `starsky cache warm` → downloads/parses the two sources.
- bare `python -m starsky` → prints help, opens no socket (BCR-0005).

The JSON shapes above are the contract with the browser; a change is a spec
change on both sides.
