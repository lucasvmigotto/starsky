# Plan: sky domain and camera

Contract: `docs/product/adr/0006-explorer-camera-contract.md`.

## Constitution Check

I static: pure code and one data file. II: poster untouched. III: pure and deterministic. IV: tests first. V: data budget checked. VI: no new outbound call at runtime; names come from the existing build-time source and carry the existing CC BY-SA attribution.

## Modules (`site/src/lib/sky/`)

| File | Contents |
|---|---|
| `vec.ts` | `Vec3`, `raDecToVec`, `vecToRaDec`, `dot`, `angularDistanceDeg`, `slerp` for great-circle interpolation |
| `quat.ts` | `Quat = [x, y, z, w]`, `normalize`, `multiply`, `conjugate`, `rotate`, `fromUnitVectors` (shortest arc), `fromBasis` |
| `camera.ts` | `ExplorerCamera { orientation, fovDeg }`, `FOV_MIN_DEG`, `FOV_MAX_DEG`, `FOV_DEFAULT_DEG`, `clampFov`, `focalPx`, `worldToCamera`, `projectToViewport` (returns null past the near plane), `screenRay`, `rotateByDrag`, `zoomAnchored`, `lookAt`, `clipSegmentToNearPlane` |
| `observer.ts` | `ObservationContext`, `zenithVector`, `northHorizonVector`, `observerAltAz`, `horizonStatus`, `initialCamera`, using `gmstDegrees` from `astro.ts` |
| `scene.ts` | `prepareScene(stars, segments, names)` returning `SkyScene`: `Float64Array` vectors, stars with ids, constellations, id lookup maps |
| `payload.ts` | `ExplorerPayload` v1, `encodeExplorer`, `decodeExplorer`, `ExplorerDecodeError`, `explorerFragmentFromHash`, built on `canonicalJson`, `bytesToBase64Url`, `base64UrlToBytes`; `deflate` with `legacyHash: true` |

## `#e=` payload v1

Canonical JSON, zlib level 9, base64url with no padding. Fields: `v` (1), `lat`, `lon`, `place` (string or null), `tz`, `when_utc`, `title` (string or null), `mag` (magnitude limit), `q` (4 numbers, 5 decimals), `fov`, `layers` (object of booleans plus `below`: `"hidden"` or `"dimmed"`), `sel` (id string or null). Ranges are validated on decode, and a non-unit `q` is normalized or rejected if near zero. Never included: pointer, hover, animation or panel state.

## Data

`src/starsky/data/constellations.py`: `parse_star_names` from the index's `common_names` (`{"HIP 32349": [{"native": ..., "english": ...}]}`, using the first entry's english then native), `load_star_names` with its own `star_names.parquet`. `starsky catalog` also writes `names.json`: `{"names": [[hip, "Sirius"], ...]}`, sorted by hip.

## Precision report

`specs/009-sky-domain/finding-precision.md` plus `site/src/lib/sky/precision.test.ts`, with test-only helpers for IAU 1976 precession (Meeus ch. 21) and linear proper motion. Stars: Sirius, Arcturus, Polaris, Vega, 61 Cygni A, using published Hipparcos proper motions. Dates: 1998, 2026, 2100, 1900. Reports each error separately in degrees, and the test pins upper bounds.
