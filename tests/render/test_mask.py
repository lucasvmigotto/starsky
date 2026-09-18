"""Mask tests."""

from typing import cast

from numpy import uint8 as np_uint8
from numpy.typing import NDArray
from PIL.Image import Image as pil_Image
from PIL.Image import new as pil_new

from starpy.render.mask import apply_circle_mask, circle_alpha, shape_to_mask


def pixel(image: pil_Image, x: int, y: int) -> tuple[int, ...]:
    """Typed accessor over PIL's loosely-stubbed ``getpixel``."""
    return cast("tuple[int, ...]", image.getpixel((x, y)))


def test_circle_alpha_geometry() -> None:
    alpha: NDArray[np_uint8] = circle_alpha(100)
    assert int(alpha[50, 50]) == 255
    assert int(alpha[0, 0]) == 0
    assert int(alpha[0, 50]) == 255


def test_apply_circle_mask_transparent_corners() -> None:
    image: pil_Image = pil_new("RGBA", (120, 120), (11, 15, 25, 255))
    masked: pil_Image = apply_circle_mask(image)
    assert masked.size == (120, 120)
    corner: tuple[int, ...] = pixel(masked, 0, 0)
    center: tuple[int, ...] = pixel(masked, 60, 60)
    assert corner[3] == 0
    assert center[3] == 255


def test_square_passthrough() -> None:
    image: pil_Image = pil_new("RGBA", (64, 64), (11, 15, 25, 255))
    assert pixel(shape_to_mask("square", image), 0, 0)[3] == 255
    assert pixel(shape_to_mask("circle", image), 0, 0)[3] == 0
