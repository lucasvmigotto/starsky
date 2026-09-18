"""Constellation line schema (HIP-indexed pairs)."""

from ._base import BaseSchema_


class ConstellationLine(BaseSchema_):
    abbr: str
    name: str
    hip_a: int
    hip_b: int
