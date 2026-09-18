"""Density declutter tests (determinism + brightest-kept)."""

from numpy.random import Generator as nprandom_Generator
from numpy.random import default_rng as nprandom_default_rng
from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64

from starpy.render.density import declutter


def test_keeps_brightest_within_separation(tiny_projected: pl_DataFrame) -> None:
    # Hips 1 (mag 0.5) and 2 (mag 1.0) are ~0.11 apart; sep 0.2 drops hip 2.
    result: pl_DataFrame = declutter(tiny_projected, 0.2)
    assert result.get_column("hip").to_list() == [1, 3]


def test_zero_separation_passthrough(tiny_projected: pl_DataFrame) -> None:
    result: pl_DataFrame = declutter(tiny_projected, 0.0)
    assert result.height == tiny_projected.height


def test_empty_passthrough() -> None:
    empty: pl_DataFrame = pl_DataFrame(
        {"hip": [], "x": [], "y": [], "mag": []},
        schema={"hip": pl_Int64, "x": pl_Float64, "y": pl_Float64, "mag": pl_Float64},
    )
    assert declutter(empty, 0.01).is_empty()


def test_determinism_under_shuffle() -> None:
    rng: nprandom_Generator = nprandom_default_rng(7)
    n: int = 200
    df: pl_DataFrame = pl_DataFrame(
        {
            "hip": list(range(n)),
            "x": rng.uniform(-1, 1, n).tolist(),
            "y": rng.uniform(-1, 1, n).tolist(),
            "mag": rng.uniform(0, 6, n).tolist(),
        }
    )
    first: list[int] = declutter(df, 0.05).get_column("hip").to_list()
    shuffled: pl_DataFrame = df.sample(fraction=1.0, shuffle=True, seed=99)
    second: list[int] = declutter(shuffled, 0.05).get_column("hip").to_list()
    assert sorted(first) == sorted(second)
