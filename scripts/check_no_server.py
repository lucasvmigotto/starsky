#!/usr/bin/env python3
"""No-server fitness function (008-site-delivery, contracts/delivery.md).

The Python side is a CLI that builds sky data — it must never grow a server:
no `gradio` import, no socket listener, no ASGI/WSGI framework. Fails CI if
any module under `src/` imports one.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

BANNED = (
    "gradio",
    "uvicorn",
    "gunicorn",
    "fastapi",
    "flask",
    "django",
    "socket",
    "http.server",
)

IMPORT = re.compile(r"^\s*(?:import|from)\s+([\w.]+)", re.MULTILINE)


def main() -> int:
    if not SRC.is_dir():
        print(f"missing {SRC}")
        return 1
    violations: list[str] = []
    for path in sorted(SRC.rglob("*.py")):
        text = path.read_text(encoding="utf-8")
        for match in IMPORT.finditer(text):
            module = match.group(1)
            top = module.split(".")[0]
            if top in BANNED or module in BANNED:
                violations.append(f"{path.relative_to(ROOT)} imports {module}")
        # Catch dynamic imports the regex above misses.
        for name in BANNED:
            if f'__import__("{name}")' in text or f"__import__('{name}')" in text:
                violations.append(
                    f"{path.relative_to(ROOT)} dynamically imports {name}"
                )
    if violations:
        for violation in violations:
            print(f"  {violation}")
        print(f"\nFAIL: {len(violations)} server-like import(s) in src/")
        return 1
    print(f"ok: no server imports in {len(list(SRC.rglob('*.py')))} modules")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
