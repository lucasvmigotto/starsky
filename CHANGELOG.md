# Changelog

## 1.1.2 — 2026-10-04

### Fixed

- **site:** name export format group on its own, not the trigger
- **site:** use typed BASE_URL for router basename

## 1.1.1 — 2026-10-03

### Changed

- **site:** derive Vite base and router basename from env

## 1.1.0 — 2026-10-02

### Added

- Poster navigation: drag to pan, scroll to zoom, pinch on touch, arrow keys
  with `+`/`-`/`0`, and zoom controls under the poster.

### Fixed

- The poster no longer opens zoomed into its upper-left corner on HiDPI or
  browser-zoomed displays; browser zoom re-renders instead of breaking until
  reload.
- The renderer no longer draws the mirror image of its own model, so canvas
  hover names the constellation under the cursor.
- The zoomed focus veil covers the frame instead of ghosting a disc over it;
  the hover tooltip no longer captures the pointer.
