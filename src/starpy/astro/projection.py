"""Zenith-centered lens projections (pure NumPy).

Inputs: altitude/azimuth in degrees (altitude > 0 = above horizon).
Output: ``x, y`` in unit-disc coordinates (radius <= ~1), north up
(``-y`` = north), azimuth measured eastward from north.
"""

from typing import Any

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]


def _polar(
    az_deg: NDArray[np.floating[Any]],
    radius: NDArray[np.floating[Any]],
) -> tuple[FloatArray, FloatArray]:
    theta: FloatArray = np.deg2rad(np.asarray(az_deg, dtype=np.float64))
    r: FloatArray = np.asarray(radius, dtype=np.float64)
    x: FloatArray = r * np.sin(theta)
    y: FloatArray = -r * np.cos(theta)
    return x, y


def stereographic(
    alt_deg: NDArray[np.floating[Any]],
    az_deg: NDArray[np.floating[Any]],
) -> tuple[FloatArray, FloatArray]:
    """Conformal stereographic projection from the nadir (article default)."""
    alt: FloatArray = np.asarray(alt_deg, dtype=np.float64)
    sin_alt: FloatArray = np.sin(np.deg2rad(alt))
    cos_alt: FloatArray = np.cos(np.deg2rad(alt))
    r: FloatArray = np.clip(cos_alt / (1.0 + sin_alt), 0.0, 1.0)
    return _polar(az_deg, r)


def fisheye(
    alt_deg: NDArray[np.floating[Any]],
    az_deg: NDArray[np.floating[Any]],
    strength: float = 1.0,
) -> tuple[FloatArray, FloatArray]:
    """Azimuthal-equidistant fisheye: ``r = ((90 - alt) / 90) ** strength``."""
    if strength <= 0.0:
        raise ValueError("fisheye strength must be positive.")
    alt: FloatArray = np.asarray(alt_deg, dtype=np.float64)
    r: FloatArray = np.clip(((90.0 - alt) / 90.0) ** strength, 0.0, 1.0)
    return _polar(az_deg, r)
