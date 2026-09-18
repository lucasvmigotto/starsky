"""Magnitude -> marker-size mapping (pure)."""

from typing import Any

from numpy import asarray as np_asarray
from numpy import clip as np_clip
from numpy import float64 as np_float64
from numpy import floating as np_floating
from numpy import power as np_power
from numpy.typing import NDArray


def star_size(
    mag: NDArray[np_floating[Any]] | list[float] | float,
    size_max: float = 14.0,
    size_min: float = 0.6,
) -> NDArray[np_float64]:
    """``size = size_max * 10 ** (mag / -2.5)``, clamped to ``[size_min, size_max]``."""
    m: NDArray[np_float64] = np_asarray(mag, dtype=np_float64)
    sizes: NDArray[np_float64] = size_max * np_power(10.0, m / -2.5)
    return np_clip(sizes, size_min, size_max)
