#!/usr/bin/env python
"""Render the parity fixture matrix with the CLI (refactor Slice 0).

Writes one PNG per case into an output directory, plus a ``manifest.json``
with the input, the PNG's sha256 and its pixel size. The browser harness
(Slice 3) renders the same cases and compares against these files within the
tolerance declared in ``specs/007-renderer-export/fixtures/parity.json``.

Needs the data caches (``python -m starpy cache warm``); no network once warm.

Usage:
    uv run python scripts/render_parity_fixtures.py --out /tmp/starpy-parity
"""

from argparse import ArgumentParser as argparse_ArgumentParser
from argparse import Namespace as argparse_Namespace
from datetime import datetime
from hashlib import sha256 as hashlib_sha256
from json import dumps as json_dumps
from json import loads as json_loads
from pathlib import Path
from re import DOTALL as re_DOTALL
from re import findall as re_findall
from typing import Any

from starpy.cli import render_sky_map  # type: ignore[attr-defined]
from starpy.data.catalog import load_hipparcos
from starpy.data.constellations import load_constellation_lines
from starpy.data.ephemeris import load_ephemeris
from starpy.data.fonts import register_cached_fonts
from starpy.render.figure import export_image
from starpy.schemas.inputs.render import RenderOptions
from starpy.settings import Settings

MATRIX: Path = (
    Path(__file__).resolve().parent.parent
    / "specs"
    / "007-renderer-export"
    / "fixtures"
    / "parity.json"
)


def _parse_when(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def main(argv: list[str] | None = None) -> int:
    parser: argparse_ArgumentParser = argparse_ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--matrix", type=Path, default=MATRIX)
    args: argparse_Namespace = parser.parse_args(argv)

    matrix_text: str = args.matrix.read_text(encoding="utf-8")
    # The fixture is a Markdown file with a fenced JSON block; extract it.
    fenced: list[str] = re_findall(r"```json\n(.*?)\n```", matrix_text, re_DOTALL)
    matrix: dict[str, Any] = json_loads(fenced[0] if fenced else matrix_text)
    out_dir: Path = args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    settings: Settings = Settings()
    # Register the bundled poster font so the CLI golden is the real face.
    register_cached_fonts(settings.EPHEMERIS.CACHE_DIR)
    _, planets, timescale = load_ephemeris(settings.EPHEMERIS)
    catalog = load_hipparcos(settings.EPHEMERIS)
    lines = load_constellation_lines(settings.EPHEMERIS.CACHE_DIR)

    entries: list[dict[str, Any]] = []
    for case in matrix["cases"]:
        options: RenderOptions = RenderOptions(**case["options"])
        image = render_sky_map(
            case["lat"],
            case["lon"],
            case["place"],
            _parse_when(case["when_utc"]),
            case["tz"],
            options,
            catalog,
            lines,
            planets,
            timescale,
            size_px=case["size_px"],
        )
        target: Path = out_dir / f"{case['id']}.png"
        export_image(image, target)
        entries.append(
            {
                "id": case["id"],
                "file": target.name,
                "size_px": case["size_px"],
                "size": list(image.size),
                "sha256": hashlib_sha256(target.read_bytes()).hexdigest(),
            }
        )
        print(f"rendered {case['id']} -> {target.name}")

    manifest: dict[str, Any] = {
        "matrix_version": matrix["version"],
        "tolerance": matrix["tolerance"],
        "cases": entries,
    }
    (out_dir / "manifest.json").write_text(
        json_dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {out_dir / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
