# Plan: Explorer interface

## Constitution Check

I–III unchanged: the poster is untouched and no server is added. IV tests first. V the Explorer stays lazy, and the budget is checked. VI keyboard, focus, WCAG, reduced motion; no outbound calls.

## Modules

| Path | Contents |
|---|---|
| `site/src/lib/explorer/inspect.ts` | Pure: `describeStar`, `describeConstellation` from scene and observer view |
| `site/src/lib/explorer/search.ts` | Pure: `searchObjects(scene, query)`, ranked exact, prefix, then substring, diacritics ignored, capped |
| `site/src/lib/explorer/metadata.ts` | Pure state machine: `expanded`, `compact`, `pinned`, with an injected clock; `formatMoment` using the same formatter family as the poster caption, without changing it |
| `site/src/lib/explorer/link.ts` | Pure: payload from controller state; debounced writer with an injected timer |
| `controller.ts` | Adds `centerOn(id)`, `setLayer`, `zoomBy`, and a settled event. Activity events drive metadata |
| `frame.ts` | Label placement tries offsets around the anchor to avoid bright stars |
| `site/src/components/explorer/` | `ExplorerToolbar`, `ExplorerInspector` (panel or sheet), `ExplorerMetadata`, `ExplorerLayers`, `ExplorerSearch` |
| `ExplorerPage.tsx` | Composes them; holds UI-only state in a reducer |
