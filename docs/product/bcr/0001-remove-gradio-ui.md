# BCR-0001 — Remove the Gradio interface; Python becomes CLI-only

Status: accepted (2026-09-29)
Owner: you
Date: 2026-09-29
From: `project:refactor`, commit `51287a7`

## Current behavior

- `python -m starpy` with no subcommand launches a Gradio app (`src/starpy/cli.py:75-82`).
- The Gradio page (`src/starpy/gui/*`) is the interactive poster creator: location tabs, time/timezone, render options, download, share link (`src/starpy/gui/pages/sky.py:31-103`).
- `launch_app()` composes settings, loads ephemeris/catalog/lines, builds the Blocks app (`src/starpy/main.py:17-43`).
- The HF Space runs `app.py` → `launch_app()` (`app.py:10-23`).
- The Python CLI already renders PNG/SVG/PDF headlessly (`cli.py:85-226`).

## Proposed behavior

- Delete the Gradio UI: `src/starpy/gui/`, `src/starpy/main.py`, `app.py`, `settings/gradio.py`, `settings/hf.py`, the `gradio` dependency, and the GUI/space tests.
- `python -m starpy` with no subcommand prints CLI help (no server).
- Python keeps two capabilities only: `render` (PNG/SVG/PDF) and `cache warm` / `export-static-data`.
- `launch_app` and all `launch(**GRADIO.config)` wiring are gone.

## Why

The interactive experience moves to the browser (BCR-0002). Keeping two interactive front ends doubles the surface and forces full Python + Gradio runtime maintenance for a self-hosted tool. Goal ranking: new capability first, then maintainability.

## Impacts

- Users: the HF Space and any `python -m starpy` server disappear — acceptable: no real users observed (confirmed 2026-09-29).
- Data: none (no DB).
- Integrations: Gradio tunnel/share removed; Nominatim moves fully client-side (already is).
- Reports: `docs/product/architecture.md`, `brief.md`, `domain-model.md` lose the GUI context; `specs/003-gradio-app` retired.

## Data migration

None.

## Tests that will prove it

- `python -m starpy --help` lists only `render`, `cache`, `export-static-data`; exits without opening a port.
- `import starpy.main` fails (module removed); no `gradio` import anywhere (`grep`), enforced by a test.
- Existing CLI tests (`tests/cli/test_cli.py`) stay green.
