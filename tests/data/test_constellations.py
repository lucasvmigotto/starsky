"""Stellarium IAU index parser tests (no network)."""

from pathlib import Path
from typing import Any

from polars import DataFrame as pl_DataFrame
from polars import Int64 as pl_Int64
from polars import String as pl_String

from starsky.data.constellations import (
    STAR_NAMES_PARQUET_NAME,
    load_star_names,
    parse_iau_index,
    parse_star_names,
)


def test_polyline_pairs() -> None:
    payload: dict[str, Any] = {
        "constellations": [
            {
                "id": "CON modern_iau And",
                "lines": [[677, 3092, 5447], [113, 114]],
                "common_name": {"native": "Andromeda"},
            }
        ]
    }
    df: pl_DataFrame = parse_iau_index(payload)
    assert df.height == 3  # (677,3092), (3092,5447), (113,114)
    assert df.get_column("abbr").to_list() == ["And", "And", "And"]
    assert df.get_column("name").to_list() == ["Andromeda"] * 3
    assert df.row(0) == ("And", "Andromeda", 677, 3092)


def test_empty_payload() -> None:
    df: pl_DataFrame = parse_iau_index({"constellations": []})
    assert df.is_empty()


def test_star_names_keep_only_hip_keys() -> None:
    payload: dict[str, Any] = {
        "common_names": {
            "HIP 32349": [{"native": "Sirius", "english": "Dog Star"}],
            "HIP 677": [{"native": "Alpheratz"}],
            "HIP 11767": [{"english": "North Star", "native": "Polaris"}],
            "Gaia DR3 123": [{"native": "Gaia name"}],
            "NAME Foo": [{"native": "Other"}],
            "HIP abc": [{"native": "Bad key"}],
            "HIP 5": [],
            "HIP 6": [{"native": "", "english": ""}],
            "HIP 7": [{}],
        }
    }
    df: pl_DataFrame = parse_star_names(payload)
    assert df.columns == ["hip", "name"]
    # english first, then native; sorted by hip; empties and non-HIP keys skipped
    assert df.rows() == [(677, "Alpheratz"), (11767, "North Star"), (32349, "Dog Star")]


def test_star_names_without_common_names() -> None:
    assert parse_star_names({}).is_empty()
    assert parse_star_names({"common_names": {}}).height == 0


def test_load_star_names_reads_its_own_cache(tmp_path: Path) -> None:
    cached: pl_DataFrame = pl_DataFrame(
        {"hip": [32349], "name": ["Sirius"]},
        schema={"hip": pl_Int64, "name": pl_String},
    )
    cached.write_parquet(tmp_path / STAR_NAMES_PARQUET_NAME)
    assert STAR_NAMES_PARQUET_NAME != "constellations.parquet"
    assert load_star_names(tmp_path).rows() == [(32349, "Sirius")]
