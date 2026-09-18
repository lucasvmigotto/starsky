#!/usr/bin/env bash
# Render the canonical sample sky (Times Square, 2026-01-01 -- the same moment
# the viewer opens to without a #s= link) and crop it to the 1200x630 social
# preview at static_site/public/og-banner.png. Deterministic inputs,
# so the output is byte-reproducible given the same data cache.
set -euo pipefail
cd "$(dirname "$0")/.."

POSTER="$(mktemp --suffix=.png)"
uv run python -m starpy render \
  --lat 40.7580 --lon -73.9855 \
  --when "2026-01-01T00:00" --tz UTC \
  --shape square --title "starpy" \
  --output "$POSTER"
uv run python - "$POSTER" "static_site/public/og-banner.png" <<'EOF'
from PIL.Image import LANCZOS as pil_LANCZOS
from PIL.Image import open as pil_open
from sys import argv as sys_argv

TARGET_W, TARGET_H = 1200, 630
image = pil_open(sys_argv[1]).convert("RGB")
scale: float = max(TARGET_W / image.width, TARGET_H / image.height)
resized = image.resize(
    (round(image.width * scale), round(image.height * scale)), pil_LANCZOS
)
left: int = (resized.width - TARGET_W) // 2
top: int = (resized.height - TARGET_H) // 2
resized.crop((left, top, left + TARGET_W, top + TARGET_H)).save(sys_argv[2])
print(f"banner -> {sys_argv[2]}")
EOF
rm -f "$POSTER"
