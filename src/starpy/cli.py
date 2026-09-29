"""Headless + app entry points (Gradio imported lazily, never for `render`)."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from click import BadParameter as click_BadParameter
from click import Choice as click_Choice
from click import Context as click_Context
from click import Path as click_Path
from click import UsageError as click_UsageError
from click import echo as click_echo
from click import group as click_group
from click import option as click_option
from click import pass_context as click_pass_context
from polars import DataFrame as pl_DataFrame
from polars import col as pl_col

from .astro.observer import utc_from_local
from .data.catalog import load_hipparcos
from .data.constellations import load_constellation_lines
from .data.ephemeris import load_ephemeris
from .data.fonts import ensure_font, register_cached_fonts
from .geocoding.nominatim import geocode
from .render.figure import (
    cache_key,
    export_image,
    export_vector,
    render_sky_map,
)
from .schemas.enums.projection import Projection
from .schemas.enums.shape import Shape
from .schemas.inputs.location import Coordinates
from .schemas.inputs.render import RenderOptions
from .settings import Settings


def warm_caches(settings: Settings) -> dict[str, int]:
    """Predownload ephemeris/catalog/constellations; install the bundled font."""
    _, planets, timescale = load_ephemeris(settings.EPHEMERIS)
    catalog: pl_DataFrame = load_hipparcos(settings.EPHEMERIS)
    lines: pl_DataFrame = load_constellation_lines(settings.EPHEMERIS.CACHE_DIR)
    font_path: Path = ensure_font(settings.EPHEMERIS.CACHE_DIR)
    _ = (planets, timescale)
    return {
        "stars": catalog.height,
        "segments": lines.height,
        "font": int(font_path.exists()),
    }


def resolve_coordinates(
    lat: float | None, lon: float | None, place: str | None, settings: Settings
) -> tuple[Coordinates, str | None]:
    """Resolve --lat/--lon or --place into (Coordinates, display place)."""
    if place:
        resolved: dict[str, Any] = geocode(place, settings.GEOCODING)
        return (
            Coordinates(lat=float(resolved["lat"]), lon=float(resolved["lon"])),
            str(resolved.get("place_short") or resolved["display_name"]),
        )
    if lat is None or lon is None:
        raise click_UsageError("Provide --lat/--lon or --place.")
    return Coordinates(lat=lat, lon=lon), None


def parse_when(raw: str) -> datetime:
    """Parse ``YYYY-MM-DDTHH:MM`` (naive, interpreted in --tz)."""
    try:
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise click_BadParameter(f"Unparseable --when {raw!r}: {exc}") from exc


@click_group(invoke_without_command=True)
@click_pass_context
def main(ctx: click_Context) -> None:
    """starpy: no subcommand launches the Gradio app; see `render`/`cache`."""
    if ctx.invoked_subcommand is None:
        from .main import launch_app

        launch_app()


@main.command(name="render")
@click_option("--lat", type=float, default=None)
@click_option("--lon", type=float, default=None)
@click_option("--place", type=str, default=None)
@click_option("--when", "when_raw", type=str, required=True)
@click_option("--tz", "tz_name", type=str, default="UTC", show_default=True)
@click_option(
    "--projection",
    type=click_Choice(["stereographic", "fisheye"]),
    default="stereographic",
)
@click_option("--fisheye-strength", type=float, default=1.0)
@click_option("--min-separation", type=float, default=0.008)
@click_option("--magnitude-limit", type=float, default=5.8)
@click_option("--glow/--no-glow", default=True)
@click_option("--glow-intensity", type=float, default=1.0)
@click_option("--constellations/--no-constellations", default=True)
@click_option("--constellation-labels/--no-constellation-labels", default=True)
@click_option(
    "--shape", "shape_opt", type=click_Choice(["circle", "square"]), default="circle"
)
@click_option("--title", type=str, default=None)
@click_option("--output", type=click_Path(path_type=Path), default=Path("out.png"))
def render_cmd(
    lat: float | None,
    lon: float | None,
    place: str | None,
    when_raw: str,
    tz_name: str,
    projection: str,
    fisheye_strength: float,
    min_separation: float,
    magnitude_limit: float,
    glow: bool,
    glow_intensity: float,
    constellations: bool,
    constellation_labels: bool,
    shape_opt: str,
    title: str | None,
    output: Path,
) -> None:
    """Render a poster headlessly (png/svg/pdf chosen by --output suffix)."""
    from .utils.setup import setup_log

    settings: Settings = Settings()
    setup_log(settings.LOG)
    register_cached_fonts(settings.EPHEMERIS.CACHE_DIR)
    coords, display_place = resolve_coordinates(lat, lon, place, settings)
    moment: datetime = parse_when(when_raw)
    when_utc: datetime = utc_from_local(moment, tz_name)
    options: RenderOptions = RenderOptions(
        projection=Projection(projection),
        fisheye_strength=fisheye_strength,
        min_separation=min_separation,
        magnitude_limit=magnitude_limit,
        glow=glow,
        glow_intensity=glow_intensity,
        constellations=constellations,
        constellation_labels=constellation_labels,
        shape=Shape(shape_opt),
        title=(title.strip() if title and title.strip() else None),
    )
    size_px: int = settings.RENDER.SIZE_PX
    key: str = cache_key(
        coords.lat, coords.lon, display_place, when_utc, tz_name, options, size_px
    )
    cache_dir: Path = Path(settings.RENDER.CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached: Path = cache_dir / f"{key}.png"

    _, planets, timescale = load_ephemeris(settings.EPHEMERIS)
    catalog: pl_DataFrame = load_hipparcos(settings.EPHEMERIS)
    lines: pl_DataFrame = load_constellation_lines(settings.EPHEMERIS.CACHE_DIR)

    suffix: str = output.suffix.lower()
    if suffix == ".png" and cached.exists():
        from PIL.Image import open as pil_open

        pil_open(cached).save(output)
        click_echo(f"cache hit -> {output}")
        return

    from .astro.observer import format_local
    from .render.caption import format_caption
    from .render.constellations import (
        constellation_label_positions,
        project_constellation_lines,
    )
    from .render.figure import project_visible, tz_label

    if suffix in {".svg", ".pdf"}:
        projected: pl_DataFrame = project_visible(
            catalog, coords.lat, coords.lon, when_utc, options, planets, timescale
        )
        segments: pl_DataFrame = (
            project_constellation_lines(projected, lines)
            if constellations
            else projected.clear()
        )
        labels: pl_DataFrame = (
            constellation_label_positions(projected, lines)
            if constellations and constellation_labels
            else projected.clear()
        )
        caption_lines: list[str] = format_caption(
            coords.lat,
            coords.lon,
            display_place,
            format_local(when_utc, tz_name),
            tz_label(tz_name, when_utc),
            options.title,
        )
        export_vector(
            projected,
            segments,
            labels,
            caption_lines,
            options,
            settings.RENDER,
            size_px,
            output,
        )
    else:
        image: Any = render_sky_map(
            lat=coords.lat,
            lon=coords.lon,
            place=display_place,
            when_utc=when_utc,
            tz_name=tz_name,
            options=options,
            catalog=catalog,
            lines=lines,
            planets=planets,
            timescale=timescale,
            render_cfg=settings.RENDER,
            size_px=size_px,
        )
        export_image(image, output)
        image.save(cached)
    # Ensure UTC-aware echo even for naive inputs.
    _ = when_utc.astimezone(UTC)
    click_echo(f"rendered -> {output}")


@main.group(name="cache")
def cache_group() -> None:
    """Data-cache commands."""


@cache_group.command(name="warm")
def cache_warm() -> None:
    """Predownload ephemeris + catalog + constellation data."""
    from .utils.setup import setup_log

    settings: Settings = Settings()
    setup_log(settings.LOG)
    stats: dict[str, int] = warm_caches(settings)
    click_echo(f"warmed: {stats['stars']} stars, {stats['segments']} segments")


@main.command(name="export-static-data")
@click_option("--mag-limit", type=float, default=6.5, show_default=True)
@click_option(
    "--output-dir",
    type=click_Path(path_type=Path),
    default=Path("site/public/data"),
    show_default=True,
)
def export_static_data(mag_limit: float, output_dir: Path) -> None:
    """Export trimmed catalog + constellation JSON for the static viewer."""
    from json import dumps as json_dumps

    from .utils.setup import setup_log

    settings: Settings = Settings()
    setup_log(settings.LOG)
    catalog: pl_DataFrame = load_hipparcos(settings.EPHEMERIS)
    lines: pl_DataFrame = load_constellation_lines(settings.EPHEMERIS.CACHE_DIR)
    stars: list[list[float]] = [
        [float(hip), float(ra), float(dec), float(mag)]
        for hip, ra, dec, mag in catalog.filter(pl_col("mag") <= mag_limit)
        .select("hip", "ra_deg", "dec_deg", "mag")
        .iter_rows()
    ]
    segments: list[list[object]] = [
        [abbr, name, int(hip_a), int(hip_b)]
        for abbr, name, hip_a, hip_b in lines.select(
            "abbr", "name", "hip_a", "hip_b"
        ).iter_rows()
    ]
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "catalog.json").write_text(
        json_dumps({"stars": stars}), encoding="utf-8"
    )
    (output_dir / "constellations.json").write_text(
        json_dumps({"segments": segments}), encoding="utf-8"
    )
    click_echo(f"exported {len(stars)} stars, {len(segments)} segments -> {output_dir}")
