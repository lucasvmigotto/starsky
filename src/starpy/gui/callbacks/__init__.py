"""Callbacks package."""

from ._base import OnCallbackBase
from .skymap import SkyMapCallback, coerce_when

__all__ = ["OnCallbackBase", "SkyMapCallback", "coerce_when"]
