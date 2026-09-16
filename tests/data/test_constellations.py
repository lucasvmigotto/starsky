"""Stellarium IAU index parser tests (no network)."""

from typing import Any

import polars as pl

from starpy.data.constellations import parse_iau_index


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
    df: pl.DataFrame = parse_iau_index(payload)
    assert df.height == 3  # (677,3092), (3092,5447), (113,114)
    assert df.get_column("abbr").to_list() == ["And", "And", "And"]
    assert df.get_column("name").to_list() == ["Andromeda"] * 3
    assert df.row(0) == ("And", "Andromeda", 677, 3092)


def test_empty_payload() -> None:
    df: pl.DataFrame = parse_iau_index({"constellations": []})
    assert df.is_empty()
