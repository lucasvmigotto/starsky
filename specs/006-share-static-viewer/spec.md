Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: share-static-viewer

**Feature Branch**: `feat/share-static-viewer` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: `src/starpy/share/*`, `src/starpy/schemas/share.py`, `static_site/**`, `static_site/render-spec.json`.

## User Scenarios & Testing

### User Story 1 - Copyable sky link (Priority: P1)

Gradio Share or landing submit → `SharePayload(v=1,lat,lon,place,when_utc,tz,options)` → canonical JSON → zlib-9 → base64url-no-pad → `<base>/#s=`. Decode validates dict + version. [OBSERVED: `share/spec.py:20-45`; `schemas/share.py:11-28`]

**Independent Test**: `tests/share/test_spec.py` green. [OBSERVED: fast suite]

**Acceptance Scenarios**:

1. **Given** payload, **When** encoded, **Then** `json(sort_keys, separators) → compress(9) → urlsafe_b64encode strip =`. [OBSERVED: `spec.py:22-26`]
2. **Given** bad fragment/version, **When** decoded, **Then** `ValueError("Invalid share payload"|"Unsupported share version")`. [OBSERVED: `spec.py:35-39`]

### User Story 2 - Static explorer viewer (Priority: P2)

`HashRouter`: `#s=` → `ViewerPage`, else `LandingPage` (wildcard `*`). [OBSERVED: `App.tsx:7-36`] Landing validates datetime/coords, geocodes place, builds v1 payload, sets hash. [OBSERVED: `LandingPage.tsx:136-214`] Viewer states `empty|legacy|invalid|ready`; ready shows header, `SkyCanvas` + tooltip + `FiguresPanel`, `Save image` PNG, zoom 2.4 + Esc + reduced-motion. [OBSERVED: `ViewerPage.tsx:20-348`; `SkyCanvas.tsx:68-250`; `FiguresPanel.tsx:27-80`] Canvas mirrors Python tokens (`render-spec.json:6-48`, `SPEC` in `spec.ts:5-45`); `PLAN.md:45-54` scopes static preview to stereographic, mag ≤ 5.5, no vector.

**Independent Test**: `bun test` after `bun install`: 44 pass / 2 fail — failures are `vi.stubGlobal/unstubAllGlobals is not a function` in `geocode.test.ts:43,79` under the bun runner (vitest API), not product logic; all render-spec/astro/share/skymodel suites pass. [OBSERVED: run 2026-09-29]

### Edge Cases

- Legacy version → `LegacyState`; undecodable → `InvalidState(detail)`. [OBSERVED: `ViewerPage.tsx:26-40`; `States.tsx:8-58`]
- Horizon cut `r>1.001` dropped in `buildSkyModel`. [OBSERVED: `skymodel.ts:61-77`]

## Requirements

- **FR-001**: MUST keep Python/TS codecs byte-compatible (same canonical JSON + zlib-9 + base64url). [OBSERVED: `render-spec.json:44-48`; `encode.ts:35-79`]
- **FR-002**: MUST keep `SPEC` tokens in sync with Python (`size=14*10**(mag/-2.5)` clamp [0.6,14], glow ≤3.5, lines 0.7/0.7, labels upper 7pt, band 0.22). [OBSERVED: `spec.ts:42-45`; `render-spec.json:12-42`]
- **FR-003**: MUST export trimmed `catalog.json`/`constellations.json` via `export-static-data`. [OBSERVED: `cli.py:245-282`]

## Success Criteria

- **SC-001**: Python share tests green; static suites green under repo's vitest CI path; bun-runner geocode failures resolved by running under vitest or shimming `vi`.
