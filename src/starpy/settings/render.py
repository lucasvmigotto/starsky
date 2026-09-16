"""Render-default settings (poster visual tokens).

Font: "Cormorant Garamond" (Google Fonts, SIL Open Font License 1.1).
Fallback stacks resolve to DejaVu Serif bundled with matplotlib when the
webfont is unavailable offline.
"""

from pathlib import Path
from typing import Self

from pydantic import computed_field

from ._base import BaseSettings_


class RenderSettings(BaseSettings_):
    DPI: int = 150
    SIZE_PX: int = 1600
    BACKGROUND: str = "#0b0f19"
    STAR_COLOR: str = "#f5efe0"
    LINE_COLOR: str = "#b98a8a"
    FONT_FAMILY: str = "Cormorant Garamond"
    CACHE_DIR: Path = Path("/tmp/starpy-cache/renders")
    DEFAULT_MAGNITUDE_LIMIT: float = 5.8
    DEFAULT_FISHEYE_STRENGTH: float = 1.0
    DEFAULT_MIN_SEPARATION: float = 0.008
    DEFAULT_GLOW_INTENSITY: float = 1.0

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {}
