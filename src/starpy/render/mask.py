"""Output-shape masks: CIRCLE (poster ring) or SQUARE (full frame)."""

from numpy import float64 as np_float64
from numpy import int64 as np_int64
from numpy import mgrid as np_mgrid
from numpy import sqrt as np_sqrt
from numpy import uint8 as np_uint8
from numpy import where as np_where
from numpy.typing import NDArray
from PIL.Image import Image as pil_Image
from PIL.Image import new as pil_new
from PIL.ImageDraw import Draw as pildraw_Draw
from PIL.ImageDraw import ImageDraw as pildraw_ImageDraw


def apply_circle_mask(image: pil_Image, ring_width: int = 6) -> pil_Image:
    """Mask ``image`` (square RGBA) to a circle with a thin light ring."""
    size: int = image.size[0]
    mask: pil_Image = pil_new("L", (size, size), 0)
    draw: pildraw_ImageDraw = pildraw_Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    circled: pil_Image = image.copy()
    circled.putalpha(mask)
    ring: pildraw_ImageDraw = pildraw_Draw(circled)
    ring.ellipse((0, 0, size, size), outline=(245, 239, 224, 255), width=ring_width)
    return circled


def shape_to_mask(shape: str, image: pil_Image) -> pil_Image:
    """Dispatch circle/square masking (``shape`` is the enum value string)."""
    if shape == "circle":
        return apply_circle_mask(image)
    return image


def circle_alpha(size: int) -> NDArray[np_uint8]:
    """Circular alpha channel array (helper for tests)."""
    yy: NDArray[np_int64]
    xx: NDArray[np_int64]
    yy, xx = np_mgrid[0:size, 0:size]
    dist: NDArray[np_float64] = np_sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2)
    return np_where(dist <= size / 2, 255, 0).astype(np_uint8)
