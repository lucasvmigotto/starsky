"""Star record schema."""

from ._base import BaseSchema_


class Star(BaseSchema_):
    hip: int
    ra_deg: float
    dec_deg: float
    mag: float
