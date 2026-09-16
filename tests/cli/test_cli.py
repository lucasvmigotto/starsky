"""CLI tests (pipeline stubbed, isolated filesystem)."""

from pathlib import Path
from typing import Any

import polars as pl
from click.testing import CliRunner
from PIL import Image

from starpy.cli import main


def _stub_pipeline(monkeypatch: Any, tmp_path: Path) -> None:
    import starpy.cli as cli_module

    fake_catalog: pl.DataFrame = pl.DataFrame(
        {"hip": [1], "ra_deg": [10.0], "dec_deg": [20.0], "mag": [1.0]},
        schema={
            "hip": pl.Int64,
            "ra_deg": pl.Float64,
            "dec_deg": pl.Float64,
            "mag": pl.Float64,
        },
    )
    fake_lines: pl.DataFrame = pl.DataFrame(
        {"abbr": [], "name": [], "hip_a": [], "hip_b": []},
        schema={
            "abbr": pl.String,
            "name": pl.String,
            "hip_a": pl.Int64,
            "hip_b": pl.Int64,
        },
    )
    monkeypatch.setattr(
        cli_module, "load_ephemeris", lambda settings: (None, None, None)
    )
    monkeypatch.setattr(cli_module, "load_hipparcos", lambda settings: fake_catalog)
    monkeypatch.setattr(
        cli_module, "load_constellation_lines", lambda cache: fake_lines
    )
    monkeypatch.setattr(
        cli_module, "render_sky_map", lambda **kwargs: Image.new("RGBA", (16, 16))
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
    Image.open(output).verify()


def test_render_requires_location(monkeypatch: Any, tmp_path: Path) -> None:
    _stub_pipeline(monkeypatch, tmp_path)
    runner: CliRunner = CliRunner()
    result: Any = runner.invoke(main, ["render", "--when", "2026-01-01T00:00"])
    assert result.exit_code != 0
