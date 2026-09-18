"""Shared fixtures (no network, no ephemeris downloads)."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import String as pl_String

# NOTE: bare `fixture` (not the pytest_ alias): pluggy scans conftest.py
# for pytest_* hooks, so the aliased name breaks collection.
from pytest import fixture


@fixture()
def fixed_utc() -> datetime:
    return datetime(2026, 1, 1, 0, 0, tzinfo=UTC)


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
def tiny_projected() -> pl_DataFrame:
    return pl_DataFrame(
        {
            "hip": [1, 2, 3],
            "x": [0.0, 0.1, -0.3],
            "y": [0.0, 0.05, 0.4],
            "mag": [0.5, 1.0, 2.5],
        },
        schema={"hip": pl_Int64, "x": pl_Float64, "y": pl_Float64, "mag": pl_Float64},
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
def tmp_geocoding_settings(tmp_path: Path) -> Any:
    from starpy.settings import GeocodingSettings

    return GeocodingSettings(
        USER_AGENT="starpy-tests/0.1.0 (tests@example.com)",
        RATE_LIMIT_S=0.0,
        CACHE_PATH=tmp_path / "geocode.json",
    )
