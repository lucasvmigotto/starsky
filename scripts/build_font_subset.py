#!/usr/bin/env python
"""Build the PDF-embedding font subset the site ships (BCR-0006).

The exported PDF embeds the poster's own face rather than a standard PDF font.
jsPDF parses only TrueType (not woff2), and the full variable TTF is 1.2 MB, so
this subsets it to the glyphs the poster can actually render: the Latin
alphabet, digits, and the punctuation the caption grammar uses. ~104 KB, which is
about half the woff2 already shipped.

Deterministic: same input font + character set gives the same output bytes, so
the asset can be regenerated in CI and diffed rather than trusted.

Usage:
    uv run --with fonttools --with brotli python scripts/build_font_subset.py
"""

from pathlib import Path
from typing import Final

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT: Final[Path] = Path(__file__).resolve().parent.parent
SOURCE: Final[Path] = ROOT / "assets" / "fonts" / "CormorantGaramond.ttf"
TARGET: Final[Path] = (
    ROOT / "site" / "public" / "fonts" / "CormorantGaramond-subset.ttf"
)

# What the poster can draw: constellation labels are uppercased Latin; the title
# and place are arbitrary Latin text; the caption detail uses the degree signs,
# a middot separator, an em dash, and ordinary punctuation.
GLYPHS: Final[str] = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    " .,;:!?'\"()[]{}&+-*/%#@=_—–·°"
)


def main() -> int:
    if not SOURCE.exists():
        raise SystemExit(f"source font missing: {SOURCE}")

    options = subset.Options()
    # Keep every OpenType layout feature: the poster uses no ligatures or
    # kerning pairs today, but dropping them would change spacing silently if it
    # ever does.
    options.layout_features = ["*"]
    options.drop_tables += ["DSIG"]
    # Deterministic output: no timestamps or build ids in the binary.
    options.retain_gids = False
    options.recalc_bounds = True

    font: TTFont = subset.load_font(str(SOURCE), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=GLYPHS)
    subsetter.subset(font)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(TARGET), options)

    source_kb: int = SOURCE.stat().st_size // 1024
    target_kb: int = TARGET.stat().st_size // 1024
    print(f"subset {len(set(GLYPHS))} glyphs: {source_kb} KB -> {target_kb} KB")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
