Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: cli

**Feature Branch**: `feat/cli` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: Reconstructed from `src/starpy/cli.py`, `tests/cli/test_cli.py`.

## User Scenarios & Testing

### User Story 1 - Headless poster render (Priority: P1)

`render --lat/--lon|--place --when --tz … --output out.png|pdf|svg` renders without a browser. [OBSERVED: `cli.py:85-226`]

**Independent Test**: `tests/cli/test_cli.py` (`--help` lists `--magnitude-limit`; coordinates PNG; missing location errors) passes in fast suite. [OBSERVED]

**Acceptance Scenarios**:

1. **Given** `--place`, **When** rendering, **Then** `geocode → Coordinates + place_short/display_name`. [OBSERVED: `cli.py:52-64`]
2. **Given** cached PNG key exists, **When** re-rendering same inputs, **Then** `pil_open(cached).save(output)` + `"cache hit"`. [OBSERVED: `cli.py:159-165`]
3. **Given** `.svg/.pdf` suffix, **When** rendering, **Then** vector path (`project_visible → lines/labels → format_caption → export_vector`). [OBSERVED: `cli.py:175-206`]

### User Story 2 - Cache warm + static export (Priority: P2)

`cache warm` → `{stars, segments, font}` + echo; `export-static-data --mag-limit 6.5 --output-dir static_site/public/data` writes `catalog.json` + `constellations.json`. [OBSERVED: `cli.py:38-49,245-282`]

### Edge Cases

- Neither `--place` nor `--lat/--lon` → `UsageError`. [OBSERVED: `cli.py:62-64`]
- Bad `--when` → `BadParameter` via `fromisoformat`. [OBSERVED: `cli.py:67-72`]

## Requirements

- **FR-001**: MUST lazily import Gradio only on the app path. [OBSERVED: `cli.py:80-82`]
- **FR-002**: MUST default `--tz UTC --projection stereographic --fisheye-strength 1.0 --min-separation 0.008 --magnitude-limit 5.8 --glow --constellations --constellation-labels --shape circle --output out.png`. [OBSERVED: `cli.py:86-107`]
- **FR-003**: MUST echo `rendered -> {output}` / `warmed: …` / `exported …`. [OBSERVED: `cli.py:226,242,282`]

## Success Criteria

- **SC-001**: CLI tests green; `--help` documents all flags; deterministic cache-hit verified by key test or smoke.

## Assumptions

- [ASSUMPTION: flag defaults are the product's recommended poster look; confirm.]
