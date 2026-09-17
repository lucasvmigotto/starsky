"""Share encode/decode round-trip tests (no network)."""

from datetime import datetime

from pytest import raises as pytest_raises

from starpy.schemas.inputs.render import RenderOptions
from starpy.schemas.share import SharePayload
from starpy.share.spec import decode_payload, encode_payload, share_link


def _payload() -> SharePayload:
    return SharePayload(
        lat=40.7580,
        lon=-73.9855,
        place="Times Square, New York, United States",
        when_utc=datetime.fromisoformat("2026-01-01T00:00:00+00:00"),
        tz="UTC",
        options=RenderOptions(title="Our Night"),
    )


def test_round_trip() -> None:
    original: SharePayload = _payload()
    fragment: str = encode_payload(original)
    assert len(fragment) < 400
    assert "=" not in fragment
    assert "+" not in fragment and "/" not in fragment
    recovered: SharePayload = decode_payload(fragment)
    assert recovered == original


def test_share_link_shape() -> None:
    link: str = share_link(_payload(), "https://starpy.pages.dev/")
    assert link.startswith("https://starpy.pages.dev/#s=")
    assert len(link) < 500


def test_rejects_garbage() -> None:
    with pytest_raises(ValueError, match="Invalid share payload"):
        decode_payload("!!!not-base64!!!")


def test_rejects_wrong_version() -> None:
    from base64 import urlsafe_b64encode as base64_urlsafe_b64encode
    from json import dumps as json_dumps
    from zlib import compress as zlib_compress

    raw: bytes = json_dumps({"v": 999}).encode()
    frag: str = base64_urlsafe_b64encode(zlib_compress(raw)).rstrip(b"=").decode()
    with pytest_raises(ValueError, match="Unsupported share version"):
        decode_payload(frag)


def test_rejects_out_of_range_coords() -> None:
    with pytest_raises(ValueError):
        SharePayload(
            lat=999.0,
            lon=0.0,
            place=None,
            when_utc=datetime.fromisoformat("2026-01-01T00:00:00+00:00"),
            tz="UTC",
        )


def test_unicode_place_round_trip() -> None:
    payload: SharePayload = _payload().model_copy(update={"place": "São Paulo · 日本"})
    assert decode_payload(encode_payload(payload)).place == "São Paulo · 日本"
