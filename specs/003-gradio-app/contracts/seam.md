# gradio seam (OpenAPI N/A)

- Route `sky` only; `build_sky(ui, on_render, on_detect_tz, on_geocode_preview, on_share_link)`.
- `render_btn.click(on_render, 16 inputs → output Image)`; `share_btn.click(on_share_link, 16 → share_link_box)`; `detect_tz.click(on_detect_tz, [mode,lat,lon,place] → tz_name)`; `place.change(on_geocode_preview, place → resolved)`. [pages/sky.py:96-103]
