Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# starpy — domain model (as implemented)

Status: Draft

## Contexts

Single bounded context: **Poster generation**. No sub-contexts observed — one service, no events leaving it (`asyncapi.yaml` N/A). [OBSERVED: repo-wide single `src/starpy/` package; no broker deps in `pyproject.toml:8-21`]

Infrastructure-only (not domain): Gradio Blocks wiring, Click plumbing, Skyfield `Loader`, file caches, Docker/HF/CI. [OBSERVED: `src/starpy/main.py:17-43`; `src/starpy/cli.py:75-82`]

## Aggregates (as implemented)

### PosterRequest (transient — never persisted as rows)

- Root inputs: `Coordinates(lat [-90,90], lon [-180,180])` [OBSERVED: `src/starpy/schemas/inputs/location.py:13-15`], optional `place` text + `ResolvedPlace(display_name, lat, lon)` [OBSERVED: `location.py:18-21`], `Observation(when: datetime, tz="UTC")` with `utc()` via `ZoneInfo` [OBSERVED: `observation.py:11-20`], `RenderOptions` [OBSERVED: `render.py:10-20`].
- Invariants:
  - Location: `--place` wins when given; else `--lat/--lon` required or `UsageError("Provide --lat/--lon or --place.")`. [OBSERVED: `src/starpy/cli.py:52-64`] GUI mirrors via `mode radio coordinates|place`. [OBSERVED: `src/starpy/gui/components/sky.py:64-69`]
  - Time: `when` parsed `fromisoformat` (CLI `BadParameter` on failure [OBSERVED: `cli.py:67-72`]; GUI `coerce_when` accepts datetime/epoch/iso [OBSERVED: `callbacks/skymap.py:22-30`]); naive attached to `tz_name`, converted `astimezone(UTC)`. [OBSERVED: `astro/observer.py:7-11`]
  - Options ranges: `fisheye_strength (0,3]`, `min_separation [0,0.1]`, `magnitude_limit [1,8]`, `glow_intensity [0,3]`, `projection stereographic|fisheye`, `shape circle|square`. [OBSERVED: `schemas/inputs/render.py:10-20`]

### SkyModel (derived, in-memory Polars)

- `StarCatalog(hip, ra_deg, dec_deg, mag)` sorted by mag. [OBSERVED: `data/catalog.py:65-100`; `schemas/star.py:6-10`]
- `ConstellationLines(abbr, name, hip_a, hip_b)` consecutive-HIP pairs. [OBSERVED: `data/constellations.py:33-60`; `schemas/constellation.py:6-10`]
- `ProjectedVisible(hip, x, y, mag)`: filter `mag <= limit` → `altaz_for_stars` (per-star `Star(ra/15, dec)`, `earth+wgs84.latlon`, `timescale.from_datetime`, `observe.apparent.altaz`) → keep `alt>0` → project → `declutter`. [OBSERVED: `render/figure.py:65-111`; `astro/positions.py:13-56`]
- `Segments(abbr,name,x_a,y_a,x_b,y_b)` inner-joins lines to visible twice, drops missing endpoints. [OBSERVED: `render/constellations.py:11-46`]
- `Labels(abbr,name,x,y)` = mean position of visible members per figure. [OBSERVED: `render/constellations.py:49-82`]

### Poster (output)

- Raster PNG via `compose_figure + figure_to_pil` (DPI 150, SIZE_PX 1600, caption band 0.22, axes ±1.06, glow `mag<3.5` scatter `s**2*5*intensity α0.13·min(i,2)`, main `α0.95`, lines `lw0.7 α0.7`, labels upper 7pt, circle ring `#f5efe0` lw2). [OBSERVED: `render/figure.py:114-256`]
- Vector SVG/PDF via same compose → `fig.savefig(format=suffix)`. [OBSERVED: `render/figure.py:363-380`; `cli.py:175-206`]
- Caption: `format_coords` (`abs:.4f + N/S/E/W`) + detail `"{coords} — {place} · {local} {tz}"` (place omitted when unresolved); 2 lines iff title non-empty. [OBSERVED: `render/caption.py:13-38`]
- Determinism: `cache_key = sha256(lat:.4f|lon:.4f|place|iso|tz|options_json|size)`. [OBSERVED: `render/figure.py:332-353`]

### SharePayload (versioned link)

- `SharePayload(v=1, lat, lon, place|None, when_utc, tz, options)`; `to_flat_dict = model_dump(mode=json)`. [OBSERVED: `schemas/share.py:11-28`]
- Encoding: canonical JSON (sorted, compact) → zlib-9 → base64url-no-pad → `<base>/#s=`. Decode re-pads, validates dict + `v==1` else `ValueError`. [OBSERVED: `share/spec.py:20-45`] Static TS mirrors (`SPEC.shareLink.payloadVersion`, `fragmentParam s`). [OBSERVED: `static_site/render-spec.json:44-48`; `static_site/src/lib/share.ts:72-113`]

## Lifecycles / state machines

- `Shape: circle | square`; `Projection: stereographic | fisheye`. No transitions — pure options. [OBSERVED: `schemas/enums/shape.py:6-8`; `projection.py:6-8`]
- Render cache: miss → compute → `image.save(cached)`; hit (PNG only) → `pil_open(cached).save(output)` + `"cache hit"`. [OBSERVED: `cli.py:147-165`]
- Geocode cache: `{v:1, at, result}` hit iff `v==1` and `now-at <= TTL 30d`; else Nominatim fetch + `sleep(1.0)` throttle. [OBSERVED: `geocoding/nominatim.py:60-139`]
- No order/status workflows; no authz (single-user; all checks are validation). Authorization matrix: N/A — no users/roles observed.

## Synonyms found

- Code `place` = API/CLI `--place` = GUI `place` = tables n/a (no DB) = viewer `place`. Consistent.
- `magnitude_limit` = CLI `--magnitude-limit` = GUI `magnitude_limit` = viewer `magnitude_limit`. Consistent.
- `min_separation` (code) = CLI `--min-separation` = viewer `min_separation`. Consistent.

## Open items

- Purpose/audiences remain [ASSUMPTION] until confirmation.
- No persisted domain rows; if a library/multi-user feature is planned, that is to-be (`project:refactor`), not as-is.
