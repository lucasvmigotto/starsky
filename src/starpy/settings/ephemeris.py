"""Ephemeris / astronomical-data cache settings."""

from pathlib import Path
from typing import Self

from pydantic import computed_field

from ._base import BaseSettings_


class EphemerisSettings(BaseSettings_):
    BSP_NAME: str = "de421.bsp"
    CACHE_DIR: Path = Path("/tmp/starpy-cache/ephemeris")
    MAGNITUDE_CUTOFF: float = 6.5

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {
            "STARPY_EPHEMERIS_DIR": str(self.CACHE_DIR),
        }
