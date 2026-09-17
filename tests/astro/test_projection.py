"""Projection math tests (known alt/az -> x/y)."""

from numpy import array as np_array
from numpy import float64 as np_float64
from numpy import full as np_full
from numpy import hypot as np_hypot
from numpy.random import Generator as nprandom_Generator
from numpy.random import default_rng as nprandom_default_rng
from numpy.typing import NDArray
from pytest import approx as pytest_approx
from pytest import raises as pytest_raises

from starpy.astro.projection import fisheye, stereographic


def test_stereographic_zenith_is_origin() -> None:
    x: NDArray[np_float64]
    y: NDArray[np_float64]
    x, y = stereographic(np_array([90.0]), np_array([0.0]))
    assert float(x[0]) == pytest_approx(0.0)
    assert float(y[0]) == pytest_approx(0.0)


def test_stereographic_horizon_radius_one() -> None:
    x: NDArray[np_float64]
    y: NDArray[np_float64]
    x, y = stereographic(np_array([0.0]), np_array([90.0]))
    assert float(np_hypot(x[0], y[0])) == pytest_approx(1.0)


def test_stereographic_cardinal_directions() -> None:
    az: NDArray[np_float64] = np_array([0.0, 90.0, 180.0, 270.0])
    alt: NDArray[np_float64] = np_full(4, 45.0)
    x: NDArray[np_float64]
    y: NDArray[np_float64]
    x, y = stereographic(alt, az)
    # North up (-y), east left... convention: x=sin(az), y=-cos(az).
    assert float(x[0]) == pytest_approx(0.0)
    assert float(y[0]) < 0.0  # north up
    assert float(x[1]) > 0.0  # east positive x
    assert float(y[2]) > 0.0  # south positive y


def test_fisheye_linear_radius() -> None:
    x: NDArray[np_float64]
    y: NDArray[np_float64]
    x, y = fisheye(np_array([45.0]), np_array([0.0]), strength=1.0)
    assert float(np_hypot(x[0], y[0])) == pytest_approx(0.5)


def test_fisheye_strength_exaggerates() -> None:
    low: NDArray[np_float64]
    high: NDArray[np_float64]
    low, _ = fisheye(np_array([45.0]), np_array([0.0]), strength=1.0)
    high, _ = fisheye(np_array([45.0]), np_array([0.0]), strength=2.0)
    assert float(np_hypot(high[0], 0.0)) == pytest_approx(
        float(np_hypot(low[0], 0.0)) ** 2
    )


def test_fisheye_rejects_nonpositive_strength() -> None:
    with pytest_raises(ValueError):
        fisheye(np_array([45.0]), np_array([0.0]), strength=0.0)


def test_projection_bounded_unit_disc() -> None:
    rng: nprandom_Generator = nprandom_default_rng(42)
    alt: NDArray[np_float64] = rng.uniform(0.0, 90.0, size=500)
    az: NDArray[np_float64] = rng.uniform(0.0, 360.0, size=500)
    for fn in (stereographic, fisheye):
        x: NDArray[np_float64]
        y: NDArray[np_float64]
        x, y = fn(alt, az)
        assert bool((np_hypot(x, y) <= 1.0 + 1e-12).all())
