"""Constellation overlay join: HIP line pairs -> projected segments (pure)."""

import polars as pl


def project_constellation_lines(
    projected: pl.DataFrame,
    lines: pl.DataFrame,
) -> pl.DataFrame:
    """Join ``lines(abbr, name, hip_a, hip_b)`` to ``projected(hip, x, y)``.

    Returns ``(abbr, name, x_a, y_a, x_b, y_b)`` for segments whose BOTH
    endpoints are visible. Missing endpoints are dropped (no crash).
    """
    left: pl.DataFrame = (
        projected.select(
            pl.col("hip"), pl.col("x").alias("x_a"), pl.col("y").alias("y_a")
        )
        if set(projected.columns) >= {"hip", "x", "y"}
        else pl.DataFrame(
            {"hip": [], "x_a": [], "y_a": []},
            schema={"hip": pl.Int64, "x_a": pl.Float64, "y_a": pl.Float64},
        )
    )
    right: pl.DataFrame = (
        projected.select(
            pl.col("hip"), pl.col("x").alias("x_b"), pl.col("y").alias("y_b")
        )
        if set(projected.columns) >= {"hip", "x", "y"}
        else pl.DataFrame(
            {"hip": [], "x_b": [], "y_b": []},
            schema={"hip": pl.Int64, "x_b": pl.Float64, "y_b": pl.Float64},
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
    projected: pl.DataFrame,
    lines: pl.DataFrame,
) -> pl.DataFrame:
    """Centroid per constellation over its VISIBLE member stars.

    Returns ``(abbr, name, x, y)``. Constellations with no visible members
    are omitted.
    """
    members: pl.DataFrame = pl.concat(
        [
            lines.select(pl.col("abbr"), pl.col("name"), pl.col("hip_a").alias("hip")),
            lines.select(pl.col("abbr"), pl.col("name"), pl.col("hip_b").alias("hip")),
        ]
    ).unique()
    visible: pl.DataFrame = members.join(
        projected.select("hip", "x", "y"), on="hip", how="inner"
    )
    if visible.is_empty():
        return pl.DataFrame(
            {"abbr": [], "name": [], "x": [], "y": []},
            schema={
                "abbr": pl.String,
                "name": pl.String,
                "x": pl.Float64,
                "y": pl.Float64,
            },
        )
    return (
        visible.group_by(["abbr", "name"])
        .agg(pl.col("x").mean().alias("x"), pl.col("y").mean().alias("y"))
        # group_by row order is nondeterministic: sort so renders are stable.
        .sort("abbr")
    )
