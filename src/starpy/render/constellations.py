"""Constellation overlay join: HIP line pairs -> projected segments (pure)."""

from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import String as pl_String
from polars import col as pl_col
from polars import concat as pl_concat


def project_constellation_lines(
    projected: pl_DataFrame,
    lines: pl_DataFrame,
) -> pl_DataFrame:
    """Join ``lines(abbr, name, hip_a, hip_b)`` to ``projected(hip, x, y)``.

    Returns ``(abbr, name, x_a, y_a, x_b, y_b)`` for segments whose BOTH
    endpoints are visible. Missing endpoints are dropped (no crash).
    """
    left: pl_DataFrame = (
        projected.select(
            pl_col("hip"), pl_col("x").alias("x_a"), pl_col("y").alias("y_a")
        )
        if set(projected.columns) >= {"hip", "x", "y"}
        else pl_DataFrame(
            {"hip": [], "x_a": [], "y_a": []},
            schema={"hip": pl_Int64, "x_a": pl_Float64, "y_a": pl_Float64},
        )
    )
    right: pl_DataFrame = (
        projected.select(
            pl_col("hip"), pl_col("x").alias("x_b"), pl_col("y").alias("y_b")
        )
        if set(projected.columns) >= {"hip", "x", "y"}
        else pl_DataFrame(
            {"hip": [], "x_b": [], "y_b": []},
            schema={"hip": pl_Int64, "x_b": pl_Float64, "y_b": pl_Float64},
        )
    )
    return (
        lines.join(left, left_on="hip_a", right_on="hip", how="inner")
        .join(right, left_on="hip_b", right_on="hip", how="inner")
        .select("abbr", "name", "x_a", "y_a", "x_b", "y_b")
        # Joins do not guarantee row order: sort so renders are deterministic.
        .sort(["abbr", "x_a", "y_a", "x_b", "y_b"])
    )


def constellation_label_positions(
    projected: pl_DataFrame,
    lines: pl_DataFrame,
) -> pl_DataFrame:
    """Centroid per constellation over its VISIBLE member stars.

    Returns ``(abbr, name, x, y)``. Constellations with no visible members
    are omitted.
    """
    members: pl_DataFrame = pl_concat(
        [
            lines.select(pl_col("abbr"), pl_col("name"), pl_col("hip_a").alias("hip")),
            lines.select(pl_col("abbr"), pl_col("name"), pl_col("hip_b").alias("hip")),
        ]
    ).unique()
    visible: pl_DataFrame = members.join(
        projected.select("hip", "x", "y"), on="hip", how="inner"
    )
    if visible.is_empty():
        return pl_DataFrame(
            {"abbr": [], "name": [], "x": [], "y": []},
            schema={
                "abbr": pl_String,
                "name": pl_String,
                "x": pl_Float64,
                "y": pl_Float64,
            },
        )
    return (
        visible.group_by(["abbr", "name"])
        .agg(pl_col("x").mean().alias("x"), pl_col("y").mean().alias("y"))
        # group_by row order is nondeterministic: sort so renders are stable.
        .sort("abbr")
    )
