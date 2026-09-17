"""Share-link payload schema (versioned, viewer-agnostic)."""

from datetime import datetime
from typing import Any

from pydantic import Field

from ._base import BaseSchema_
from .inputs.render import RenderOptions

SHARE_VERSION: int = 1


class SharePayload(BaseSchema_):
    """Everything the static viewer needs to recompute a poster."""

    v: int = Field(default=SHARE_VERSION)
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    place: str | None = None
    when_utc: datetime
    tz: str = "UTC"
    options: RenderOptions = RenderOptions()

    def to_flat_dict(self) -> dict[str, Any]:
        """JSON-safe dict (datetimes as ISO strings)."""
        data: dict[str, Any] = self.model_dump(mode="json")
        return data
