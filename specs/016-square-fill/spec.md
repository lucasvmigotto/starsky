# 016 — Square poster fills the square

Feature: `016-square-fill` | Status: In progress | Depends: 013 | Issue: #62 | Direction: BCR-0014

## Why

Owner, 2026-11-01: "when sqaure is relected, the full export should be a square, not just the margin removed". Today `shape: "square"` draws the same horizon disc as `circle` and only skips the ring and the corner mask, so a square poster is a disc on a dark square.

## User story

US1 (P1). As someone making a square poster, I want the stars to reach every edge of the square, so the poster reads as a square print, not a circle on a square.

Acceptance:
1. With `shape: "square"`, the sky fills the whole sky square in the Studio preview, the Viewer image, and PNG, SVG and PDF exports, in both the standard and story formats.
2. The square is inscribed in the horizon disc: its corners touch the horizon, and nothing below the horizon is drawn (plan non-negotiable). The horizon strips beyond each edge's midpoint are cropped.
3. Stars, lines, glow and labels scale with the sky (a uniform zoom of √2 · AXIS_EXTENT relative to today's square), clipped to the square. Labels whose anchor falls outside the square are not drawn; a label crossing the edge is clipped, never moved.
4. `circle` output stays byte for byte identical: its reference images and the standard pin pass unchanged.
5. `#s=`, `#studio=` and `#e=` stay byte-compatible. Old square links draw the new square.
6. The caption band, the story margin and every caption size stay unchanged.

## Requirements

- FR-001: Add the fill rule to `render-spec.json` as a new `shape.square` entry (for example `"fill": "inscribed"` plus the derived scale). Write no magic numbers in code (constitution II).
- FR-002: Canvas, SVG and PDF use one geometry function, so they agree. The preview hit-testing (SkyCanvas or the model's unit→pixel mapping) uses the same mapping, so hover stays on the right star.
- FR-003: The square reference image (`sydney-xmas-square.png`) is regenerated and reviewed. Add a square story reference if the story test covers shapes.
- FR-004: Keep astronomy math untouched. The zoom is a render-geometry concern only.
- FR-005: Docs: BCR-0014, the render README and contract note, and the ux-vision line on shapes.

## Out of scope

Explorer rendering, new shapes, and changes to circle.
