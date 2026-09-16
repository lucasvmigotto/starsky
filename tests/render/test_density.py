"""Density declutter tests (determinism + brightest-kept)."""

import numpy as np
import polars as pl

from starpy.render.density import declutter


def test_keeps_brightest_within_separation(tiny_projected: pl.DataFrame) -> None:
    # Hips 1 (mag 0.5) and 2 (mag 1.0) are ~0.11 apart; sep 0.2 drops hip 2.
    result: pl.DataFrame = declutter(tiny_projected, 0.2)
    assert result.get_column("hip").to_list() == [1, 3]


def test_zero_separation_passthrough(tiny_projected: pl.DataFrame) -> None:
    result: pl.DataFrame = declutter(tiny_projected, 0.0)
    assert result.height == tiny_projected.height


def test_empty_passthrough() -> None:
    empty: pl.DataFrame = pl.DataFrame(
        {"hip": [], "x": [], "y": [], "mag": []},
        schema={"hip": pl.Int64, "x": pl.Float64, "y": pl.Float64, "mag": pl.Float64},
    )
    assert declutter(empty, 0.01).is_empty()


def test_determinism_under_shuffle() -> None:
    rng: np.random.Generator = np.random.default_rng(7)
    n: int = 200
    df: pl.DataFrame = pl.DataFrame(
        {
            "hip": list(range(n)),
            "x": rng.uniform(-1, 1, n).tolist(),
            "y": rng.uniform(-1, 1, n).tolist(),
            "mag": rng.uniform(0, 6, n).tolist(),
        }
    )
    first: list[int] = declutter(df, 0.05).get_column("hip").to_list()
    shuffled: pl.DataFrame = df.sample(fraction=1.0, shuffle=True, seed=99)
    second: list[int] = declutter(shuffled, 0.05).get_column("hip").to_list()
    assert sorted(first) == sorted(second)
