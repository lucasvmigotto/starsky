# UI Specification: renderer-export

Feature: `007-renderer-export` | Layer: UI | Input: `docs/product/ux-vision.md`

This layer adds the UI contract for the export surface. It changes no rendering
behaviour and never touches `render-spec.json`.

## Coverage matrix

| Screen / flow (vision) | Feature | User story |
|---|---|---|
| Export controls (PNG · SVG · PDF) | `007-renderer-export` | US2 |
| Export progress and completion | `007-renderer-export` | US2 |
| Offline reopen of an exported poster | `007-renderer-export` | US3 |

**This feature owns no page.** `006-viewer` owns the Viewer that hosts these
controls; `007` owns the export row and its states. That is why this file is
short — the vision's own coverage rule ("every screen lands in exactly one
feature") means the other two surfaces are not duplicated here.

**Contract substitution**: no `operationId`s exist (ADR-0001). The "operations"
are `canvas.toBlob()` for PNG and the `export.ts` writers for SVG/PDF, all
synchronous in-browser.

## The export row

Inside the Viewer's action row, below the map, above the footer.

```
┌──────────────────────────────────────────┐
│ [Make your own from this sky]             │
│ [Copy link]  [PNG ▾] [SVG] [PDF]         │
│ Drawing at full resolution…               │  ← status, role="status"
└──────────────────────────────────────────┘
```

**One export surface, no more (D15).** The Viewer's footer previously offered a
"Save image" button *and* the controls offered PNG/SVG/PDF — one action under
two names, in two places. `ExportControls` is the only one; the footer button is
removed. `000-design-system` T025/T026 own the removal and its test.

**Secondary, but never buried (vision principle 3).** A file is the most
*personal* action in the product, so it stays one click from the map — it is
simply not the loudest thing on screen. Export must never outrank the poster
visually.

## Components

| Component | Role |
|---|---|
| `ExportControls` | The row; owns all three buttons and the status region |
| `Button` (primary) | "Copy link" |
| `Button` (secondary) | PNG / SVG / PDF |
| `StatusRegion` | `role="status"`, `aria-live="polite"` |

## Data

| Action | Operation | When | Notes |
|---|---|---|---|
| PNG | `canvas.toBlob("image/png")` | on click | current view, at its rendered size |
| SVG | `export.ts` writer | on click | vector, embedded font subset |
| PDF | `export.ts` writer + `addFileToVFS`/`addFont` | on click | true vector, `Identity-H`, selectable text (BCR-0006) |

**No caching or revalidation** — an export is a pure function of the current
payload. No optimistic UI: nothing is shown until the blob exists, because a
download cannot be withdrawn once the browser has handed it to the OS.

## State matrix

| Region | Loading | Empty | Success | Error |
|---|---|---|---|---|
| Format buttons | — | — | — | — |
| Status region | `viewer.export.working` | *(empty, min-height reserved so the layout does not jump)* | `viewer.export.done` | `viewer.export.failed` |
| Each button | `disabled` while any export runs — no concurrent PDFs | — | returns to idle | returns to enabled |

| Column | Value |
|---|---|
| Partial | **N/A** — an export is atomic |
| Offline | **Works** — pure client-side, no network (constitution III) |
| Unauthorised | **N/A** — no accounts |
| Stale | **N/A** — the export reflects the payload in the fragment at click time |

## Interactions

- **One export at a time.** All three buttons disable during an export; two
  concurrent `jsPDF` builds would race for the same VFS.
- **No keyboard shortcut.** One click away already, and a shortcut would
  mistrigger.
- **No confirmation.** Export is not destructive and not revocable once handed
  to the OS, so a dialog would add a click for nothing.
- **Failure does not affect the map.** The error names the format and the
  cause, and offers a retry — the poster on screen is unaffected, and the copy
  says so (`viewer.export.failed`).

## Copy

| Key | Copy |
|---|---|
| `viewer.export.png` | PNG |
| `viewer.export.svg` | SVG |
| `viewer.export.pdf` | PDF |
| `viewer.export.working` | Drawing at full resolution… |
| `viewer.export.done` | Saved {filename} |
| `viewer.export.failed` | The {format} export failed ({detail}). The map is unaffected — try again. |

`{filename}` is `starsky-sky.{ext}`.

## Accessibility

- **Landmarks**: none of its own — it lives inside the Viewer's `main`.
- **Focus**: focus never moves on export start or completion; the status region
  is `role="status"` so it is announced without stealing focus.
- **Announcement**: `viewer.export.working` → `viewer.export.done` /
  `.failed`, via `role="status"` (already present and tested —
  `ExportControls.test.tsx:78`).
- **Buttons are `<button>`, never links**, so they are reachable by keyboard
  and operable with Enter and Space. A `button`-triggered `<a download>` would
  be focusable but would not expose the same semantics.
- **Target size**: ≥44px (DS-A11Y-003). The existing export buttons are padded
  `0.5rem 1.25rem`; verify the height clears 44px after the retheme.
- **`aria-disabled` vs `disabled`**: use the native `disabled` attribute so the
  buttons are genuinely removed from the tab order while an export runs.

## Responsive

| Width | Change |
|---|---|
| ≥64rem | `[Copy link] [PNG] [SVG] [PDF]` on one row beside the map |
| 40–64rem | one row, wrapping if needed |
| <40rem | `Copy link` on its own row; the three formats wrap to a second row, **all three ≥44px** |

## Acceptance criteria

- **AC1** Given a rendered poster, when PNG is clicked, then a valid PNG is
  saved and `viewer.export.done` announces with the filename.
- **AC2** Given the same, when SVG is clicked, then a standalone SVG with the
  embedded font and no external requests is saved.
- **AC3** Given the same, when PDF is clicked, then a vector PDF with
  selectable text is saved (BCR-0006).
- **AC4** Given an export is running, when any format button is clicked, then
  nothing starts and the buttons are `disabled`.
- **AC5** Given a failed export, when it happens, then
  `viewer.export.failed` names the format and the map is unchanged.
- **AC6** Given offline, when an export runs, then it succeeds — no network is
  involved.
- **AC7** Given the Viewer footer, when it is inspected, then no second
  download control exists (D15).
- **AC8** Given a screen reader, when an export completes, then the completion
  is announced without focus moving.

## Test plan

- **Component** (`ExportControls.test.tsx`, exists — extend): idle / working /
  done / failed; `role="status"` and `aria-live="polite"` (exists); keyboard
  reachability (exists); **new** — buttons disabled during export; failure
  leaves the map untouched.
- **e2e**: the existing `j3-offline-export.spec.ts` journey covers the three
  formats and the font case; **new** — assert exactly one download control in
  the Viewer, and that a failed export shows the error copy.
- **Visual**: the export row at 3 breakpoints; ≥44px targets after the
  retheme.
- **Regression**: `render-spec.json` conformance (`spec.test.ts:32`) and the
  literal hex assertions stay green — this feature changes no poster token.

## Gaps reported upstream

- **No screen of its own.** By design; the export row lives in the Viewer.
- **`q:load` is not implied here** — `007/qa.md` already records perf
  (`[RELATIVE]` mobile 4345 ms). Export at print resolution may exceed that
  budget on mobile; if `frontend:build` measures a regression, it belongs in
  `007/qa.md`, not silently here.