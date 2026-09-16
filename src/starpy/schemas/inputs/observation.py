"""Observation time schemas (stdlib zoneinfo, never pytz)."""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from pydantic import Field

from .._base import BaseSchema_


class Observation(BaseSchema_):
    when: datetime
    tz: str = Field(default="UTC")

    def utc(self) -> datetime:
        """Return the observation moment as an aware UTC datetime."""
        when = self.when
        if when.tzinfo is None:
            when = when.replace(tzinfo=ZoneInfo(self.tz))
        return when.astimezone(UTC)
