# Feature: sky domain and camera

Feature: `009-sky-domain` | Status: In progress | Depends: 005 | Direction: BCR-0011

## Why

The Sky Explorer needs astronomy and camera logic that is independent of React, Canvas and the poster, and that keeps stars below the horizon. Star names have to exist before search and the inspector can show them. The stated precision has to be measured, not assumed.

## User stories

### US1 (P1): a correct camera over the whole sphere

A developer can compute where any catalog star appears for any camera and viewport, per ADR-0006.

- **Given** the camera looks at RA 0° Dec 0° with north up, **then** a star at RA +10° projects left of center.
- **Given** a camera at either celestial pole or across the RA 0°/360° wrap, **then** projection stays continuous and finite.
- **Given** a star behind the camera, **then** projection rejects it.
- **Given** a screen point, **then** its ray projects back to that point.

### US2 (P1): observer visibility, separate from the camera

- **Given** an observer, moment and star, **then** altitude and azimuth agree with `altAz()` in `astro.ts`, and a published reference case (Meeus, *Astronomical Algorithms*, ex. 13.b) within 0.02°.
- **Given** a star below the horizon, **then** it stays in the scene and is classified `below`.

### US3 (P1): a scene with stable identity

- **Given** the catalog, **then** the prepared scene keeps every star with an id `HIP:<n>`, a unit vector and its name if known, and every constellation with an id `CON:<abbr>`, name, members and brightest star.
- Constellation membership is figure-based only: a star belongs to a constellation only if a figure line uses it.

### US4 (P2): star names

- **Given** the data build, **then** `names.json` holds the names from the same Stellarium index, and `catalog.json` and `constellations.json` are byte-identical to before.

### US5 (P1): `#e=` links

- **Given** a scene and camera, **then** encoding and decoding round-trips, and bad input fails with a typed error.
- **Given** any `#s=` or `#studio=` fragment, **then** neither is read as an Explorer link, and `#s=` behavior is unchanged.

### US6 (P1): measured precision

- **Given** representative stars, **then** a report states the measured error from catalog epoch, proper motion and precession at chosen dates, against independent values.

## Requirements

- **FR-001** No module in `site/src/lib/sky/` imports React, DOM or Canvas APIs, or poster modules other than `astro.ts`.
- **FR-002** `astro.ts`, `skymodel.ts`, `view.ts`, `render/*`, `share.ts`, `encode.ts` behavior, `render-spec.json` and reference images do not change.
- **FR-003** Vectors are stored in typed arrays so per-frame work allocates little.
- **FR-004** Data budget (400 KB brotli) still passes.

## Out of scope

Rendering, input handling, UI. Correcting positions for precession or proper motion: this feature measures them, and any correction is a separate decision.
