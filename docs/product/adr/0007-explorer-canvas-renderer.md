# ADR-0007 — Canvas 2D first, behind a renderer boundary, apart from the poster

Status: accepted
Date: 2026-10-31
Deciders: lucas

## Context and drivers

The Explorer redraws per frame from a moving camera. The poster composes once to a fixed frame under `render-spec.json` (ADR-0003). Stretching `SkyCanvas` would tie navigation to poster bounds and risk the poster's reference images. The owner approved Canvas 2D for the first milestone and WebGL as a separate track.

## Considered options

1. **Extend `SkyCanvas`** — smallest diff, but poster geometry leaks into navigation.
2. **New Canvas 2D renderer behind an interface** (chosen).
3. **WebGL now** — better at scale, but not needed for 8,870 stars, and explicitly out of this milestone.

## Decision outcome

Option 2. ADR-0003's "one renderer" stays true for the poster: the Explorer is a separate view, never a poster output. `render-spec.json` does not govern it; its colors come from the design tokens.

- **Frame planning is pure.** `planFrame(scene, camera, viewport, layers, selection, hover)` returns draw lists with no Canvas calls, and is deterministic for the same inputs.
- **The backend only draws.** `ExplorerRenderer { render(plan, viewport): void; dispose(): void }`, implemented by `Canvas2dRenderer`. A WebGL backend would implement the same interface.
- **Scheduling.** Frames are requested on invalidation through `requestAnimationFrame`. An idle scene draws nothing. High-frequency camera state lives in a controller outside React.
- **Picking** works on scene data and the camera, not pixels: nearest star by angle, then brighter magnitude; otherwise the nearest projected segment.

The poster modules (`skymodel.ts`, `view.ts`, `render/*`, `SkyCanvas.tsx`) are not changed by this renderer.

## Consequences

Good: reference images and `#s=` are out of the blast radius; rendering decisions can be tested without a canvas; WebGL stays a drop-in.

Bad: some star-styling logic exists twice, once per renderer, which is the accepted price of separation.

## Confirmation

Poster reference tests stay untouched and green. `planFrame` determinism is tested. An e2e test confirms no frames are drawn while idle.
