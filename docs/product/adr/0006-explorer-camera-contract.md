# ADR-0006 — Sky Explorer coordinate and camera contract

Status: accepted
Date: 2026-10-31
Deciders: lucas

## Context and drivers

The Sky Explorer navigates the full celestial sphere (BCR-0011). The poster's unit-disc projections and `view.ts` cannot express that: they discard below-horizon stars and stop at the poster frame. Scientific correctness, no discontinuity at poles or at the 0°/360° wrap, and a renderer swap later (WebGL) all need one unambiguous contract before any code.

## Considered options

1. **Azimuth/altitude angles** — simple, but gimbal lock at zenith and nadir, which is where the view opens.
2. **Unit quaternion over a fixed equatorial frame, gnomonic projection** (chosen).
3. **Stereographic camera** — wider field, but it does not keep great circles straight, so constellation lines would have to be curved per frame.

## Decision outcome

Option 2. All of this is pure TypeScript, free of React and Canvas.

**World frame.** Equatorial, right-handed, unit vectors: `+X` at RA 0° Dec 0°, `+Y` at RA 90° Dec 0°, `+Z` at the north celestial pole. `v = (cos δ cos α, cos δ sin α, sin δ)`.

**Camera frame.** Right-handed: `+X` right, `+Y` up, forward is `-Z`. Seen from inside the sphere, RA increases to the left when north is up, as in the real sky. No mirroring step exists or is allowed.

**Orientation.** Unit quaternion `[x, y, z, w]`, Hamilton product, rotating camera to world: `v_world = q v_camera q*`. It is normalized after every composition. Links store it to 5 decimals (about 0.001°).

**Projection.** Gnomonic. With `c` the camera-frame vector, `c` is rejected unless `-c.z >= 0.01`; otherwise, with `f = (min(w, h) / 2) / tan(fov / 2)`:

```
sx = w / 2 + f * ( c.x / -c.z)
sy = h / 2 - f * ( c.y / -c.z)
```

Canvas coordinates are CSS pixels, `+y` down. Segments crossing the near plane are clipped in 3D before projecting.

**Field of view.** `fov` is in degrees along the shorter viewport side, from **5° to 120°**, default **100°**. The floor comes from the data: magnitude 6.5 has about 0.2 stars per square degree, so 5° still shows about 5 stars. The ceiling keeps gnomonic stretch usable; the whole sphere is reached by rotating.

**Observer.** Separate input, never part of the camera. With `LST = GMST + longitude`, `zenith = (cos φ cos LST, cos φ sin LST, sin φ)`. Altitude is `asin(v · zenith)`. Results must agree with `altAz()` in `astro.ts`, which stays the one sidereal implementation.

**Initial view.** Forward at the observer's zenith, up toward local north, default `fov`.

**Dragging.** The ray under the previous pointer position is rotated onto the ray under the current one, so the sky follows the pointer. Roll may accumulate; reset restores the initial view.

**Zoom anchoring.** `fov` changes, then the camera rotates so the direction under the pointer stays under it.

**Stable identifiers.** `HIP:<number>` for stars and `CON:<abbr>` for constellations.

**Precision.** The catalog has J2000 axes at epoch J1991.25, proper motion is ignored and no precession or nutation is applied. Measured worst case over five reference stars (`specs/009-sky-domain/finding-precision.md`): 0.03° in 1998, about 0.3° in 2026, and about 1.2° in 1900 and 2100. Altitude and azimuth carry the same error, so they are shown as approximate; their 0.1° display is a resolution, not an accuracy. Better precision would be a separate decision.

## Consequences

Good: no gimbal lock; straight constellation lines; the same contract serves a later WebGL renderer; the math is testable without a browser.

Bad: gnomonic stretch near the 120° limit; roll needs a reset to clear; a second coordinate path exists beside the poster's, on purpose.

## Confirmation

Unit tests pin: known RA/Dec vectors, handedness (RA increases to the left), poles, RA and azimuth wrap, zenith and nadir, the near plane, projection and ray round trips, agreement with `altAz()` across latitudes, and quaternion round trips.
