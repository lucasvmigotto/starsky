"""Nominatim client tests (mocked httpx via respx)."""

from typing import Any

import httpx
import pytest
import respx

from starpy.geocoding.nominatim import geocode, short_place_name
from starpy.settings import GeocodingSettings

SEARCH_URL: str = "https://nominatim.openstreetmap.org/search"


def _payload() -> list[dict[str, Any]]:
    return [
        {
            "display_name": "Times Square, New York, NY, USA",
            "lat": "40.7580",
            "lon": "-73.9855",
        }
    ]


@respx.mock
def test_happy_path_and_user_agent(tmp_geocoding_settings: GeocodingSettings) -> None:
    route: Any = respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, json=_payload())
    )
    result: dict[str, Any] = geocode("Times Square", tmp_geocoding_settings)
    assert result == {
        "display_name": "Times Square, New York, NY, USA",
        "place_short": "Times Square, New York, NY, USA",
        "lat": 40.7580,
        "lon": -73.9855,
    }
    assert route.called
    request: httpx.Request = route.calls[0].request
    assert "starpy-tests" in request.headers["User-Agent"]


@respx.mock
def test_cache_hit_makes_one_request(tmp_geocoding_settings: GeocodingSettings) -> None:
    route: Any = respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, json=_payload())
    )
    first: dict[str, Any] = geocode("Times Square", tmp_geocoding_settings)
    second: dict[str, Any] = geocode("Times Square", tmp_geocoding_settings)
    assert first == second
    assert route.call_count == 1


@respx.mock
def test_no_result_raises(tmp_geocoding_settings: GeocodingSettings) -> None:
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(200, json=[]))
    with pytest.raises(LookupError):
        geocode("Nowhere XYZ", tmp_geocoding_settings)


def test_missing_user_agent_fails_fast(
    tmp_geocoding_settings: GeocodingSettings,
) -> None:
    settings: GeocodingSettings = tmp_geocoding_settings.model_copy(
        update={"USER_AGENT": ""}
    )
    with pytest.raises(ValueError, match="User-Agent"):
        geocode("Times Square", settings)


def test_empty_place_rejected(tmp_geocoding_settings: GeocodingSettings) -> None:
    with pytest.raises(ValueError, match="non-empty"):
        geocode("   ", tmp_geocoding_settings)


def test_short_place_name_structured() -> None:
    item: dict[str, Any] = {
        "name": "Times Square",
        "display_name": "Times Square, ...",
        "address": {
            "city": "New York",
            "state": "New York",
            "country": "United States",
        },
    }
    assert short_place_name(item) == "Times Square, New York, United States"


def test_short_place_name_fallback() -> None:
    item: dict[str, Any] = {"display_name": "Somewhere Remote"}
    assert short_place_name(item) == "Somewhere Remote"
