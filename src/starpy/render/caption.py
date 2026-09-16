"""Caption block formatting (pure).

Layout (bottom-centered, stacked):
    [Optional Title — omitted entirely if empty/None]
    40.7580°N, 73.9855°W — Times Square, New York, NY · 2023-01-01 00:00 UTC+00:00

Coordinate convention (documented): signed decimals to 4 places with
N/S/E/W suffixes. The "- <Place>" segment is omitted when no place was
resolved. ``tz_label`` is the IANA name plus offset when known.
"""


def format_coords(lat: float, lon: float) -> str:
    """Format ``40.7580°N, 73.9855°W`` style coordinates."""
    lat_hemi: str = "N" if lat >= 0 else "S"
    lon_hemi: str = "E" if lon >= 0 else "W"
    return f"{abs(lat):.4f}°{lat_hemi}, {abs(lon):.4f}°{lon_hemi}"


def format_caption(
    lat: float,
    lon: float,
    place: str | None,
    local_when: str,
    tz_label: str,
    title: str | None = None,
) -> list[str]:
    """Build caption lines (title line only when non-empty)."""
    coords: str = format_coords(lat, lon)
    detail: str = (
        f"{coords} — {place} · {local_when} {tz_label}"
        if place
        else f"{coords} · {local_when} {tz_label}"
    )
    clean_title: str = (title or "").strip()
    if clean_title:
        return [clean_title, detail]
    return [detail]
