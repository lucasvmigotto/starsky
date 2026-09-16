"""Hipparcos catalog loading without pandas.

Skyfield's ``hipparcos.load_dataframe`` requires pandas, which this project
deliberately avoids. Instead we download the same upstream fixed-width file
(``hip_main.dat``, CDS I/239) and parse the four columns we need with a
small typed parser, then cache the result as parquet.

Byte layout (1-indexed, from the CDS ReadMe):
    HIP   bytes   9-14  (I6)
    Vmag  bytes  42-46  (F5.2)
    RAdeg bytes  52-63  (F12.8, ICRS J1991.25)
    DEdeg bytes  65-76  (F12.8, ICRS J1991.25)

263 stars have blank coordinates (no astrometric solution) and are skipped.
Proper motion is ignored: drift since J1991.25 is sub-arcminute for nearly
all stars, far below poster resolution.
"""

from pathlib import Path
from typing import Final

import httpx
import polars as pl

from ..settings import EphemerisSettings

HIPPARCOS_URL: Final[str] = "https://cdsarc.cds.unistra.fr/ftp/cats/I/239/hip_main.dat"
PARQUET_NAME: Final[str] = "hipparcos.parquet"


def parse_hip_main_line(line: str) -> tuple[int, float, float, float] | None:
    """Parse one ``hip_main.dat`` line -> (hip, ra_deg, dec_deg, mag).

    Returns ``None`` for blank-coordinate rows (no astrometric solution).
    """
    ra_raw: str = line[51:63].strip()
    dec_raw: str = line[64:76].strip()
    if not ra_raw or not dec_raw:
        return None
    hip: int = int(line[8:14].strip())
    mag: float = float(line[41:46].strip())
    return hip, float(ra_raw), float(dec_raw), mag


def parse_hip_main(text: str) -> pl.DataFrame:
    """Parse full ``hip_main.dat`` text into a typed Polars DataFrame."""
    hips: list[int] = []
    ras: list[float] = []
    decs: list[float] = []
    mags: list[float] = []
    for line in text.splitlines():
        if len(line) < 76:
            continue
        parsed: tuple[int, float, float, float] | None = parse_hip_main_line(line)
        if parsed is None:
            continue
        hip, ra, dec, mag = parsed
        hips.append(hip)
        ras.append(ra)
        decs.append(dec)
        mags.append(mag)
    return pl.DataFrame(
        {"hip": hips, "ra_deg": ras, "dec_deg": decs, "mag": mags},
        schema={
            "hip": pl.Int64,
            "ra_deg": pl.Float64,
            "dec_deg": pl.Float64,
            "mag": pl.Float64,
        },
    )


def download_hip_main(url: str = HIPPARCOS_URL) -> str:
    """Download ``hip_main.dat`` (~13 MB) and return its text."""
    with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as response:
        response.raise_for_status()
        chunks: list[bytes] = [chunk for chunk in response.iter_bytes()]
    return b"".join(chunks).decode("ascii", errors="replace")


def load_hipparcos(
    settings: EphemerisSettings | None = None,
) -> pl.DataFrame:
    """Load the Hipparcos catalog as a Polars DataFrame (parquet-cached).

    Sorted by magnitude ascending (brightest first) for deterministic
    downstream decluttering.
    """
    _settings: EphemerisSettings = settings or EphemerisSettings()
    cache_dir: Path = Path(_settings.CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    parquet_path: Path = cache_dir / PARQUET_NAME
    if parquet_path.exists():
        return pl.read_parquet(parquet_path).sort("mag")
    df: pl.DataFrame = parse_hip_main(download_hip_main())
    df.write_parquet(parquet_path)
    return df.sort("mag")
