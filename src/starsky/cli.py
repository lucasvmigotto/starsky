"""CLI: prepare the sky data the browser consumes.

The browser is the product's only renderer (BCR-0005); this CLI builds the two
JSON files it fetches (`catalog.json`, `constellations.json`) and warms the
local caches. It opens no socket and renders nothing.
"""

from json import dumps as json_dumps
from pathlib import Path

from click import Context as click_Context
from click import Path as click_Path
from click import echo as click_echo
from click import group as click_group
from click import option as click_option
from click import pass_context as click_pass_context
from polars import DataFrame as pl_DataFrame
from polars import col as pl_col

from .data.catalog import load_hipparcos
from .data.constellations import load_constellation_lines
from .settings import Settings
from .utils.setup import setup_log


def warm_caches(settings: Settings) -> dict[str, int]:
    """Download and cache the star catalog and constellation lines."""
    catalog: pl_DataFrame = load_hipparcos(settings.CATALOG)
    lines: pl_DataFrame = load_constellation_lines(settings.CATALOG.CACHE_DIR)
    return {"stars": catalog.height, "segments": lines.height}


def build_static_data(
    mag_limit: float,
    output_dir: Path,
    settings: Settings,
) -> dict[str, int]:
    """Write ``catalog.json`` and ``constellations.json`` for the browser."""
    catalog: pl_DataFrame = load_hipparcos(settings.CATALOG)
    lines: pl_DataFrame = load_constellation_lines(settings.CATALOG.CACHE_DIR)
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
    return {"stars": len(stars), "segments": len(segments)}


@click_group(invoke_without_command=True)
@click_pass_context
def main(ctx: click_Context) -> None:
    """starsky: build the sky data the browser app consumes."""
    if ctx.invoked_subcommand is None:
        click_echo(ctx.get_help())


@main.command(name="catalog")
@click_option("--mag-limit", type=float, default=6.5, show_default=True)
@click_option(
    "--output-dir",
    type=click_Path(path_type=Path),
    default=Path("site/public/data"),
    show_default=True,
)
def catalog_cmd(mag_limit: float, output_dir: Path) -> None:
    """Export the star catalog + constellation lines as JSON for the site."""
    settings: Settings = Settings()
    setup_log(settings.LOG)
    counts: dict[str, int] = build_static_data(mag_limit, output_dir, settings)
    click_echo(
        f"exported {counts['stars']} stars, {counts['segments']} segments "
        f"-> {output_dir}"
    )


@main.group(name="cache")
def cache_group() -> None:
    """Data-cache commands."""


@cache_group.command(name="warm")
def cache_warm() -> None:
    """Download the star catalog and constellation lines into the cache."""
    settings: Settings = Settings()
    setup_log(settings.LOG)
    counts: dict[str, int] = warm_caches(settings)
    click_echo(f"warmed: {counts['stars']} stars, {counts['segments']} segments")
