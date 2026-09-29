"""Golden poster hash — the pinned CLI render (refactor Slice 0).

Pins a deterministic CLI poster for one fixed fixture so a later change to the
renderer (or a parity flip) is a visible, reviewed diff. Projects a *fixed*
sky (no ephemeris, no network): the golden guards the compose/render half of
the pipeline, which is what the browser renderer must match.

Regenerate deliberately with ``STARPY_UPDATE_GOLDEN=1``.
"""

from hashlib import sha256 as hashlib_sha256
from os import environ as os_environ
from pathlib import Path

from PIL.Image import Image as pil_Image
from polars import DataFrame as pl_DataFrame
from pytest import mark as pytest_mark
from pytest import skip as pytest_skip

from starpy.render.caption import format_caption
from starpy.render.figure import CAPTION_BAND_FRACTION, compose_figure, figure_to_pil
from starpy.schemas.inputs.render import RenderOptions
from starpy.settings.render import RenderSettings

GOLDEN_DIR: Path = Path(__file__).resolve().parent
FIXTURE_SIZE_PX: int = 320

GOLDEN_CAPTION: list[str] = format_caption(
    40.7580,
    -73.9855,
    "Times Square",
    "2026-01-01 00:00",
    "UTC (UTC+00:00)",
    "Golden Night",
)


def _render_golden(render_options: RenderOptions) -> pil_Image:
    """Compose the fixed sky and rasterise it (no ephemeris, no network)."""
    segments: pl_DataFrame = pl_DataFrame(
        {
            "abbr": ["TST", "TST"],
            "name": ["Test", "Test"],
            "x_a": [-0.3, 0.1],
            "y_a": [0.4, 0.05],
            "x_b": [0.0, 0.0],
            "y_b": [0.0, 0.0],
        }
    )
    labels: pl_DataFrame = pl_DataFrame(
        {"abbr": ["TST"], "name": ["Test"], "x": [0.05], "y": [0.1]}
    )
    cfg: RenderSettings = RenderSettings()
    fig = compose_figure(
        _golden_projected(),
        segments,
        labels,
        GOLDEN_CAPTION,
        render_options,
        cfg,
        FIXTURE_SIZE_PX,
    )
    band_px: int = int(FIXTURE_SIZE_PX * CAPTION_BAND_FRACTION)
    return figure_to_pil(fig, render_options.shape, FIXTURE_SIZE_PX, band_px)


def _golden_projected() -> pl_DataFrame:
    """A fixed three-star unit-disc sky (matches tiny_projected plus sizes)."""
    return pl_DataFrame(
        {
            "hip": [1, 2, 3],
            "x": [0.0, 0.1, -0.3],
            "y": [0.0, 0.05, 0.4],
            "mag": [0.5, 1.0, 2.5],
        }
    )


def _golden_options() -> RenderOptions:
    return RenderOptions(
        magnitude_limit=8.0,
        min_separation=0.0,
        glow=True,
        constellations=True,
        constellation_labels=True,
        shape="square",
        title="Golden Night",
    )


@pytest_mark.golden
def test_golden_poster_hash() -> None:
    """The fixed-sky poster hashes to the pinned value."""
    rendered: pil_Image = _render_golden(_golden_options())
    digest: str = hashlib_sha256(rendered.tobytes()).hexdigest()
    golden: Path = GOLDEN_DIR / "tiny_poster.sha256"

    if os_environ.get("STARPY_UPDATE_GOLDEN") == "1":
        golden.write_text(f"{digest}\n", encoding="utf-8")
        pytest_skip(f"updated golden: {digest}")

    assert golden.exists(), (
        f"missing {golden}; run with STARPY_UPDATE_GOLDEN=1 to create it"
    )
    assert digest == golden.read_text(encoding="utf-8").strip()


@pytest_mark.golden
def test_golden_poster_is_deterministic() -> None:
    """Rendering the same fixed sky twice is byte-identical."""
    assert (
        _render_golden(_golden_options()).tobytes()
        == _render_golden(_golden_options()).tobytes()
    )
