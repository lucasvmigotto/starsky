# geocoding-time seam (OpenAPI N/A)

- `geocode(place, settings, client?) -> {display_name, place_short, lat, lon}` [nominatim.py:85]
- `timezone_from_coords(lat, lon) -> tz name` [nominatim.py:142]
- `resolve_latlon(mode, lat, lon, place, settings)` [nominatim.py:153]
- `utc_from_local(naive, tz) -> UTC` / `format_local(utc, tz) -> "YYYY-MM-DD HH:MM"` [observer.py:7,14]
