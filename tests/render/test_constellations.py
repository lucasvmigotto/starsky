"""Constellation join + label tests."""

from typing import Any

from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64

from starpy.render.constellations import (
    constellation_label_positions,
    project_constellation_lines,
)


def test_join_drops_invisible_endpoints(
    tiny_projected: pl_DataFrame, tiny_lines: pl_DataFrame
) -> None:
    # tiny_lines has (1,2), (2,3) visible and (2,999) with hip 999 missing.
    segments: pl_DataFrame = project_constellation_lines(tiny_projected, tiny_lines)
    assert segments.height == 2
    assert set(segments.columns) == {"abbr", "name", "x_a", "y_a", "x_b", "y_b"}


def test_label_centroid(tiny_projected: pl_DataFrame, tiny_lines: pl_DataFrame) -> None:
    labels: pl_DataFrame = constellation_label_positions(tiny_projected, tiny_lines)
    assert labels.height == 1
    rows: list[dict[str, Any]] = labels.to_dicts()
    row: dict[str, Any] = rows[0]
    assert row["abbr"] == "TST"
    assert abs(float(row["x"]) - (0.0 + 0.1 + -0.3) / 3) < 1e-9


def test_no_visible_members_omitted(tiny_lines: pl_DataFrame) -> None:
    empty: pl_DataFrame = pl_DataFrame(
        {"hip": [], "x": [], "y": [], "mag": []},
        schema={"hip": pl_Int64, "x": pl_Float64, "y": pl_Float64, "mag": pl_Float64},
    )
    assert constellation_label_positions(empty, tiny_lines).is_empty()
    assert project_constellation_lines(empty, tiny_lines).is_empty()
