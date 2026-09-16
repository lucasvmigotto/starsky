"""Schema validation + DST edge-case tests."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from starpy.schemas.inputs.location import Coordinates
from starpy.schemas.inputs.observation import Observation
from starpy.schemas.inputs.render import RenderOptions


def test_coordinates_reject_out_of_range() -> None:
    with pytest.raises(ValidationError):
        Coordinates(lat=91.0, lon=0.0)
    with pytest.raises(ValidationError):
        Coordinates(lat=0.0, lon=181.0)
    assert Coordinates(lat=-90.0, lon=180.0).lat == -90.0


def test_observation_utc_default() -> None:
    obs: Observation = Observation(when=datetime(2026, 1, 1, 0, 0))
    assert obs.tz == "UTC"
    assert obs.utc() == datetime(2026, 1, 1, 0, 0, tzinfo=UTC)


def test_observation_dst_spring_forward() -> None:
    # 2026-03-08 03:30 EDT (after US spring forward) == 07:30 UTC.
    obs: Observation = Observation(
        when=datetime(2026, 3, 8, 3, 30), tz="America/New_York"
    )
    assert obs.utc() == datetime(2026, 3, 8, 7, 30, tzinfo=UTC)


def test_observation_dst_fall_back_fold() -> None:
    # Ambiguous 01:30 on 2026-11-01: fold=0 (EDT, UTC-4) vs fold=1 (EST, UTC-5).
    first: Observation = Observation(
        when=datetime(2026, 11, 1, 1, 30, fold=0), tz="America/New_York"
    )
    second: Observation = Observation(
        when=datetime(2026, 11, 1, 1, 30, fold=1), tz="America/New_York"
    )
    assert first.utc() == datetime(2026, 11, 1, 5, 30, tzinfo=UTC)
    assert second.utc() == datetime(2026, 11, 1, 6, 30, tzinfo=UTC)


def test_render_options_defaults() -> None:
    opts: RenderOptions = RenderOptions()
    assert opts.projection == "stereographic"
    assert opts.shape == "circle"
    assert 5.0 < opts.magnitude_limit < 6.5
    assert opts.title is None
