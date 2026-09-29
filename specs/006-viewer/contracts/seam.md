# viewer seam (OpenAPI N/A)

- `encode_payload(SharePayload) -> str` / `decode_payload(fragment) -> SharePayload` / `share_link(payload, base_url) -> str` [share/spec.py:20-45]
- URL fragment contract: `<base>/#s=<base64url-no-pad(zlib9(canonical-JSON))>`, version 1. [render-spec.json:44-48]
