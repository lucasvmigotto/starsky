"""Share-link encode/decode (pure; viewer-agnostic).

Format: canonical JSON of :class:`SharePayload` -> zlib level 9 ->
URL-safe base64 (no padding) -> ``<base>/#s=<payload>``. The hash fragment
keeps shared moments out of server logs and works offline once loaded.
"""

from base64 import urlsafe_b64decode as base64_urlsafe_b64decode
from base64 import urlsafe_b64encode as base64_urlsafe_b64encode
from json import dumps as json_dumps
from json import loads as json_loads
from typing import Any
from zlib import compress as zlib_compress
from zlib import decompress as zlib_decompress
from zlib import error as zlib_error

from ..schemas.share import SHARE_VERSION, SharePayload


def encode_payload(payload: SharePayload) -> str:
    """Serialize a payload to the URL-safe ``s`` fragment string."""
    raw: bytes = json_dumps(
        payload.to_flat_dict(), sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    blob: bytes = base64_urlsafe_b64encode(zlib_compress(raw, 9))
    return blob.rstrip(b"=").decode("ascii")


def decode_payload(fragment: str) -> SharePayload:
    """Parse an ``s`` fragment back into a validated payload."""
    padded: str = fragment + "=" * (-len(fragment) % 4)
    try:
        raw: bytes = zlib_decompress(base64_urlsafe_b64decode(padded.encode("ascii")))
        data: Any = json_loads(raw.decode("utf-8"))
    except (ValueError, zlib_error) as exc:
        raise ValueError(f"Invalid share payload: {exc}") from exc
    if not isinstance(data, dict) or data.get("v") != SHARE_VERSION:
        found: object = data.get("v") if isinstance(data, dict) else data
        raise ValueError(f"Unsupported share version: {found!r}")
    return SharePayload(**data)


def share_link(payload: SharePayload, base_url: str) -> str:
    """Build the full shareable URL for ``payload``."""
    return f"{base_url.rstrip('/')}/#s={encode_payload(payload)}"
