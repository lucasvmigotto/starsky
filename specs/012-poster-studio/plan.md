# Plan: Poster Studio and share migration

## Constitution Check

I no server. II the poster has one renderer; the story format reuses it, and the spec entry and renderer change together with a reference image. III deterministic; font rules unchanged. IV tests first. V budget checked, lazy chunk. VI keyboard, labels, no new outbound calls.

## Story format

`render-spec.json` gains `"formats": { "story": { "widthPx": 1080, "heightPx": 1920 } }`, exposed through `spec.ts`.

`lib/render/format.ts`: `PosterFormat = "standard" | "story"` and `storyMargin(sizePx)`, the vertical offset `(height - (sizePx + band)) / 2`.

- **Canvas:** `renderPoster` gets an optional trailing `offsetY = 0`, applied in its `setTransform` base (`setTransform(dpr, 0, 0, dpr, 0, offsetY * dpr)`). `renderPosterToCanvas` gets an optional format: for story it sizes the canvas to the format, fills the whole canvas with the background, then draws with the offset. Check anything that resets the transform or paints outside the translated frame (for example the circle mask).
- **SVG:** `buildPosterSvg` gets an optional format: full-size background `rect`, `height` and `viewBox` from the format, and the existing poster body wrapped in `<g transform="translate(0, margin)">`.
- **PDF:** page size from the format, drawing from the same SVG.
- **UI:** `ExportControls` gains a format choice. `EXPORT_SIZE_PX` stays 1600 for standard; story uses 1080. Story filenames end in `-story`.

## Modules

| Path | Contents |
|---|---|
| `site/src/lib/scene/convert.ts` | Pure `posterToExplorer(share, camera?)`, `explorerToPoster(explorer)`, using poster defaults for composition |
| `site/src/lib/scene/returnCamera.ts` | Per-tab camera memory in `sessionStorage`, in try/catch |
| `site/src/lib/studio/draft.ts` | `studioFragmentFromHash`, `encodeDraft`, `decodeDraft`: same codec and validation as `#s=`, different prefix |
| `site/src/components/poster/PosterFields.tsx` | Appearance fields extracted from `LandingPage`, used by both it and the Studio, with no behavior change on the landing |
| `site/src/components/studio/StudioPage.tsx` | Preview, fields, summary, export, share, return |
| `ViewerPage.tsx` | Adds the two actions only |
| `ExplorerToolbar.tsx` | Adds "Create poster" |
| `App.tsx` | Adds lazy `#studio=` dispatch |
