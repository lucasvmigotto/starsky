"""Output-shape masks: CIRCLE (poster ring) or SQUARE (full frame)."""

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw


def apply_circle_mask(image: Image.Image, ring_width: int = 6) -> Image.Image:
    """Mask ``image`` (square RGBA) to a circle with a thin light ring."""
    size: int = image.size[0]
    mask: Image.Image = Image.new("L", (size, size), 0)
    draw: ImageDraw.ImageDraw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    circled: Image.Image = image.copy()
    circled.putalpha(mask)
    ring: ImageDraw.ImageDraw = ImageDraw.Draw(circled)
    ring.ellipse((0, 0, size, size), outline=(245, 239, 224, 255), width=ring_width)
    return circled


def shape_to_mask(shape: str, image: Image.Image) -> Image.Image:
    """Dispatch circle/square masking (``shape`` is the enum value string)."""
    if shape == "circle":
        return apply_circle_mask(image)
    return image


def circle_alpha(size: int) -> NDArray[np.uint8]:
    """Circular alpha channel array (helper for tests)."""
    yy: NDArray[np.int64]
    xx: NDArray[np.int64]
    yy, xx = np.mgrid[0:size, 0:size]
    dist: NDArray[np.float64] = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2)
    return np.where(dist <= size / 2, 255, 0).astype(np.uint8)
