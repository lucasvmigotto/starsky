"""hip_main.dat parser and download tests (fixed-width, no network)."""

from collections.abc import Iterator
from contextlib import contextmanager
from hashlib import sha256

from httpx import ConnectTimeout as httpx_ConnectTimeout
from httpx import Request as httpx_Request
from httpx import Response as httpx_Response
from polars import DataFrame as pl_DataFrame
from pytest import MonkeyPatch, raises

from starsky.data import catalog
from starsky.data.catalog import (
    HIPPARCOS_URLS,
    download_hip_main,
    parse_hip_main,
    parse_hip_main_line,
)

BODY: bytes = b"catalog bytes"
BODY_SHA256: str = sha256(BODY).hexdigest()
PRIMARY: str = "https://primary.test/hip_main.dat"
MIRROR: str = "https://mirror.test/hip_main.dat"


def serve(
    monkeypatch: MonkeyPatch, sources: dict[str, bytes | int | None]
) -> list[str]:
    """Fake the network: a body, an HTTP status, or ``None`` for a dead host."""
    requested: list[str] = []

    @contextmanager
    def fake_stream(method: str, url: str, **_: object) -> Iterator[httpx_Response]:
        requested.append(url)
        source: bytes | int | None = sources[url]
        request: httpx_Request = httpx_Request(method, url)
        if source is None:
            raise httpx_ConnectTimeout("timed out", request=request)
        if isinstance(source, int):
            yield httpx_Response(source, request=request)
        else:
            yield httpx_Response(200, content=source, request=request)

    monkeypatch.setattr(catalog, "httpx_stream", fake_stream)
    return requested


def make_line(
    hip: int = 677,
    vmag: str = " 2.07",
    ra: str = "2.09691670",
    dec: str = "29.09043130",
) -> str:
    """Build a 450-char-ish line with fields at the CDS byte positions."""
    line: list[str] = [" "] * 100
    line[8:14] = list(f"{hip:6d}")
    line[41:46] = list(vmag[-5:])
    line[51:63] = list(f"{float(ra):12.8f}")
    line[64:76] = list(f"{float(dec):12.8f}")
    return "".join(line)


def test_parse_line_spot_values() -> None:
    parsed: tuple[int, float, float, float] | None = parse_hip_main_line(make_line())
    assert parsed is not None
    hip, ra, dec, mag = parsed
    assert hip == 677
    assert ra == 2.09691670
    assert dec == 29.09043130
    assert mag == 2.07


def test_blank_coordinates_skipped() -> None:
    line: str = make_line()
    blank: str = line[:51] + " " * 12 + line[63:64] + " " * 12 + line[76:]
    assert parse_hip_main_line(blank) is None


def test_parse_frame_skips_short_and_blank() -> None:
    text: str = "\n".join([make_line(hip=1), "short", make_line(hip=2)[:51]])
    df: pl_DataFrame = parse_hip_main(text)
    assert df.height == 1
    assert df.get_column("hip").to_list() == [1]


def test_download_uses_the_first_source_when_it_works(
    monkeypatch: MonkeyPatch,
) -> None:
    requested: list[str] = serve(monkeypatch, {PRIMARY: BODY, MIRROR: BODY})
    assert download_hip_main((PRIMARY, MIRROR), BODY_SHA256) == BODY.decode()
    assert requested == [PRIMARY]


def test_download_falls_back_when_the_host_is_down(monkeypatch: MonkeyPatch) -> None:
    requested: list[str] = serve(monkeypatch, {PRIMARY: None, MIRROR: BODY})
    assert download_hip_main((PRIMARY, MIRROR), BODY_SHA256) == BODY.decode()
    assert requested == [PRIMARY, MIRROR]


def test_download_falls_back_on_an_http_error(monkeypatch: MonkeyPatch) -> None:
    serve(monkeypatch, {PRIMARY: 503, MIRROR: BODY})
    assert download_hip_main((PRIMARY, MIRROR), BODY_SHA256) == BODY.decode()


def test_download_rejects_a_file_with_the_wrong_checksum(
    monkeypatch: MonkeyPatch,
) -> None:
    requested: list[str] = serve(monkeypatch, {PRIMARY: b"tampered", MIRROR: BODY})
    assert download_hip_main((PRIMARY, MIRROR), BODY_SHA256) == BODY.decode()
    assert requested == [PRIMARY, MIRROR]


def test_download_raises_naming_every_source_when_all_fail(
    monkeypatch: MonkeyPatch,
) -> None:
    serve(monkeypatch, {PRIMARY: None, MIRROR: b"tampered"})
    with raises(RuntimeError) as caught:
        download_hip_main((PRIMARY, MIRROR), BODY_SHA256)
    assert PRIMARY in str(caught.value)
    assert MIRROR in str(caught.value)


def test_sources_start_with_cds_and_include_a_mirror() -> None:
    assert "cdsarc.cds.unistra.fr" in HIPPARCOS_URLS[0]
    assert len(HIPPARCOS_URLS) >= 2
