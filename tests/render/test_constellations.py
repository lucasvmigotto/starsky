"""Constellation join + label tests."""

from typing import Any

import polars as pl

from starpy.render.constellations import (
    constellation_label_positions,
    project_constellation_lines,
)


def test_join_drops_invisible_endpoints(
    tiny_projected: pl.DataFrame, tiny_lines: pl.DataFrame
) -> None:
    # tiny_lines has (1,2), (2,3) visible and (2,999) with hip 999 missing.
    segments: pl.DataFrame = project_constellation_lines(tiny_projected, tiny_lines)
    assert segments.height == 2
    assert set(segments.columns) == {"abbr", "name", "x_a", "y_a", "x_b", "y_b"}


def test_label_centroid(tiny_projected: pl.DataFrame, tiny_lines: pl.DataFrame) -> None:
    labels: pl.DataFrame = constellation_label_positions(tiny_projected, tiny_lines)
    assert labels.height == 1
    rows: list[dict[str, Any]] = labels.to_dicts()
    row: dict[str, Any] = rows[0]
    assert row["abbr"] == "TST"
    assert abs(float(row["x"]) - (0.0 + 0.1 + -0.3) / 3) < 1e-9


def test_no_visible_members_omitted(tiny_lines: pl.DataFrame) -> None:
    empty: pl.DataFrame = pl.DataFrame(
        {"hip": [], "x": [], "y": [], "mag": []},
        schema={"hip": pl.Int64, "x": pl.Float64, "y": pl.Float64, "mag": pl.Float64},
    )
    assert constellation_label_positions(empty, tiny_lines).is_empty()
    assert project_constellation_lines(empty, tiny_lines).is_empty()
