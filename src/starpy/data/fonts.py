"""Open-licensed poster font handling (Cormorant Garamond, SIL OFL 1.1).

The font is **vendored in the repository** at ``assets/fonts/`` (BCR-0004) so a
poster is reproducible offline and never silently falls back to another face.
``ensure_font`` copies it into the cache dir and ``register_cached_fonts``
registers it with matplotlib; a missing bundled asset is a hard error.
"""

from pathlib import Path
from shutil import copyfile as shutil_copyfile
from typing import Final

FONT_FILENAME: Final[str] = "CormorantGaramond.ttf"

#: Repository root, resolved from this file's location (src/starpy/data/fonts.py).
_REPO_ROOT: Final[Path] = Path(__file__).resolve().parents[3]
#: Vendored font shipped with the project (see assets/fonts/OFL.txt).
BUNDLED_FONT_PATH: Final[Path] = _REPO_ROOT / "assets" / "fonts" / FONT_FILENAME


class FontUnavailableError(RuntimeError):
    """The bundled poster font is missing or unreadable.

    Raised instead of silently degrading to another typeface: the poster's
    typography is part of the product contract (constitution III, BCR-0004).
    """


def font_path(cache_dir: Path | str) -> Path:
    """Location of the cached poster font."""
    return Path(cache_dir) / FONT_FILENAME


def bundled_font_path() -> Path:
    """Location of the font vendored in the repository."""
    return BUNDLED_FONT_PATH


def ensure_font(cache_dir: Path | str) -> Path:
    """Install the bundled font into the cache dir; return its path.

    Copies the vendored TTF on first use. Raises ``FontUnavailableError`` when
    the bundled file is missing or empty — never returns ``None``.
    """
    bundled: Path = bundled_font_path()
    if not bundled.exists() or bundled.stat().st_size == 0:
        raise FontUnavailableError(
            f"bundled font missing or empty at {bundled}; "
            "the repository is incomplete (see assets/fonts/OFL.txt)"
        )
    target: Path = font_path(cache_dir)
    if not target.exists() or target.stat().st_size == 0:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil_copyfile(bundled, target)
    return target


def register_cached_fonts(cache_dir: Path | str) -> bool:
    """Install and register the poster font with matplotlib.

    Raises ``FontUnavailableError`` when the bundled asset is missing; returns
    ``True`` once matplotlib knows the font. A registration failure inside
    matplotlib is surfaced as the same error, so a render never proceeds on an
    unintentional fallback face.
    """
    target: Path = ensure_font(cache_dir)
    try:
        from matplotlib.font_manager import fontManager as mplfm_fontManager

        mplfm_fontManager.addfont(str(target))
    except Exception as exc:  # noqa: BLE001 - convert to a typed failure
        raise FontUnavailableError(
            f"could not register the poster font at {target}: {exc}"
        ) from exc
    return True
