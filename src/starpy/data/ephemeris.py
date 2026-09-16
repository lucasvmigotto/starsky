"""Ephemeris loading (Skyfield + JPL DE421, cached locally)."""

from pathlib import Path
from typing import Any

from skyfield.api import Loader

from ..settings import EphemerisSettings


def build_loader(settings: EphemerisSettings) -> Loader:
    """Create a non-verbose Skyfield Loader rooted at the cache dir."""
    cache_dir: Path = Path(settings.CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    return Loader(str(cache_dir), verbose=False)


def load_ephemeris(
    settings: EphemerisSettings | None = None,
) -> tuple[Loader, Any, Any]:
    """Download (once) and load ``de421.bsp`` + timescale.

    Returns ``(loader, planets, timescale)``. Network is used only on the
    first call; afterwards the BSP in ``CACHE_DIR`` is reused.
    """
    _settings: EphemerisSettings = settings or EphemerisSettings()
    loader: Loader = build_loader(_settings)
    planets: Any = loader(_settings.BSP_NAME)
    timescale: Any = loader.timescale()
    return loader, planets, timescale
