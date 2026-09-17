"""OpenStreetMap Nominatim geocoding via httpx (rate-limited + cached).

Usage policy compliance: REQUIRED descriptive ``User-Agent`` (fail fast when
empty), hard 1 req/s throttle, local JSON response cache with TTL, and
attribution ("© OpenStreetMap contributors") rendered in the UI footer.
"""

import json
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Final

import httpx

from ..schemas.inputs.location import Coordinates
from ..settings import GeocodingSettings
from ..utils.setup import require_user_agent

_SEARCH_PATH: Final[str] = "/search"
_CACHE_VERSION: Final[int] = 1
_CITY_KEYS: Final[tuple[str, ...]] = (
    "city",
    "town",
    "village",
    "municipality",
    "county",
)


def short_place_name(item: dict[str, Any]) -> str:
    """Build a poster-friendly short label from a Nominatim result.

    Prefers ``name/road`` + city + state (falling back to country when the
    state duplicates the city), e.g. ``"Times Square, New York, United States"``.
    Falls back to a truncated ``display_name`` when no address parts exist.
    """
    address: dict[str, Any] = item.get("address") or {}
    name: str = str(item.get("name") or address.get("road") or "")
    city: str = ""
    for key in _CITY_KEYS:
        if address.get(key):
            city = str(address[key])
            break
    state: str = str(address.get("state") or "")
    country: str = str(address.get("country") or "")
    tail: str = state if state and state != city else country
    parts: list[str] = []
    for part in (name, city, tail):
        if part and part not in parts:
            parts.append(part)
    if parts:
        return ", ".join(parts[:3])
    return str(item.get("display_name", ""))[:80]


def _read_cache(cache_path: Path) -> dict[str, Any]:
    if not cache_path.exists():
        return {}
    try:
        payload: dict[str, Any] = json.loads(cache_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError, OSError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_cache(cache_path: Path, payload: dict[str, Any]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(payload), encoding="utf-8")


def _cache_entry_valid(entry: dict[str, Any], ttl_days: int) -> bool:
    try:
        stored: datetime = datetime.fromisoformat(entry["at"])
    except KeyError, ValueError:
        return False
    if stored.tzinfo is None:
        stored = stored.replace(tzinfo=UTC)
    return datetime.now(UTC) - stored < timedelta(days=ttl_days)


def geocode(
    place: str,
    settings: GeocodingSettings,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Resolve ``place`` -> display_name/place_short/lat/lon dict.

    Pure-ish: HTTP side effects only on cache miss; throttled to
    ``RATE_LIMIT_S`` between live requests. ``client`` is injectable for tests.
    """
    user_agent: str = require_user_agent(settings.USER_AGENT)
    query: str = place.strip()
    if not query:
        raise ValueError("Place must be a non-empty string.")
    cache_path: Path = Path(settings.CACHE_PATH)
    cache: dict[str, Any] = _read_cache(cache_path)
    entry: Any = cache.get(query)
    if (
        isinstance(entry, dict)
        and entry.get("v") == _CACHE_VERSION
        and _cache_entry_valid(entry, settings.TTL_DAYS)
    ):
        result: dict[str, Any] = dict(entry["result"])
        return result

    own_client: bool = client is None
    http: httpx.Client = client or httpx.Client(timeout=30.0)
    try:
        response: httpx.Response = http.get(
            settings.BASE_URL.rstrip("/") + _SEARCH_PATH,
            params={"q": query, "format": "jsonv2", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": user_agent, "Accept": "application/json"},
        )
        response.raise_for_status()
        items: Any = response.json()
    finally:
        if own_client:
            http.close()
    if not items:
        raise LookupError(f"No Nominatim result for place: {query!r}")
    first: dict[str, Any] = items[0]
    resolved: dict[str, Any] = {
        "display_name": str(first["display_name"]),
        "place_short": short_place_name(first),
        "lat": float(first["lat"]),
        "lon": float(first["lon"]),
    }
    cache[query] = {
        "v": _CACHE_VERSION,
        "at": datetime.now(UTC).isoformat(),
        "result": resolved,
    }
    _write_cache(cache_path, cache)
    time.sleep(settings.RATE_LIMIT_S)
    return resolved


def timezone_from_coords(lat: float, lon: float) -> str:
    """Best-effort IANA timezone name for coordinates (pure OSS)."""
    from timezonefinder import TimezoneFinder

    finder: Any = TimezoneFinder()
    name: Any = finder.timezone_at(lat=lat, lng=lon)
    if name is None:
        raise LookupError(f"No timezone found for ({lat}, {lon}).")
    return str(name)


def resolve_latlon(
    mode: str,
    lat: float,
    lon: float,
    place: str,
    settings: GeocodingSettings,
) -> tuple[Coordinates, str | None]:
    """Resolve GUI/CLI location inputs -> (Coordinates, short place|None).

    ``mode == "place"`` geocodes (caption uses the short label);
    otherwise validates the raw coordinates. Raises ValueError.
    """
    if mode == "place":
        if not place.strip():
            raise ValueError("Enter a place name or switch to coordinates mode.")
        resolved: dict[str, Any] = geocode(place.strip(), settings)
        coords: Coordinates = Coordinates(
            lat=float(resolved["lat"]), lon=float(resolved["lon"])
        )
        return coords, str(resolved.get("place_short") or resolved["display_name"])
    return Coordinates(lat=float(lat), lon=float(lon)), None
