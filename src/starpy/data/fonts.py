"""Open-licensed poster font handling (Cormorant Garamond, SIL OFL 1.1).

The TTF is downloaded once by ``cache warm`` into the ephemeris cache dir
and registered with matplotlib at app/CLI startup when present. Offline runs
fall back to matplotlib's bundled DejaVu Serif (FONT_STACK in render.figure).
"""

from pathlib import Path
from typing import Final

from httpx import HTTPError as httpx_HTTPError
from httpx import Response as httpx_Response
from httpx import get as httpx_get

CORMORANT_URL: Final[str] = (
    "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/"
    "CormorantGaramond%5Bwght%5D.ttf"
)
FONT_FILENAME: Final[str] = "CormorantGaramond.ttf"


def font_path(cache_dir: Path | str) -> Path:
    """Location of the cached poster font."""
    return Path(cache_dir) / FONT_FILENAME


def ensure_font(cache_dir: Path | str) -> Path | None:
    """Download the OFL font if missing; return its path (None on failure)."""
    target: Path = font_path(cache_dir)
    if target.exists():
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        response: httpx_Response = httpx_get(
            CORMORANT_URL, follow_redirects=True, timeout=120.0
        )
        response.raise_for_status()
        target.write_bytes(response.content)
    except httpx_HTTPError:
        return None
    return target if target.exists() else None


def register_cached_fonts(cache_dir: Path | str) -> bool:
    """Register the cached font with matplotlib if present (no network)."""
    target: Path = font_path(cache_dir)
    if not target.exists():
        return False
    try:
        from matplotlib.font_manager import fontManager as mplfm_fontManager

        mplfm_fontManager.addfont(str(target))
    except Exception:  # noqa: BLE001 - font registration must never break startup
        return False
    return True
