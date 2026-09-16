"""Figure composition + cache-key tests (synthetic data, no ephemeris)."""

from datetime import UTC, datetime

import polars as pl
from matplotlib.figure import Figure
from PIL import Image

from starpy.render.figure import cache_key, compose_figure, figure_to_pil, tz_label
from starpy.schemas.inputs.render import RenderOptions
from starpy.settings import RenderSettings


def _segments() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "abbr": ["TST"],
            "name": ["Test"],
            "x_a": [0.0],
            "y_a": [0.0],
            "x_b": [0.1],
            "y_b": [0.05],
        },
        schema={
            "abbr": pl.String,
            "name": pl.String,
            "x_a": pl.Float64,
            "y_a": pl.Float64,
            "x_b": pl.Float64,
            "y_b": pl.Float64,
        },
    )


def _labels() -> pl.DataFrame:
    return pl.DataFrame(
        {"abbr": ["TST"], "name": ["Test"], "x": [0.05], "y": [0.02]},
        schema={"abbr": pl.String, "name": pl.String, "x": pl.Float64, "y": pl.Float64},
    )


def test_compose_figure_smoke(tiny_projected: pl.DataFrame) -> None:
    fig: Figure = compose_figure(
        tiny_projected,
        _segments(),
        _labels(),
        ["Title", "detail line"],
        RenderOptions(),
        RenderSettings(),
        320,
    )
    assert isinstance(fig, Figure)
    buf_size: int = 0
    import io

    buf: io.BytesIO = io.BytesIO()
    fig.savefig(buf, format="png")
    buf_size = len(buf.getvalue())
    assert buf_size > 1000
    plt_close(fig)


def plt_close(fig: Figure) -> None:
    import matplotlib.pyplot as plt

    plt.close(fig)


def test_figure_to_pil_circle_corners_transparent(tiny_projected: pl.DataFrame) -> None:
    fig: Figure = compose_figure(
        tiny_projected,
        _segments(),
        _labels(),
        ["detail"],
        RenderOptions(shape="circle"),
        RenderSettings(),
        320,
    )
    image: Image.Image = figure_to_pil(fig, "circle", 320, 70)
    assert image.mode == "RGBA"
    corner: object = image.getpixel((0, 0))
    assert isinstance(corner, tuple) and corner[3] == 0


def test_cache_key_deterministic() -> None:
    opts: RenderOptions = RenderOptions()
    when: datetime = datetime(2026, 1, 1, tzinfo=UTC)
    first: str = cache_key(40.758, -73.9855, "X", when, "UTC", opts, 1600)
    second: str = cache_key(40.758, -73.9855, "X", when, "UTC", opts, 1600)
    assert first == second and len(first) == 64
    other: str = cache_key(40.758, -73.9855, "Y", when, "UTC", opts, 1600)
    assert other != first


def test_tz_label_formats() -> None:
    when: datetime = datetime(2026, 1, 1, tzinfo=UTC)
    assert tz_label("UTC", when) == "UTC+00:00"
    ny: str = tz_label("America/New_York", when)
    assert "America/New_York" in ny and "UTC-05:00" in ny
