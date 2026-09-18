"""Integration-test network helpers (test harness only, never src/).

`ensure_bsp_cached` pre-seeds ``de421.bsp`` with httpx (explicit timeouts,
retries, mirror fallback) so Skyfield's ``Loader`` finds the file on disk
and never touches its own timeout-less urllib downloader.
"""

from pathlib import Path
from time import sleep as time_sleep
from typing import Any, Final

from httpx import HTTPError as httpx_HTTPError
from httpx import stream as httpx_stream
from pytest import skip as pytest_skip

from starpy.data.ephemeris import load_ephemeris
from starpy.settings import EphemerisSettings

BSP_MIRRORS: Final[tuple[str, ...]] = (
    "https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de421.bsp",
    "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de421.bsp",
)


def ensure_bsp_cached(
    cache_dir: Path | str,
    bsp_name: str = "de421.bsp",
    urls: tuple[str, ...] | None = None,
    attempts: int = 3,
    backoff_s: float = 5.0,
    timeout_s: float = 120.0,
) -> Path:
    """Download ``bsp_name`` from the first healthy mirror (cached on disk).

    Returns the local path. Raises ``OSError`` after all attempts fail —
    callers translate that into ``pytest.skip`` (external outage ≠ red CI).
    """
    target: Path = Path(cache_dir) / bsp_name
    if target.exists() and target.stat().st_size > 0:
        return target
    candidates: tuple[str, ...] = urls if urls is not None else BSP_MIRRORS
    last_error: str = "no mirrors configured"
    for attempt in range(max(1, attempts)):
        for url in candidates:
            try:
                with httpx_stream(
                    "GET", url, follow_redirects=True, timeout=timeout_s
                ) as response:
                    response.raise_for_status()
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with target.open("wb") as handle:
                        for chunk in response.iter_bytes():
                            handle.write(chunk)
                return target
            except (httpx_HTTPError, OSError) as exc:
                last_error = f"{url}: {exc}"
        time_sleep(backoff_s * (attempt + 1))
    raise OSError(f"could not download {bsp_name}: {last_error}")


def warm_ephemeris(
    tmp_path: Path,
) -> tuple[EphemerisSettings, Any, Any, Path]:
    """Warm ephemeris + catalog caches, skipping on external outage.

    Shared by the ``warmed`` fixture and its skip-path test.
    """
    settings: EphemerisSettings = EphemerisSettings(CACHE_DIR=tmp_path / "eph")
    try:
        ensure_bsp_cached(settings.CACHE_DIR, settings.BSP_NAME)
        _, planets, timescale = load_ephemeris(settings)
    except (OSError, httpx_HTTPError) as exc:
        pytest_skip(f"ephemeris download unavailable: {exc}")
        raise
    return settings, planets, timescale, tmp_path
