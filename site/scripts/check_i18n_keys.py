#!/usr/bin/env python3
"""Assert the i18n catalogues and the vision agree, in both directions.

`000-design-system` T031: a key used by a component but absent from the
catalogue must fail the build, so a language can never ship with a hole in it.
018-pt-br FR-002 adds the second locale:

- `en-US.ts` has exactly the keys of the vision's *Key-screen copy* tables;
- `pt-BR.ts` has exactly the keys of *Key-screen copy — pt-BR*, each with the
  value that table gives it (trimmed: a Markdown cell cannot hold the leading
  or trailing space a sentence split around inline code needs);
- and the two catalogues have the same keys.

This is the CI-side half of the check. The runtime half — a key that does not
resolve renders visibly and warns — is `src/i18n/index.ts`; the placeholder
parity is `src/i18n/pt-BR.test.ts`.

Run: uv run python scripts/check_i18n_keys.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VISION = ROOT.parent / "docs" / "product" / "ux-vision.md"
CATALOGUES = {
    "en-US": ROOT / "src" / "i18n" / "en-US.ts",
    "pt-BR": ROOT / "src" / "i18n" / "pt-BR.ts",
}
# The vision's section holding each locale's tables, by its exact heading.
SECTIONS = {
    "en-US": "## Key-screen copy",
    "pt-BR": "## Key-screen copy — pt-BR",
}
# The catalogue is a TS object literal of `"key": "copy",` entries, the value
# possibly on the next line. Match the quoted key at the start of a line inside
# the object, not a `${}` template.
ENTRY = re.compile(
    r'^\s*"([A-Za-z]+\.[A-Za-z.]+)"\s*:\s*"((?:[^"\\\n]|\\.)*)"',
    re.MULTILINE,
)
ROW = re.compile(r"^\| `([A-Za-z]+\.[A-Za-z.]+)` \| (.+?) \|$")

# Namespaces that hold user-visible copy. `color.*` and friends are tokens and
# were the first false positive this script caught.
COPY_NAMESPACES = (
    "landing.",
    "studio.",
    "viewer.",
    "empty.",
    "legacy.",
    "invalid.",
    "dataError.",
    "fontError.",
    "loading.",
    "footer.",
    "site.",
    "explorer.",
)


def section_lines(heading: str) -> list[str]:
    """The lines under one `## ` heading, up to the next one."""
    if not VISION.exists():
        sys.exit(f"missing {VISION}")
    lines = VISION.read_text(encoding="utf-8").splitlines()
    try:
        start = lines.index(heading)
    except ValueError:
        sys.exit(f"the vision has no `{heading}` section")
    out: list[str] = []
    for line in lines[start + 1 :]:
        if line.startswith("## "):
            break
        out.append(line)
    return out


def vision_rows(locale: str) -> dict[str, str]:
    """Key -> copy for the rows of one locale's *Key-screen copy* tables."""
    rows: dict[str, str] = {}
    for line in section_lines(SECTIONS[locale]):
        m = ROW.match(line)
        if not m:
            continue
        key, value = m.group(1), m.group(2).strip()
        if not key.startswith(COPY_NAMESPACES):
            continue
        if value.startswith("→") or value.startswith("*("):
            # A pointer row (renders another key) or a derived one (assembled
            # from several keys around inline markup). Neither exists in the
            # catalogue, so requiring it would make the check unsatisfiable.
            continue
        rows[key] = value
    return rows


def catalogue_entries(locale: str) -> dict[str, str]:
    path = CATALOGUES[locale]
    if not path.exists():
        sys.exit(f"missing {path}")
    text = path.read_text(encoding="utf-8")
    return {key: json.loads(f'"{raw}"') for key, raw in ENTRY.findall(text)}


def compare_keys(label: str, catalogue: set[str], vision: set[str]) -> int:
    missing = sorted(catalogue - vision)
    extra = sorted(vision - catalogue)
    for key in missing:
        print(f"  {label}: catalogue has a key the vision does not: {key}")
    for key in extra:
        print(f"  {label}: vision defines a key the catalogue lacks: {key}")
    return len(missing) + len(extra)


def main() -> int:
    failures = 0

    en_catalogue = catalogue_entries("en-US")
    failures += compare_keys("en-US", set(en_catalogue), set(vision_rows("en-US")))

    pt_catalogue = catalogue_entries("pt-BR")
    pt_vision = vision_rows("pt-BR")
    failures += compare_keys("pt-BR", set(pt_catalogue), set(pt_vision))
    for key in sorted(set(pt_catalogue) & set(pt_vision)):
        if pt_catalogue[key].strip() != pt_vision[key]:
            print(
                f"  pt-BR: {key} differs from the vision:\n"
                f"    catalogue: {pt_catalogue[key].strip()!r}\n"
                f"    vision:    {pt_vision[key]!r}"
            )
            failures += 1

    for key in sorted(set(en_catalogue) ^ set(pt_catalogue)):
        print(f"  the en-US and pt-BR catalogues disagree on: {key}")
        failures += 1

    if failures:
        print(f"\nFAIL: {failures} disagreement(s)")
        print("Update src/i18n/{en-US,pt-BR}.ts and the vision's copy tables together.")
        return 1

    print(f"ok: {len(en_catalogue)} copy keys agree with the vision in en-US and pt-BR")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
