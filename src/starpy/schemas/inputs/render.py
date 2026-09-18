"""Render-option schemas."""

from pydantic import Field

from .._base import BaseSchema_
from ..enums.projection import Projection
from ..enums.shape import Shape


class RenderOptions(BaseSchema_):
    projection: Projection = Projection.STEREOGRAPHIC
    fisheye_strength: float = Field(default=1.0, gt=0.0, le=3.0)
    min_separation: float = Field(default=0.008, ge=0.0, le=0.1)
    magnitude_limit: float = Field(default=5.8, ge=1.0, le=8.0)
    glow: bool = True
    glow_intensity: float = Field(default=1.0, ge=0.0, le=3.0)
    constellations: bool = True
    constellation_labels: bool = True
    shape: Shape = Shape.CIRCLE
    title: str | None = None
