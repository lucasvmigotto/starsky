"""Sky-map render callback: resolve params -> render_sky_map -> PIL image."""

from datetime import UTC, datetime
from typing import Any, Self
from zoneinfo import ZoneInfo

from PIL.Image import Image as pil_Image
from polars import DataFrame as pl_DataFrame

from ...astro.observer import utc_from_local
from ...geocoding.nominatim import geocode, resolve_latlon, timezone_from_coords
from ...render.figure import render_sky_map
from ...schemas.enums.projection import Projection
from ...schemas.enums.shape import Shape
from ...schemas.inputs.render import RenderOptions
from ...schemas.share import SharePayload
from ...settings import Settings
from ...share.spec import share_link
from ._base import OnCallbackBase


def coerce_when(value: Any) -> datetime:
    """Coerce a Gradio Datetime value (datetime | timestamp | ISO str)."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=UTC)
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    raise ValueError(f"Unsupported datetime value: {value!r}")


class SkyMapCallback(OnCallbackBase):
    """Thin Gradio-boundary adapter over the pure render pipeline."""

    def __init__(
        self: Self,
        settings: Settings,
        catalog: pl_DataFrame,
        lines: pl_DataFrame,
        planets: Any,
        timescale: Any,
        /,
    ) -> None:
        self._settings: Settings = settings
        self._catalog: pl_DataFrame = catalog
        self._lines: pl_DataFrame = lines
        self._planets: Any = planets
        self._timescale: Any = timescale

    def on_detect_tz(self: Self, mode: str, lat: float, lon: float, place: str) -> str:
        """Auto-detect IANA timezone from coordinates (or geocoded place)."""
        if mode == "place" and place.strip():
            resolved: dict[str, Any] = geocode(place.strip(), self._settings.GEOCODING)
            lat, lon = float(resolved["lat"]), float(resolved["lon"])
        return timezone_from_coords(float(lat), float(lon))

    def on_geocode_preview(self: Self, place: str) -> str:
        """Resolve a place to its display name for UI feedback."""
        if not place.strip():
            return ""
        resolved: dict[str, Any] = geocode(place.strip(), self._settings.GEOCODING)
        return str(resolved["display_name"])

    def on_btn_render_callback(
        self: Self,
        /,
        mode: str,
        lat: float,
        lon: float,
        place: str,
        when: Any,
        tz_name: str,
        projection: str,
        fisheye_strength: float,
        min_separation: float,
        magnitude_limit: float,
        glow: bool,
        glow_intensity: float,
        constellations: bool,
        constellation_labels: bool,
        shape: str,
        title: str | None,
    ) -> pil_Image:
        coords, display_place = resolve_latlon(
            mode, float(lat), float(lon), place, self._settings.GEOCODING
        )

        moment: datetime = coerce_when(when)
        tz: str = (tz_name or "UTC").strip() or "UTC"
        ZoneInfo(tz)  # fail fast on unknown zones
        when_utc: datetime = utc_from_local(moment, tz)

        options: RenderOptions = self._render_options(
            projection,
            fisheye_strength,
            min_separation,
            magnitude_limit,
            glow,
            glow_intensity,
            constellations,
            constellation_labels,
            shape,
            title,
        )
        return render_sky_map(
            lat=coords.lat,
            lon=coords.lon,
            place=display_place,
            when_utc=when_utc,
            tz_name=tz,
            options=options,
            catalog=self._catalog,
            lines=self._lines,
            planets=self._planets,
            timescale=self._timescale,
            render_cfg=self._settings.RENDER,
        )

    @staticmethod
    def _render_options(
        projection: str,
        fisheye_strength: float,
        min_separation: float,
        magnitude_limit: float,
        glow: bool,
        glow_intensity: float,
        constellations: bool,
        constellation_labels: bool,
        shape: str,
        title: str | None,
    ) -> RenderOptions:
        """Build validated render options from raw UI values."""
        return RenderOptions(
            projection=Projection(projection),
            fisheye_strength=float(fisheye_strength),
            min_separation=float(min_separation),
            magnitude_limit=float(magnitude_limit),
            glow=bool(glow),
            glow_intensity=float(glow_intensity),
            constellations=bool(constellations),
            constellation_labels=bool(constellation_labels),
            shape=Shape(shape),
            title=(title.strip() if title and title.strip() else None),
        )

    def on_share_link(
        self: Self,
        /,
        mode: str,
        lat: float,
        lon: float,
        place: str,
        when: Any,
        tz_name: str,
        projection: str,
        fisheye_strength: float,
        min_separation: float,
        magnitude_limit: float,
        glow: bool,
        glow_intensity: float,
        constellations: bool,
        constellation_labels: bool,
        shape: str,
        title: str | None,
    ) -> str:
        """Resolve the same inputs as render and return a viewer share URL."""
        coords, display_place = resolve_latlon(
            mode, float(lat), float(lon), place, self._settings.GEOCODING
        )
        moment: datetime = coerce_when(when)
        tz: str = (tz_name or "UTC").strip() or "UTC"
        ZoneInfo(tz)
        when_utc: datetime = utc_from_local(moment, tz)
        options: RenderOptions = self._render_options(
            projection,
            fisheye_strength,
            min_separation,
            magnitude_limit,
            glow,
            glow_intensity,
            constellations,
            constellation_labels,
            shape,
            title,
        )
        payload: SharePayload = SharePayload(
            lat=coords.lat,
            lon=coords.lon,
            place=display_place,
            when_utc=when_utc,
            tz=tz,
            options=options,
        )
        return share_link(payload, self._settings.SHARE.BASE_URL)
