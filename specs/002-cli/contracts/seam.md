# cli seam (no REST — OpenAPI N/A, ADR-0001)

- `starpy render [--lat --lon|--place --when(required) --tz --projection --fisheye-strength --min-separation --magnitude-limit --glow/--no-glow --glow-intensity --constellations/--no-constellations --constellation-labels/--no-constellation-labels --shape --title --output]` [cli.py:86-107]
- `starpy cache warm` | `starpy export-static-data [--mag-limit 6.5 --output-dir site/public/data]` [cli.py:234-253]
- bare `python -m starpy` → prints help, opens no socket (BCR-0001; replaces the Gradio launch) [cli.py:75-82]
