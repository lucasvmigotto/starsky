"""Nominatim geocoding settings.

The ``USER_AGENT`` is REQUIRED by the OpenStreetMap Nominatim usage policy
(a descriptive contact string). The app fails fast at startup/CLI time when
it is empty so anonymous bulk traffic is never sent.
"""

from pathlib import Path
from typing import Self

from pydantic import Field, computed_field

from ._base import BaseSettings_


class GeocodingSettings(BaseSettings_):
    BASE_URL: str = "https://nominatim.openstreetmap.org"
    USER_AGENT: str = Field(default="")
    RATE_LIMIT_S: float = 1.0
    CACHE_PATH: Path = Path("/tmp/starpy-cache/geocode.json")
    TTL_DAYS: int = 30

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {}
