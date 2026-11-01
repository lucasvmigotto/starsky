# Plan: Explorer canvas and navigation

## Constitution Check

I no server. II poster untouched, Explorer is separate (ADR-0007). III pure planning, deterministic. IV tests first. V bundle budget, lazy-loaded. VI keyboard, focus, reduced motion, Chrome and Firefox; no outbound calls.

## Modules

| Path | Contents |
|---|---|
| `site/src/lib/explorer/observerView.ts` | `prepareObserverView(scene, ctx)`: `Float64Array` of altitudes, computed only when place or time changes |
| `site/src/lib/explorer/frame.ts` | `planFrame(input)` returns a `FramePlan`: star batches by visual class, line segments, horizon and grid polylines, cardinal labels, decluttered constellation labels, selection and hover marks |
| `site/src/lib/explorer/pick.ts` | `pickAt(scene, view, camera, viewport, x, y)` |
| `site/src/lib/explorer/controller.ts` | `ExplorerController`: camera, layers, selection; pointer, wheel, pinch and key handling; invalidation; injected `requestFrame` so tests need no browser; coarse subscribers only |
| `site/src/lib/explorer/render/types.ts` | `ExplorerRenderer { render(plan, viewport); dispose() }` |
| `site/src/lib/explorer/render/canvas2d.ts` | `Canvas2dRenderer`, batching by class, no per-star blur |
| `site/src/components/explorer/ExplorerCanvas.tsx` | Canvas, `ResizeObserver`, DPR cap of 2, pointer capture, `touch-action: none`, live region |
| `site/src/components/explorer/ExplorerPage.tsx` | Loads data, decodes the link, error states |
| `site/src/App.tsx` | Adds `#e=` dispatch with `React.lazy`; other fragments unchanged |

## Rules

- **Cull:** skip stars past the near plane or more than one glyph outside the viewport, in a single pass over the typed array.
- **Star classes:** radius from magnitude, rounded into a small set of classes per frame. A faint second circle gives a restrained glow for the brightest only.
- **Picking:** tolerance about 12 CSS px, as an angle at the current `fov`. A star wins within its tolerance; otherwise the nearest projected segment within 8 px.
- **Labels:** placed at the mean of on-screen member positions; greedy by constellation brightness, selected first; dropped on collision. A cap scales with viewport area.
- **Grid:** equatorial grid sampled as polylines, off by default.
- **Test hook:** the canvas exposes `data-frames` and `data-fov`. Read by e2e, not by product code.
- **Tests:** e2e never contacts third parties.
