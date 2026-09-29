"""Poster figure composition: the single renderer shared by CLI + Gradio.

Pipeline: filter by magnitude -> alt/az (Skyfield) -> project -> declutter ->
matplotlib composition (stars + scatter halo approximating Gaussian bloom +
constellation lines/labels + caption) -> PIL image (raster) or native
vector export (SVG/PDF).

No duplicated rendering logic lives in entry points; they only resolve
params and call :func:`render_sky_map`.
"""

from datetime import datetime
from hashlib import sha256 as hashlib_sha256
from io import BytesIO as io_BytesIO
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from matplotlib import use as matplotlib_use
from matplotlib.collections import LineCollection
from matplotlib.figure import Figure
from PIL.Image import Image as pil_Image
from PIL.Image import Resampling as pil_Resampling
from PIL.Image import fromarray as pil_fromarray
from PIL.Image import open as pil_open
from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import Series as pl_Series
from polars import String as pl_String
from polars import col as pl_col

from ..astro.observer import format_local
from ..astro.positions import altaz_for_stars
from ..astro.projection import fisheye, stereographic
from ..schemas.inputs.render import RenderOptions
from ..settings import RenderSettings
from .caption import format_caption
from .constellations import constellation_label_positions, project_constellation_lines
from .density import declutter
from .glow import star_size
from .mask import circle_alpha

matplotlib_use("Agg")
from matplotlib.patches import Circle  # noqa: E402
from matplotlib.pyplot import close as plt_close
from matplotlib.pyplot import figure as plt_figure
from matplotlib.pyplot import rcParams as plt_rcParams

FONT_STACK: list[str] = ["Cormorant Garamond"]
CAPTION_BAND_FRACTION: float = 0.22


