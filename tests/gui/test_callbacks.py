"""Callback param-resolution tests (render pipeline stubbed)."""

from datetime import datetime
from typing import Any

import polars as pl
from PIL import Image

from starpy.gui.callbacks.skymap import SkyMapCallback, coerce_when
from starpy.settings import Settings


def test_coerce_when_variants() -> None:
    moment: datetime = datetime(2026, 1, 1, 0, 0)
    assert coerce_when(moment) == moment
    assert coerce_when("2026-01-01T00:00:00") == moment
    assert coerce_when(1767225600).year == 2026


def _callback(monkeypatch: Any, catalog: pl.DataFrame) -> SkyMapCallback:
    settings: Settings = Settings()
    callback: SkyMapCallback = SkyMapCallback(
        settings, catalog, catalog.clear(), None, None
    )
    fake: Image.Image = Image.new("RGBA", (32, 32), (0, 0, 0, 255))
    monkeypatch.setattr(
        "starpy.gui.callbacks.skymap.render_sky_map", lambda **kwargs: fake
    )
    return callback


def test_render_callback_coordinates_mode(
    monkeypatch: Any, tiny_catalog: pl.DataFrame
) -> None:
    callback: SkyMapCallback = _callback(monkeypatch, tiny_catalog)
    image: Image.Image = callback.on_btn_render_callback(
        "coordinates",
        40.7580,
        -73.9855,
        "",
        datetime(2026, 1, 1, 0, 0),
        "UTC",
        "stereographic",
        1.0,
        0.0,
        6.0,
        True,
        1.0,
        False,
        False,
        "square",
        "",
    )
    assert isinstance(image, Image.Image)


def test_render_callback_rejects_bad_lat(
    monkeypatch: Any, tiny_catalog: pl.DataFrame
) -> None:
    import pydantic

    callback: SkyMapCallback = _callback(monkeypatch, tiny_catalog)
    try:
        callback.on_btn_render_callback(
            "coordinates",
            999.0,
            0.0,
            "",
            datetime(2026, 1, 1),
            "UTC",
            "stereographic",
            1.0,
            0.0,
            6.0,
            True,
            1.0,
            False,
            False,
            "square",
            None,
        )
    except pydantic.ValidationError:
        return
    raise AssertionError("expected ValidationError for lat=999")
