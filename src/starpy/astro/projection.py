"""Zenith-centered lens projections (pure NumPy).

Inputs: altitude/azimuth in degrees (altitude > 0 = above horizon).
Output: ``x, y`` in unit-disc coordinates (radius <= ~1), north up
(``-y`` = north), azimuth measured eastward from north.
"""

from typing import Any

from numpy import asarray as np_asarray
from numpy import clip as np_clip
from numpy import cos as np_cos
from numpy import deg2rad as np_deg2rad
from numpy import float64 as np_float64
from numpy import floating as np_floating
from numpy import sin as np_sin
from numpy.typing import NDArray

FloatArray = NDArray[np_float64]


def _polar(
    az_deg: NDArray[np_floating[Any]],
    radius: NDArray[np_floating[Any]],
) -> tuple[FloatArray, FloatArray]:
    theta: FloatArray = np_deg2rad(np_asarray(az_deg, dtype=np_float64))
    r: FloatArray = np_asarray(radius, dtype=np_float64)
    x: FloatArray = r * np_sin(theta)
    y: FloatArray = -r * np_cos(theta)
    return x, y


def stereographic(
    alt_deg: NDArray[np_floating[Any]],
    az_deg: NDArray[np_floating[Any]],
) -> tuple[FloatArray, FloatArray]:
    """Conformal stereographic projection from the nadir (article default)."""
    alt: FloatArray = np_asarray(alt_deg, dtype=np_float64)
    sin_alt: FloatArray = np_sin(np_deg2rad(alt))
    cos_alt: FloatArray = np_cos(np_deg2rad(alt))
    r: FloatArray = np_clip(cos_alt / (1.0 + sin_alt), 0.0, 1.0)
    return _polar(az_deg, r)


def fisheye(
    alt_deg: NDArray[np_floating[Any]],
    az_deg: NDArray[np_floating[Any]],
    strength: float = 1.0,
) -> tuple[FloatArray, FloatArray]:
    """Azimuthal-equidistant fisheye: ``r = ((90 - alt) / 90) ** strength``."""
    if strength <= 0.0:
        raise ValueError("fisheye strength must be positive.")
    alt: FloatArray = np_asarray(alt_deg, dtype=np_float64)
    r: FloatArray = np_clip(((90.0 - alt) / 90.0) ** strength, 0.0, 1.0)
    return _polar(az_deg, r)
