"""Magnitude -> marker-size mapping (pure)."""

from typing import Any

import numpy as np
from numpy.typing import NDArray


def star_size(
    mag: NDArray[np.floating[Any]] | list[float] | float,
    size_max: float = 14.0,
    size_min: float = 0.6,
) -> NDArray[np.float64]:
    """``size = size_max * 10 ** (mag / -2.5)``, clamped to ``[size_min, size_max]``."""
    m: NDArray[np.float64] = np.asarray(mag, dtype=np.float64)
    sizes: NDArray[np.float64] = size_max * np.power(10.0, m / -2.5)
    return np.clip(sizes, size_min, size_max)
