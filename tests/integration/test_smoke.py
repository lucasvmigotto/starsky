"""End-to-end smoke test with real ephemeris (needs network on first run).

Marked ``integration``: downloads de421.bsp (~17 MB), hip_main.dat (~13 MB)
and the IAU index (~135 KB) into a temp cache on first run, then reuses them.
"""

from datetime import UTC, datetime
from pathlib import Path

from numpy import array_equal as np_array_equal
from numpy import asarray as np_asarray
from numpy import unique as np_unique
from PIL.Image import Image as pil_Image
from polars import DataFrame as pl_DataFrame
from pytest import fixture as pytest_fixture
from pytest import mark as pytest_mark

from starpy.data.catalog import load_hipparcos
from starpy.data.constellations import load_constellation_lines
from starpy.render.figure import project_visible, render_sky_map
from starpy.schemas.inputs.render import RenderOptions
from starpy.settings import EphemerisSettings

from ._helpers import warm_ephemeris

pytestmark = pytest_mark.integration


@pytest_fixture()
def warmed(tmp_path: Path) -> tuple[EphemerisSettings, object, object, object]:
    return warm_ephemeris(tmp_path)


def test_full_render_deterministic(
    warmed: tuple[EphemerisSettings, object, object, object],
) -> None:
    settings, planets, timescale, tmp_path = warmed
    catalog: pl_DataFrame = load_hipparcos(settings)
    assert catalog.height > 90000
    lines: pl_DataFrame = load_constellation_lines(settings.CACHE_DIR)
    assert lines.height > 500
    options: RenderOptions = RenderOptions(
        magnitude_limit=4.5, min_separation=0.0, shape="square", title="Test Night"
    )
    when: datetime = datetime(2026, 1, 1, tzinfo=UTC)
    first: pil_Image = render_sky_map(
        40.7580,
        -73.9855,
        "Times Square",
        when,
        "UTC",
        options,
        catalog,
        lines,
        planets,
        timescale,
        size_px=320,
    )
    second: pil_Image = render_sky_map(
        40.7580,
        -73.9855,
        "Times Square",
        when,
        "UTC",
        options,
        catalog,
        lines,
        planets,
        timescale,
        size_px=320,
    )
    assert first.size == second.size
    assert np_array_equal(np_asarray(first), np_asarray(second))
    assert len(np_unique(np_asarray(first))) > 4  # sky + stars + caption


def test_project_visible_nonempty(
    warmed: tuple[EphemerisSettings, object, object, object],
) -> None:
    settings, planets, timescale, _ = warmed
    catalog: pl_DataFrame = load_hipparcos(settings).head(2000)
    projected: pl_DataFrame = project_visible(
        catalog,
        40.7580,
        -73.9855,
        datetime(2026, 1, 1, tzinfo=UTC),
        RenderOptions(magnitude_limit=6.0, min_separation=0.0),
        planets,
        timescale,
    )
    assert projected.height > 0
    assert (
        projected.get_column("x") ** 2 + projected.get_column("y") ** 2 <= 1.01
    ).all()
