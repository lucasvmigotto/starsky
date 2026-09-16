"""Projection math tests (known alt/az -> x/y)."""

import numpy as np
import pytest
from numpy.typing import NDArray

from starpy.astro.projection import fisheye, stereographic


def test_stereographic_zenith_is_origin() -> None:
    x: NDArray[np.float64]
    y: NDArray[np.float64]
    x, y = stereographic(np.array([90.0]), np.array([0.0]))
    assert float(x[0]) == pytest.approx(0.0)
    assert float(y[0]) == pytest.approx(0.0)


def test_stereographic_horizon_radius_one() -> None:
    x: NDArray[np.float64]
    y: NDArray[np.float64]
    x, y = stereographic(np.array([0.0]), np.array([90.0]))
    assert float(np.hypot(x[0], y[0])) == pytest.approx(1.0)


def test_stereographic_cardinal_directions() -> None:
    az: NDArray[np.float64] = np.array([0.0, 90.0, 180.0, 270.0])
    alt: NDArray[np.float64] = np.full(4, 45.0)
    x: NDArray[np.float64]
    y: NDArray[np.float64]
    x, y = stereographic(alt, az)
    # North up (-y), east left... convention: x=sin(az), y=-cos(az).
    assert float(x[0]) == pytest.approx(0.0)
    assert float(y[0]) < 0.0  # north up
    assert float(x[1]) > 0.0  # east positive x
    assert float(y[2]) > 0.0  # south positive y


def test_fisheye_linear_radius() -> None:
    x: NDArray[np.float64]
    y: NDArray[np.float64]
    x, y = fisheye(np.array([45.0]), np.array([0.0]), strength=1.0)
    assert float(np.hypot(x[0], y[0])) == pytest.approx(0.5)


def test_fisheye_strength_exaggerates() -> None:
    low: NDArray[np.float64]
    high: NDArray[np.float64]
    low, _ = fisheye(np.array([45.0]), np.array([0.0]), strength=1.0)
    high, _ = fisheye(np.array([45.0]), np.array([0.0]), strength=2.0)
    assert float(np.hypot(high[0], 0.0)) == pytest.approx(
        float(np.hypot(low[0], 0.0)) ** 2
    )


def test_fisheye_rejects_nonpositive_strength() -> None:
    with pytest.raises(ValueError):
        fisheye(np.array([45.0]), np.array([0.0]), strength=0.0)


def test_projection_bounded_unit_disc() -> None:
    rng: np.random.Generator = np.random.default_rng(42)
    alt: NDArray[np.float64] = rng.uniform(0.0, 90.0, size=500)
    az: NDArray[np.float64] = rng.uniform(0.0, 360.0, size=500)
    for fn in (stereographic, fisheye):
        x: NDArray[np.float64]
        y: NDArray[np.float64]
        x, y = fn(alt, az)
        assert bool((np.hypot(x, y) <= 1.0 + 1e-12).all())
