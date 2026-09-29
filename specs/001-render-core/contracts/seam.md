# render-core seam (no REST — OpenAPI N/A, see docs/product/introspec.md)

Internal function contract (observed):

- `render_sky_map(lat, lon, place, when_utc, tz_name, options, catalog, lines, planets, timescale, render_cfg, size_px) -> PIL.Image` [src/starpy/render/figure.py:259]
- `project_visible(catalog, lat, lon, when_utc, options, planets, timescale) -> DataFrame(hip,x,y,mag)` [figure.py:65]
- `cache_key(lat, lon, place, when_utc, tz_name, options, size_px) -> sha256 hex` [figure.py:332]
- `export_image(image, output) -> Path` / `export_vector(projected, segments, labels, caption, options, cfg, size_px, output) -> Path` [figure.py:356,363]
