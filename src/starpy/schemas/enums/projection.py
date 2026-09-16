"""Sky-projection enum."""

from enum import StrEnum


class Projection(StrEnum):
    STEREOGRAPHIC = "stereographic"
    FISHEYE = "fisheye"
