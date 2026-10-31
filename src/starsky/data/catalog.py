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

from collections.abc import Sequence
from hashlib import sha256
from logging import Logger, getLogger
from pathlib import Path
from typing import Final

from httpx import HTTPError as httpx_HTTPError
from httpx import Timeout as httpx_Timeout
from httpx import stream as httpx_stream
from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Int64 as pl_Int64
from polars import read_parquet as pl_read_parquet

from ..settings import CatalogSettings

logger: Final[Logger] = getLogger(__name__)

# CDS first, then its CfA VizieR mirror: the file never changes, so the checksum
# guarantees every source yields the same catalog.
HIPPARCOS_URLS: Final[tuple[str, ...]] = (
    "https://cdsarc.cds.unistra.fr/ftp/cats/I/239/hip_main.dat",
    "https://vizier.cfa.harvard.edu/ftp/cats/I/239/hip_main.dat",
)
HIPPARCOS_SHA256: Final[str] = (
    "58ceabb104d647160d9437ce6e513a02a036bb4ad9f8879a5a22fd52943616e0"
)
# A dead host should fail fast so the next source gets its turn.
DOWNLOAD_TIMEOUT: Final[httpx_Timeout] = httpx_Timeout(120.0, connect=20.0)
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


def parse_hip_main(text: str) -> pl_DataFrame:
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
    return pl_DataFrame(
        {"hip": hips, "ra_deg": ras, "dec_deg": decs, "mag": mags},
        schema={
            "hip": pl_Int64,
            "ra_deg": pl_Float64,
            "dec_deg": pl_Float64,
            "mag": pl_Float64,
        },
    )


def fetch_bytes(url: str) -> bytes:
    """Download ``url`` and return its body."""
    with httpx_stream(
        "GET", url, follow_redirects=True, timeout=DOWNLOAD_TIMEOUT
    ) as response:
        response.raise_for_status()
        chunks: list[bytes] = [chunk for chunk in response.iter_bytes()]
    return b"".join(chunks)


def download_hip_main(
    urls: Sequence[str] = HIPPARCOS_URLS,
    expected_sha256: str = HIPPARCOS_SHA256,
) -> str:
    """Download ``hip_main.dat`` (~53 MB) from the first source that serves it.

    A source that fails, or whose file does not match ``expected_sha256``, is
    skipped. Raises ``RuntimeError`` when no source yields the expected file.
    """
    failures: list[str] = []
    for url in urls:
        try:
            body: bytes = fetch_bytes(url)
        except httpx_HTTPError as error:
            failures.append(f"{url}: {error!r}")
            logger.warning("Hipparcos source failed: %s", failures[-1])
            continue
        digest: str = sha256(body).hexdigest()
        if digest != expected_sha256:
            failures.append(f"{url}: unexpected sha256 {digest}")
            logger.warning("Hipparcos source failed: %s", failures[-1])
            continue
        return body.decode("ascii", errors="replace")
    raise RuntimeError(f"No Hipparcos source succeeded: {'; '.join(failures)}")


def load_hipparcos(
    settings: CatalogSettings | None = None,
) -> pl_DataFrame:
    """Load the Hipparcos catalog as a Polars DataFrame (parquet-cached).

    Sorted by magnitude ascending (brightest first) for deterministic
    downstream decluttering.
    """
    _settings: CatalogSettings = settings or CatalogSettings()
    cache_dir: Path = Path(_settings.CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    parquet_path: Path = cache_dir / PARQUET_NAME
    if parquet_path.exists():
        return pl_read_parquet(parquet_path).sort("mag")
    df: pl_DataFrame = parse_hip_main(download_hip_main())
    df.write_parquet(parquet_path)
    return df.sort("mag")
