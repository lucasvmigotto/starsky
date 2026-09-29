"""Shared fixtures (no network)."""

from pathlib import Path

from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import String as pl_String

# NOTE: bare `fixture` (not the pytest_ alias): pluggy scans conftest.py
# for pytest_* hooks, so the aliased name breaks collection.
from pytest import fixture


@fixture()
def tiny_catalog() -> pl_DataFrame:
    """5 bright fake stars (hip, ra_deg, dec_deg, mag), mag-sorted."""
    return pl_DataFrame(
        {
            "hip": [1, 2, 3, 4, 5],
            "ra_deg": [10.0, 10.001, 50.0, 200.0, 300.0],
            "dec_deg": [20.0, 20.001, -10.0, 45.0, -45.0],
            "mag": [0.5, 1.0, 2.5, 4.0, 5.5],
        },
        schema={
            "hip": pl_Int64,
            "ra_deg": pl_Float64,
            "dec_deg": pl_Float64,
            "mag": pl_Float64,
        },
    )


@fixture()
def tiny_lines() -> pl_DataFrame:
    return pl_DataFrame(
        {
            "abbr": ["TST", "TST", "TST"],
            "name": ["Test", "Test", "Test"],
            "hip_a": [1, 2, 2],
            "hip_b": [2, 3, 999],
        },
        schema={
            "abbr": pl_String,
            "name": pl_String,
            "hip_a": pl_Int64,
            "hip_b": pl_Int64,
        },
    )


@fixture()
def catalog_cache_dir(tmp_path: Path) -> Path:
    """An isolated catalog cache dir for tests that write parquet."""
    return tmp_path / "catalog"
