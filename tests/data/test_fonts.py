"""Bundled-font contract (BCR-0004, constitution III).

The poster font is vendored in the repository; a missing asset is a hard
error, never a silent fallback to another face.
"""

from pathlib import Path
from typing import Any

from matplotlib.font_manager import FontProperties as mplfm_FontProperties
from matplotlib.font_manager import findfont as mplfm_findfont
from pytest import mark as pytest_mark
from pytest import raises as pytest_raises

from starpy.data.fonts import (
    BUNDLED_FONT_PATH,
    FONT_FILENAME,
    FontUnavailableError,
    bundled_font_path,
    ensure_font,
    font_path,
    register_cached_fonts,
)


@pytest_mark.unit
def test_bundled_font_is_present() -> None:
    """The repository ships the TTF (and the OFL licence beside it)."""
    assert BUNDLED_FONT_PATH.exists(), BUNDLED_FONT_PATH
    assert BUNDLED_FONT_PATH.stat().st_size > 0
    assert bundled_font_path() == BUNDLED_FONT_PATH
    licence: Path = BUNDLED_FONT_PATH.parent / "OFL.txt"
    assert licence.exists(), licence


@pytest_mark.unit
def test_ensure_font_copies_bundled_file(tmp_path: Path) -> None:
    """``ensure_font`` installs the vendored font into the cache dir."""
    target: Path = ensure_font(tmp_path / "cache")
    assert target == font_path(tmp_path / "cache")
    assert target.exists()
    assert target.read_bytes() == BUNDLED_FONT_PATH.read_bytes()


@pytest_mark.unit
def test_ensure_font_is_idempotent(tmp_path: Path) -> None:
    """A second call leaves an existing cache copy untouched."""
    cache: Path = tmp_path / "cache"
    first: Path = ensure_font(cache)
    first.write_bytes(b"stale")
    second: Path = ensure_font(cache)
    assert second.read_bytes() == b"stale"


@pytest_mark.unit
def test_register_cached_fonts_makes_font_resolvable(tmp_path: Path) -> None:
    """After registration matplotlib resolves Cormorant Garamond, not a fallback."""
    assert register_cached_fonts(tmp_path / "cache") is True
    resolved: Path = Path(
        mplfm_findfont(mplfm_FontProperties(family="Cormorant Garamond"))
    )
    assert resolved.name == FONT_FILENAME, resolved


@pytest_mark.unit
def test_missing_bundled_font_is_a_hard_error(tmp_path: Path, monkeypatch: Any) -> None:
    """A missing bundled asset raises; it never returns None or a fallback."""
    import starpy.data.fonts as fonts_module

    monkeypatch.setattr(fonts_module, "BUNDLED_FONT_PATH", tmp_path / "absent.ttf")
    with pytest_raises(FontUnavailableError):
        ensure_font(tmp_path / "cache")
