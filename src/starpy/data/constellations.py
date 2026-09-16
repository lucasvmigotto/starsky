"""Constellation line data (Stellarium IAU skyculture, HIP-indexed).

Deviation note: the brief named the legacy ``western/constellationship.fab``
file, which no longer exists upstream — Stellarium migrated skycultures to
``index.json``. We use ``skycultures/modern_iau/index.json`` (same IAU
asterisms, HIP identifiers, ``lines`` polylines). License: CC BY-SA 4.0,
Stellarium team; see THIRD_PARTY_NOTICES.md (BY-SA 4.0 -> GPL-3.0 one-way
compatibility).

Each constellation entry: ``{"id": "CON modern_iau And", "lines": [[hip, ...],
...], "common_name": {"native": ...}}``. Consecutive HIP numbers inside one
polyline form one segment each.
"""

import json
from pathlib import Path
from typing import Any, Final

import httpx
import polars as pl

IAU_INDEX_URL: Final[str] = (
    "https://raw.githubusercontent.com/Stellarium/stellarium/master"
    "/skycultures/modern_iau/index.json"
)
PARQUET_NAME: Final[str] = "constellations.parquet"


def parse_iau_index(payload: dict[str, Any]) -> pl.DataFrame:
    """Flatten Stellarium ``index.json`` polylines into HIP pair rows."""
    abbrs: list[str] = []
    names: list[str] = []
    hip_a: list[int] = []
    hip_b: list[int] = []
    constellations: list[dict[str, Any]] = payload.get("constellations", [])
    for entry in constellations:
        raw_id: str = str(entry.get("id", ""))
        abbr: str = raw_id.split()[-1] if raw_id else "?"
        common: dict[str, Any] = entry.get("common_name", {})
        name: str = str(common.get("native") or common.get("english") or abbr)
        for polyline in entry.get("lines", []):
            hips: list[int] = [int(h) for h in polyline]
            for first, second in zip(hips, hips[1:], strict=False):
                abbrs.append(abbr)
                names.append(name)
                hip_a.append(first)
                hip_b.append(second)
    return pl.DataFrame(
        {"abbr": abbrs, "name": names, "hip_a": hip_a, "hip_b": hip_b},
        schema={
            "abbr": pl.String,
            "name": pl.String,
            "hip_a": pl.Int64,
            "hip_b": pl.Int64,
        },
    )


def download_iau_index(url: str = IAU_INDEX_URL) -> dict[str, Any]:
    """Download the IAU skyculture JSON (~135 KB)."""
    response: httpx.Response = httpx.get(url, follow_redirects=True, timeout=60.0)
    response.raise_for_status()
    payload: dict[str, Any] = json.loads(response.text)
    return payload


def load_constellation_lines(cache_dir: Path | str) -> pl.DataFrame:
    """Load constellation HIP pairs as a Polars DataFrame (parquet-cached)."""
    directory: Path = Path(cache_dir)
    directory.mkdir(parents=True, exist_ok=True)
    parquet_path: Path = directory / PARQUET_NAME
    if parquet_path.exists():
        return pl.read_parquet(parquet_path)
    df: pl.DataFrame = parse_iau_index(download_iau_index())
    df.write_parquet(parquet_path)
    return df
