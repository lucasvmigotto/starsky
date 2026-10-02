"""Data package — the star catalog and constellation lines the browser consumes."""

from .catalog import load_hipparcos
from .constellations import load_constellation_lines

__all__ = [
    "load_constellation_lines",
    "load_hipparcos",
]
