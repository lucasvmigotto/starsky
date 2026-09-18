"""Observer (timezone conversion) tests."""

from datetime import UTC, datetime

from starpy.astro.observer import format_local, utc_from_local


def test_utc_from_local_ny_winter() -> None:
    result: datetime = utc_from_local(datetime(2026, 1, 1, 0, 0), "America/New_York")
    assert result == datetime(2026, 1, 1, 5, 0, tzinfo=UTC)


def test_utc_from_local_passthrough_aware() -> None:
    aware: datetime = datetime(2026, 6, 1, 12, 0, tzinfo=UTC)
    assert utc_from_local(aware, "UTC") == aware


def test_format_local_round_trip() -> None:
    utc_moment: datetime = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
    assert format_local(utc_moment, "UTC") == "2026-01-01 00:00"
    assert format_local(utc_moment, "America/New_York") == "2025-12-31 19:00"
