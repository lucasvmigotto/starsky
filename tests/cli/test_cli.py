"""CLI tests (pipeline stubbed, isolated filesystem)."""

from pathlib import Path
from typing import Any

from click.testing import CliRunner
from PIL.Image import new as pil_new
from PIL.Image import open as pil_open
from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import String as pl_String

from starpy.cli import main


def _stub_pipeline(monkeypatch: Any, tmp_path: Path) -> None:
    fake_catalog: pl_DataFrame = pl_DataFrame(
        {"hip": [1], "ra_deg": [10.0], "dec_deg": [20.0], "mag": [1.0]},
        schema={
            "hip": pl_Int64,
            "ra_deg": pl_Float64,
            "dec_deg": pl_Float64,
            "mag": pl_Float64,
        },
    )
    fake_lines: pl_DataFrame = pl_DataFrame(
        {"abbr": [], "name": [], "hip_a": [], "hip_b": []},
        schema={
            "abbr": pl_String,
            "name": pl_String,
            "hip_a": pl_Int64,
            "hip_b": pl_Int64,
        },
    )
    monkeypatch.setattr(
        "starpy.cli.load_ephemeris", lambda settings: (None, None, None)
    )
    monkeypatch.setattr("starpy.cli.load_hipparcos", lambda settings: fake_catalog)
    monkeypatch.setattr("starpy.cli.load_constellation_lines", lambda cache: fake_lines)
    monkeypatch.setattr(
        "starpy.cli.render_sky_map", lambda **kwargs: pil_new("RGBA", (16, 16))
    )
    monkeypatch.setenv("STARPY__RENDER__CACHE_DIR", str(tmp_path / "renders"))


def test_render_help(runner: CliRunner | None = None) -> None:
    active: CliRunner = runner or CliRunner()
    result: Any = active.invoke(main, ["render", "--help"])
    assert result.exit_code == 0
    assert "--magnitude-limit" in result.output


def test_render_coordinates_png(monkeypatch: Any, tmp_path: Path) -> None:
    _stub_pipeline(monkeypatch, tmp_path)
    runner: CliRunner = CliRunner()
    output: Path = tmp_path / "out.png"
    result: Any = runner.invoke(
        main,
        [
            "render",
            "--lat",
            "40.758",
            "--lon",
            "-73.9855",
            "--when",
            "2026-01-01T00:00",
            "--tz",
            "UTC",
            "--shape",
            "square",
            "--output",
            str(output),
        ],
    )
    assert result.exit_code == 0, result.output
    assert output.exists()
    pil_open(output).verify()


def test_render_requires_location(monkeypatch: Any, tmp_path: Path) -> None:
    _stub_pipeline(monkeypatch, tmp_path)
    runner: CliRunner = CliRunner()
    result: Any = runner.invoke(main, ["render", "--when", "2026-01-01T00:00"])
    assert result.exit_code != 0
