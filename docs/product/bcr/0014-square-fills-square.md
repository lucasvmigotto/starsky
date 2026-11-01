# BCR-0014 — The square poster fills the square

Status: accepted (2026-11-01)
Owner: lucas
Date: 2026-11-01

## Current behavior

`shape: "square"` draws the same horizon disc as `circle`, without the ring and without the transparent corners. The result is a round sky on a dark square.

## Proposed behavior

The square sky fills its whole square. The view is zoomed so the square is inscribed in the horizon disc, with the corners on the horizon, and is clipped to the square. Stars, lines, glow and labels scale with it.

## Why

Owner, 2026-11-01: "when sqaure is relected, the full export should be a square, not just the margin removed".

## Trade-off

Filling the corners any other way would draw sky below the horizon, which the product never implies is observable. So the thin horizon strips beyond each edge's midpoint are cropped instead.

## What stays the same

- Circle output, byte for byte, with its reference images.
- `#s=`, `#studio=` and `#e=` links. Old square links draw the new square.
- The caption band, the story format and its margins.

## Confirmation

A regenerated square reference image. Existing circle references and the standard pin pass unchanged. Preview, PNG, SVG and PDF agree.
