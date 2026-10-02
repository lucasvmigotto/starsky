Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Feature Specification: viewer

**Feature Branch**: `feat/viewer` | **Created**: 2026-09-29 | **Status**: Draft | **Input**: Reconstructed from `src/starsky/share/*`, `src/starsky/schemas/share.py`, `site/**`, `site/render-spec.json`. (Renamed from `share-static-viewer`; the poster renderer and exports moved to feature 007 per BCR-0002.)

## User Scenarios & Testing

### User Story 1 - Copyable sky link (Priority: P1)

Gradio Share or landing submit → `SharePayload(v=1,lat,lon,place,when_utc,tz,options)` → canonical JSON → zlib-9 → base64url-no-pad → `<base>/#s=`. Decode validates dict + version. [OBSERVED: `share/spec.py:20-45`; `schemas/share.py:11-28`]

**Independent Test**: `tests/share/test_spec.py` green. [OBSERVED: fast suite]

**Acceptance Scenarios**:

1. **Given** payload, **When** encoded, **Then** `json(sort_keys, separators) → compress(9) → urlsafe_b64encode strip =`. [OBSERVED: `spec.py:22-26`]
2. **Given** bad fragment/version, **When** decoded, **Then** `ValueError("Invalid share payload"|"Unsupported share version")`. [OBSERVED: `spec.py:35-39`]

### User Story 2 - Static explorer viewer (Priority: P2)

`HashRouter`: `#s=` → `ViewerPage`, else `LandingPage` (wildcard `*`). [OBSERVED: `App.tsx:7-36`] Landing validates datetime/coords, geocodes place, builds v1 payload, sets hash. [OBSERVED: `LandingPage.tsx:136-214`] Viewer states `empty|legacy|invalid|ready`; ready shows header, `SkyCanvas` + tooltip + `ViewControls` + `FiguresPanel`, `Save image` PNG, zoom 2.4 on select + Esc + reduced-motion, and pointer drag / wheel / pinch / keyboard pan and zoom. [OBSERVED: `ViewerPage.tsx:79`, `253`, `286`, `303`, `342`, `420-451`; `SkyCanvas.tsx:163-179`, `266-354`, `364-383`, `385-404`, `447-511`; `view.ts:37-108`; `ViewControls.tsx:1-49`] Canvas mirrors Python tokens (`render-spec.json:6-48`, `SPEC` in `spec.ts:5-45`); `PLAN.md:45-54` scopes static preview to stereographic, mag ≤ 5.5, no vector.

The view is one affine transform over the composed poster, `screen = C + (logical - focus) * scale`, and both the blit and the focus overlay are drawn inside it. [OBSERVED: `SkyCanvas.tsx:163-179`] Panning and zooming are that equation and its inverse, kept in `lib/view.ts` free of React and the DOM so the arithmetic can be asserted directly. [OBSERVED: `view.ts:60-108`] Scale 1 is both the home view and the floor: the poster fills its frame exactly, so the view is pinned there and panning is a no-op. [OBSERVED: `view.ts:52-53`, `60-75`]

**Independent Test**: `bun test` after `bun install`: 44 pass / 2 fail — failures are `vi.stubGlobal/unstubAllGlobals is not a function` in `geocode.test.ts:43,79` under the bun runner (vitest API), not product logic; all render-spec/astro/share/skymodel suites pass. [OBSERVED: run 2026-09-29]

### Edge Cases

- Legacy version → `LegacyState`; undecodable → `InvalidState(detail)`. [OBSERVED: `ViewerPage.tsx:26-40`; `States.tsx:8-58`]
- Horizon cut `r>1.001` dropped in `buildSkyModel`. [OBSERVED: `skymodel.ts:61-77`]

## Requirements

- **FR-001**: MUST keep Python/TS codecs byte-compatible (same canonical JSON + zlib-9 + base64url). [OBSERVED: `render-spec.json:44-48`; `encode.ts:35-79`]
- **FR-002**: MUST keep `SPEC` tokens in sync with Python (`size=14*10**(mag/-2.5)` clamp [0.6,14], glow ≤3.5, lines 0.7/0.7, labels upper 7pt, band 0.22). [OBSERVED: `spec.ts:42-45`; `render-spec.json:12-42`]
- **FR-003**: MUST consume the trimmed `catalog.json`/`constellations.json` produced by `starsky catalog` (feature 002).

## Success Criteria

- **SC-001**: Python share tests green; static suites green under repo's vitest CI path; bun-runner geocode failures resolved by running under vitest or shimming `vi`.