def tz_label(tz_name: str, when_utc: datetime) -> str:
    """Human timezone label, e.g. ``UTC+00:00`` or ``America/New_York (UTC-05:00)``."""
    offset: Any = when_utc.astimezone(ZoneInfo(tz_name)).utcoffset()
    total_min: int = int(offset.total_seconds() // 60) if offset is not None else 0
    sign: str = "+" if total_min >= 0 else "-"
    label: str = f"UTC{sign}{abs(total_min) // 60:02d}:{abs(total_min) % 60:02d}"
    if tz_name == "UTC":
        return label
    return f"{tz_name} ({label})"


def project_visible(
    catalog: pl_DataFrame,
    lat: float,
    lon: float,
    when_utc: datetime,
    options: RenderOptions,
    planets: Any,
    timescale: Any,
) -> pl_DataFrame:
    """Filter + locate + project the visible stars -> (hip, x, y, mag)."""
    bright: pl_DataFrame = catalog.filter(pl_col("mag") <= options.magnitude_limit)
    if bright.is_empty():
        return pl_DataFrame(
            {"hip": [], "x": [], "y": [], "mag": []},
            schema={
                "hip": pl_Int64,
                "x": pl_Float64,
                "y": pl_Float64,
                "mag": pl_Float64,
            },
        )
    located: pl_DataFrame = altaz_for_stars(
        bright, lat, lon, when_utc, planets, timescale
    )
    above: pl_DataFrame = located.filter(pl_col("alt_deg") > 0.0)
    if above.is_empty():
        return pl_DataFrame(
            {"hip": [], "x": [], "y": [], "mag": []},
            schema={
                "hip": pl_Int64,
                "x": pl_Float64,
                "y": pl_Float64,
                "mag": pl_Float64,
            },
        )
    alt: Any = above.get_column("alt_deg").to_numpy()
    az: Any = above.get_column("az_deg").to_numpy()
    x: Any
    y: Any
    if options.projection == "fisheye":
        x, y = fisheye(alt, az, strength=options.fisheye_strength)
    else:
        x, y = stereographic(alt, az)
    projected: pl_DataFrame = above.with_columns(
        pl_Series("x", x, dtype=pl_Float64), pl_Series("y", y, dtype=pl_Float64)
    ).select("hip", "x", "y", "mag")
    return declutter(projected, options.min_separation)


def compose_figure(
    projected: pl_DataFrame,
    segments: pl_DataFrame,
    labels: pl_DataFrame,
    caption_lines: list[str],
    options: RenderOptions,
    render_cfg: RenderSettings,
    size_px: int,
) -> Figure:
    """Compose the matplotlib poster figure (sky + ring + caption)."""
    dpi: int = render_cfg.DPI
    band_px: int = int(size_px * CAPTION_BAND_FRACTION)
    fig: Figure = plt_figure(
        figsize=(size_px / dpi, (size_px + band_px) / dpi), dpi=dpi
    )
    fig.patch.set_facecolor(render_cfg.BACKGROUND)
    plt_rcParams["font.family"] = FONT_STACK
    sky_height: float = size_px / (size_px + band_px)
    ax: Any = fig.add_axes((0.0, 1.0 - sky_height, 1.0, sky_height))
    ax.set_xlim(-1.06, 1.06)
    ax.set_ylim(-1.06, 1.06)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor(render_cfg.BACKGROUND)

    mags: Any = (
        projected.get_column("mag").to_numpy() if not projected.is_empty() else []
    )
    sizes: Any = star_size(mags) if len(mags) else []
    if len(mags):
        xs: Any = projected.get_column("x").to_numpy()
        ys: Any = projected.get_column("y").to_numpy()
        if options.glow and options.glow_intensity > 0.0:
            bright_mask: Any = projected.get_column("mag").to_numpy() < 3.5
            if bool(bright_mask.any()):
                ax.scatter(
                    xs[bright_mask],
                    ys[bright_mask],
                    s=sizes[bright_mask] ** 2 * 5.0 * options.glow_intensity,
                    c=[render_cfg.STAR_COLOR],
                    alpha=0.13 * min(options.glow_intensity, 2.0),
                    linewidths=0,
                )
        ax.scatter(
            xs,
            ys,
            s=sizes**2,
            c=[render_cfg.STAR_COLOR],
            alpha=0.95,
            linewidths=0,
            zorder=3,
        )

    if options.constellations and not segments.is_empty():
        segs: Any = segments.select("x_a", "y_a", "x_b", "y_b").to_numpy()
        collection: LineCollection = LineCollection(
            [[(row[0], row[1]), (row[2], row[3])] for row in segs],
            colors=[render_cfg.LINE_COLOR],
            linewidths=0.7,
            alpha=0.7,
            zorder=2,
        )
        ax.add_collection(collection)
        if options.constellation_labels and not labels.is_empty():
            for row in labels.iter_rows(named=True):
                ax.text(
                    row["x"],
                    row["y"],
                    str(row["name"]).upper(),
                    fontsize=7,
                    color=render_cfg.LINE_COLOR,
                    alpha=0.85,
                    ha="center",
                    va="center",
                    zorder=4,
                )

    if options.shape == "circle":
        ring: Circle = Circle(
            (0.0, 0.0), 1.0, fill=False, ec="#f5efe0", lw=2.0, alpha=0.9, zorder=5
        )
        ax.add_patch(ring)

    band_center: float = (1.0 - sky_height) / 2.0
    if len(caption_lines) == 2:
        fig.text(
            0.5,
            band_center + 0.018,
            caption_lines[0],
            ha="center",
            va="center",
            fontsize=17,
            color=render_cfg.STAR_COLOR,
            family="serif",
        )
        fig.text(
            0.5,
            band_center - 0.028,
            caption_lines[1],
            ha="center",
            va="center",
            fontsize=10.5,
            color=render_cfg.STAR_COLOR,
            family="serif",
            alpha=0.92,
        )
    else:
        fig.text(
            0.5,
            band_center,
            caption_lines[0],
            ha="center",
            va="center",
            fontsize=11,
            color=render_cfg.STAR_COLOR,
            family="serif",
            alpha=0.92,
        )
    return fig


def figure_to_pil(fig: Figure, shape: str, size_px: int, band_px: int) -> pil_Image:
    """Render ``fig`` canvas to RGBA PIL, applying circular alpha when needed."""
    buf: io_BytesIO = io_BytesIO()
    fig.savefig(buf, format="png", facecolor=fig.get_facecolor())
    plt_close(fig)
    buf.seek(0)
    image: pil_Image = pil_open(buf).convert("RGBA")
    if shape == "circle":
        from numpy import array as np_array
        from numpy import minimum as np_minimum

        width: int
        height: int
        width, height = image.size
        alpha: Any = circle_alpha(size_px)
        arr: Any = np_array(image)
        resized_mask: Any = np_array(
            pil_fromarray(alpha).resize((width, height), pil_Resampling.LANCZOS)
        )
        arr[:, :, 3] = np_minimum(arr[:, :, 3], resized_mask)
        image = pil_fromarray(arr)
    return image


def render_sky_map(
    lat: float,
    lon: float,
    place: str | None,
    when_utc: datetime,
    tz_name: str,
    options: RenderOptions,
    catalog: pl_DataFrame,
    lines: pl_DataFrame | None,
    planets: Any,
    timescale: Any,
    render_cfg: RenderSettings | None = None,
    size_px: int | None = None,
) -> pil_Image:
    """Render the poster sky map -> PIL image (single shared renderer)."""
    cfg: RenderSettings = render_cfg or RenderSettings()
    px: int = size_px or cfg.SIZE_PX
    projected: pl_DataFrame = project_visible(
        catalog, lat, lon, when_utc, options, planets, timescale
    )
    empty_lines: pl_DataFrame = pl_DataFrame(
        {"abbr": [], "name": [], "hip_a": [], "hip_b": []},
        schema={
            "abbr": pl_String,
            "name": pl_String,
            "hip_a": pl_Int64,
            "hip_b": pl_Int64,
        },
    )
    source_lines: pl_DataFrame = lines if lines is not None else empty_lines
    segments: pl_DataFrame = (
        project_constellation_lines(projected, source_lines)
        if options.constellations
        else pl_DataFrame(
            {"abbr": [], "name": [], "x_a": [], "y_a": [], "x_b": [], "y_b": []},
            schema={
                "abbr": pl_String,
                "name": pl_String,
                "x_a": pl_Float64,
                "y_a": pl_Float64,
                "x_b": pl_Float64,
                "y_b": pl_Float64,
            },
        )
    )
    labels: pl_DataFrame = (
        constellation_label_positions(projected, source_lines)
        if options.constellations and options.constellation_labels
        else pl_DataFrame(
            {"abbr": [], "name": [], "x": [], "y": []},
            schema={
                "abbr": pl_String,
                "name": pl_String,
                "x": pl_Float64,
                "y": pl_Float64,
            },
        )
    )
    caption_lines: list[str] = format_caption(
        lat,
        lon,
        place,
        format_local(when_utc, tz_name),
        tz_label(tz_name, when_utc),
        options.title,
    )
    fig: Figure = compose_figure(
        projected, segments, labels, caption_lines, options, cfg, px
    )
    band_px: int = int(px * CAPTION_BAND_FRACTION)
    return figure_to_pil(fig, options.shape, px, band_px)


def cache_key(
    lat: float,
    lon: float,
    place: str | None,
    when_utc: datetime,
    tz_name: str,
    options: RenderOptions,
    size_px: int,
) -> str:
    """Content hash of resolved params (doubles as render-cache filename)."""
    payload: str = "|".join(
        [
            f"{lat:.4f}",
            f"{lon:.4f}",
            place or "",
            when_utc.isoformat(),
            tz_name,
            options.model_dump_json(),
            str(size_px),
        ]
    )
    return hashlib_sha256(payload.encode("utf-8")).hexdigest()


def export_image(image: pil_Image, output: Path) -> Path:
    """Save ``image`` to ``output`` (png; svg/pdf are vector paths, see below)."""
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG")
    return output


def export_vector(
    projected: pl_DataFrame,
    segments: pl_DataFrame,
    labels: pl_DataFrame,
    caption_lines: list[str],
    options: RenderOptions,
    render_cfg: RenderSettings,
    size_px: int,
    output: Path,
) -> Path:
    """Native matplotlib SVG/PDF export (print-ready vector path)."""
    fig: Figure = compose_figure(
        projected, segments, labels, caption_lines, options, render_cfg, size_px
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, format=output.suffix.lstrip("."))
    plt_close(fig)
    return output
