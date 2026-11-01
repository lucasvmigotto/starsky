# BCR-0012 — A 9:16 story format for poster exports

Status: accepted (2026-10-31)
Owner: lucas
Date: 2026-10-31

## Current behavior

Every poster export has one shape: a square sky above a caption band, about 1:1.22. That shape doesn't fill a phone-format story or reel.

## Proposed behavior

Exports offer a second format, **story**, at 1080 × 1920 px in PNG, SVG and PDF. It draws the same poster for a 1080 px width, with its sky, caption and sizes unchanged, centered vertically on the background color, with equal margins above and below. Nothing is cropped or stretched.

## Why

Owner request: posters get shared as stories.

## What stays the same

- The standard format's output, byte for byte, and its reference images.
- `#s=` links. The format is chosen at export time and is never stored in a link, so every recipient can pick either one.
- Existing `render-spec.json` values. The format is added as a new entry.

## Confirmation

A new reference image pins the story format. Existing reference tests pass unchanged.
