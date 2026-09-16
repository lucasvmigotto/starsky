"""Observer helpers: local -> UTC conversion (stdlib zoneinfo only)."""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo


def utc_from_local(naive: datetime, tz_name: str) -> datetime:
    """Attach ``tz_name`` to a naive datetime and convert to aware UTC."""
    zone: ZoneInfo = ZoneInfo(tz_name)
    local: datetime = naive.replace(tzinfo=zone) if naive.tzinfo is None else naive
    return local.astimezone(UTC)


def format_local(utc_moment: datetime, tz_name: str) -> str:
    """Format an aware UTC moment in ``tz_name`` as ``YYYY-MM-DD HH:MM``."""
    zone: ZoneInfo = ZoneInfo(tz_name)
    return utc_moment.astimezone(zone).strftime("%Y-%m-%d %H:%M")
