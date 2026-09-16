"""Glow size-mapping tests."""

import numpy as np
from numpy.typing import NDArray

from starpy.render.glow import star_size


def test_brighter_is_bigger() -> None:
    sizes: NDArray[np.float64] = star_size([0.0, 3.0, 6.0])
    assert float(sizes[0]) > float(sizes[1]) > float(sizes[2])


def test_formula_spot_check() -> None:
    sizes: NDArray[np.float64] = star_size([0.0], size_max=14.0)
    assert float(sizes[0]) == 14.0
    dim: NDArray[np.float64] = star_size([2.5], size_max=14.0)
    assert float(dim[0]) == 14.0 * 10 ** (-1.0)


def test_clamped() -> None:
    sizes: NDArray[np.float64] = star_size([-5.0, 12.0], size_max=14.0, size_min=0.6)
    assert float(sizes[0]) == 14.0
    assert float(sizes[1]) == 0.6
