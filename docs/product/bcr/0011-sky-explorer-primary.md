# BCR-0011 — The Sky Explorer becomes the primary experience

Status: accepted (2026-10-31)
Owner: lucas
Date: 2026-10-31

## Current behavior

starsky is a poster studio. The landing is a form that builds a poster, the Viewer shows it, and pan and zoom stop at the poster frame. Stars below the horizon are discarded.

## Proposed behavior

The primary experience is a full-viewport **Sky Explorer**: rotate through the whole celestial sphere, zoom continuously, and inspect stars and constellations. The landing asks where to explore from, using place search, a geographic map or coordinates. Posters move to a separate **Poster Studio**, reached from the Explorer.

## Why

The owner approved this product direction: the sky is the product, and the poster is an artifact made from it.

## What stays the same

- `#s=` links decode and render exactly as before, and a recipient still sees the poster they were sent with no form in the way (persona P1).
- `render-spec.json`, reference images, and PNG/SVG/PDF exports.
- Static hosting, with no accounts or backend.

## What changes

- The brief's positioning and UX decisions D1 and D2 (two surfaces of equal weight) are superseded; see D20–D24 in `docs/product/ux-vision.md`.
- `#e=` is a new, separately versioned link format that holds the scene and camera.
- A second outbound call exists, for map tiles, only after the visitor opens the map (ADR-0008, constitution 1.2.0).
- Stars are shown below the horizon, dimmed and labelled as below the horizon. Observer visibility is never implied by camera visibility.

## Migration

An "Explore this sky" action on a poster link carries its place and time into the Explorer. Nothing rewrites an existing link.
