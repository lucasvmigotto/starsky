"""Location input schemas.

Coordinate convention: signed decimal degrees, validated to
lat in [-90, 90], lon in [-180, 180]. Display formatting appends
N/S/E/W suffixes (see render.caption).
"""

from pydantic import Field

from .._base import BaseSchema_


class Coordinates(BaseSchema_):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)


class ResolvedPlace(BaseSchema_):
    display_name: str
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)


class LocationInput(BaseSchema_):
    coordinates: Coordinates | None = None
    place: str | None = None
    resolved: ResolvedPlace | None = None
