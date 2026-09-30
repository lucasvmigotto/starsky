#!/usr/bin/env python3
"""Assert the i18n catalogue and the vision agree, in both directions.

`000-design-system` T031: a key used by a component but absent from the
catalogue must fail the build, so a language can never ship with a hole in it.

This is the CI-side half of the check. The runtime half — a key that does not
resolve renders visibly and warns — is `src/i18n/index.ts`.

Run: uv run python scripts/check_i18n_keys.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VISION = ROOT.parent / "docs" / "product" / "ux-vision.md"
CATALOGUE = ROOT / "src" / "i18n" / "en-US.ts"
# The catalogue is a TS object literal of `"key": "copy",` lines. Match the
# quoted key at the start of a line inside the object, not a `${}` template.
QUOTED = re.compile(r'^\s*"([A-Za-z]+\.[A-Za-z.]+)"\s*:', re.MULTILINE)

# Namespaces that hold user-visible copy. `color.*` and friends are tokens and
# were the first false positive this script caught.
COPY_NAMESPACES = (
    "landing.",
    "studio.",
    "viewer.",
    "figures.",
    "empty.",
    "legacy.",
    "invalid.",
    "dataError.",
    "fontError.",
    "loading.",
    "footer.",
)


def vision_keys() -> set[str]:
    """Copy keys in the vision's *Key-screen copy* tables."""
    if not VISION.exists():
        sys.exit(f"missing {VISION}")
    keys = set()
    for line in VISION.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\| `([A-Za-z]+\.[A-Za-z.]+)` \| (.+?) \|$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2).strip()
        if not key.startswith(COPY_NAMESPACES):
            continue
        if value.startswith("→") or value.startswith("*(") or value.startswith("*("):
            # A pointer row (renders another key) or a derived one (assembled
            # from several keys around inline markup). Neither exists in the
            # catalogue, so requiring it would make the check unsatisfiable.
            continue
        keys.add(key)
    return keys


def catalogue_keys() -> set[str]:
    if not CATALOGUE.exists():
        sys.exit(f"missing {CATALOGUE}")
    text = CATALOGUE.read_text(encoding="utf-8")
    return set(QUOTED.findall(text))


def main() -> int:
    vision, catalogue = vision_keys(), catalogue_keys()
    missing = sorted(catalogue - vision)
    extra = sorted(vision - catalogue)

    for key in missing:
        print(f"  catalogue has a key the vision does not: {key}")
    for key in extra:
        print(f"  vision defines a key the catalogue lacks: {key}")

    if missing or extra:
        print(f"\nFAIL: {len(missing)} unknown, {len(extra)} missing")
        print("Regenerate src/i18n/en-US.ts from the vision's copy tables.")
        return 1

    print(f"ok: {len(catalogue)} copy keys agree with the vision")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())