"""Helper unit tests (offline via respx; intentionally NOT marked integration)."""

from pathlib import Path
from typing import Any

from httpx import Response as httpx_Response
from pytest import raises as pytest_raises
from respx import get as respx_get
from respx import mock as respx_mock

from ._helpers import ensure_bsp_cached, warm_ephemeris

URL_A: str = "https://mirror-a.example/de421.bsp"
URL_B: str = "https://mirror-b.example/de421.bsp"


@respx_mock
def test_mirror_fallback(tmp_path: Path) -> None:
    respx_get(URL_A).mock(return_value=httpx_Response(500))
    route_b: Any = respx_get(URL_B).mock(
        return_value=httpx_Response(200, content=b"fake-bsp")
    )
    target: Path = ensure_bsp_cached(
        tmp_path, urls=(URL_A, URL_B), attempts=1, backoff_s=0.0
    )
    assert target.read_bytes() == b"fake-bsp"
    assert route_b.called


@respx_mock
def test_existing_file_skips_download(tmp_path: Path) -> None:
    target: Path = tmp_path / "de421.bsp"
    target.write_bytes(b"cached")
    route: Any = respx_get(URL_A).mock(return_value=httpx_Response(200, content=b"x"))
    assert ensure_bsp_cached(tmp_path, urls=(URL_A,), attempts=1) == target
    assert not route.called


@respx_mock
def test_total_outage_raises_oserror(tmp_path: Path) -> None:
    respx_get(URL_A).mock(return_value=httpx_Response(500))
    respx_get(URL_B).mock(return_value=httpx_Response(500))
    with pytest_raises(OSError, match="could not download"):
        ensure_bsp_cached(tmp_path, urls=(URL_A, URL_B), attempts=1, backoff_s=0.0)


def test_fixture_skips_on_outage(tmp_path: Path, monkeypatch: Any) -> None:
    from _pytest.outcomes import Skipped

    def _boom(settings: Any) -> Any:
        raise OSError("cannot download")

    monkeypatch.setattr(
        "tests.integration._helpers.ensure_bsp_cached", lambda *a, **k: None
    )
    monkeypatch.setattr("tests.integration._helpers.load_ephemeris", _boom)
    with pytest_raises(Skipped, match="unavailable"):
        warm_ephemeris(tmp_path)
