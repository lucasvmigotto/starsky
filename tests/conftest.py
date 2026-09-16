"""Shared fixtures (no network, no ephemeris downloads)."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import polars as pl
import pytest


@pytest.fixture()
def fixed_utc() -> datetime:
    return datetime(2026, 1, 1, 0, 0, tzinfo=UTC)


@pytest.fixture()
def tiny_catalog() -> pl.DataFrame:
    """5 bright fake stars (hip, ra_deg, dec_deg, mag), mag-sorted."""
    return pl.DataFrame(
        {
            "hip": [1, 2, 3, 4, 5],
            "ra_deg": [10.0, 10.001, 50.0, 200.0, 300.0],
            "dec_deg": [20.0, 20.001, -10.0, 45.0, -45.0],
            "mag": [0.5, 1.0, 2.5, 4.0, 5.5],
        },
        schema={
            "hip": pl.Int64,
            "ra_deg": pl.Float64,
            "dec_deg": pl.Float64,
            "mag": pl.Float64,
        },
    )


@pytest.fixture()
def tiny_projected() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "hip": [1, 2, 3],
            "x": [0.0, 0.1, -0.3],
            "y": [0.0, 0.05, 0.4],
            "mag": [0.5, 1.0, 2.5],
        },
        schema={"hip": pl.Int64, "x": pl.Float64, "y": pl.Float64, "mag": pl.Float64},
    )


@pytest.fixture()
def tiny_lines() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "abbr": ["TST", "TST", "TST"],
            "name": ["Test", "Test", "Test"],
            "hip_a": [1, 2, 2],
            "hip_b": [2, 3, 999],
        },
        schema={
            "abbr": pl.String,
            "name": pl.String,
            "hip_a": pl.Int64,
            "hip_b": pl.Int64,
        },
    )


@pytest.fixture()
def tmp_geocoding_settings(tmp_path: Path) -> Any:
    from starpy.settings import GeocodingSettings

    return GeocodingSettings(
        USER_AGENT="starpy-tests/0.1.0 (tests@example.com)",
        RATE_LIMIT_S=0.0,
        CACHE_PATH=tmp_path / "geocode.json",
    )
