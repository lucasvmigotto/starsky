"""Share-link encode/decode (pure; viewer-agnostic).

Format: canonical JSON of :class:`SharePayload` -> zlib level 9 ->
URL-safe base64 (no padding) -> ``<base>/#s=<payload>``. The hash fragment
keeps shared moments out of server logs and works offline once loaded.
"""

import base64
import json
import zlib
from typing import Any

from ..schemas.share import SHARE_VERSION, SharePayload


def encode_payload(payload: SharePayload) -> str:
    """Serialize a payload to the URL-safe ``s`` fragment string."""
    raw: bytes = json.dumps(
        payload.to_flat_dict(), sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    blob: bytes = base64.urlsafe_b64encode(zlib.compress(raw, 9))
    return blob.rstrip(b"=").decode("ascii")


def decode_payload(fragment: str) -> SharePayload:
    """Parse an ``s`` fragment back into a validated payload."""
    padded: str = fragment + "=" * (-len(fragment) % 4)
    try:
        raw: bytes = zlib.decompress(base64.urlsafe_b64decode(padded.encode("ascii")))
        data: Any = json.loads(raw.decode("utf-8"))
    except (ValueError, zlib.error) as exc:
        raise ValueError(f"Invalid share payload: {exc}") from exc
    if not isinstance(data, dict) or data.get("v") != SHARE_VERSION:
        found: object = data.get("v") if isinstance(data, dict) else data
        raise ValueError(f"Unsupported share version: {found!r}")
    return SharePayload(**data)


def share_link(payload: SharePayload, base_url: str) -> str:
    """Build the full shareable URL for ``payload``."""
    return f"{base_url.rstrip('/')}/#s={encode_payload(payload)}"
