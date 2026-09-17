---
title: starpy
emoji: 🔭
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 6.27.0
python_version: "3.14"
app_file: app.py
license: gpl-3.0
---

# 🔭 starpy — personalized night-sky posters

> **Note:** this README is the Hugging Face Space front page (`hf.README.md`
> in the GitHub repo, published here as `README.md` by CI). Full developer
> docs live in the [GitHub repository](https://github.com/lucasvmigotto/starpy).

Self-hosted, fully open-source "custom star map poster" generator:
pick a place (or coordinates) and a moment, get a poster-quality star map
with constellation line art and a caption block.

## Use it

1. **Location tab**: choose `coordinates` (lat/lon) or `place` (free text,
   resolved via OpenStreetMap Nominatim).
2. **Date/time + timezone** (default `UTC`; 🌐 auto-detect available).
3. **Render options** accordion: projection (`stereographic`/`fisheye`),
   star density, limiting magnitude, glow, constellation lines + labels,
   circle/square shape, optional title.
4. **🖨️ Render** → poster image with download. **Copy share link** gives a
   URL for the static explorer viewer.

## Space configuration (Settings → Variables/Secrets)

| Name | Type | Purpose |
| --- | --- | --- |
| `STARPY__GEOCODING__USER_AGENT` | Secret | **Required** for place search — a real contact string. `example.com` contacts get HTTP 403 from Nominatim. |
| `STARPY__EPHEMERIS__CACHE_DIR` | Variable | Where `de421.bsp`, Hipparcos parquet, IAU lines and the poster font are cached. Point at persistent storage to skip re-downloads on restart; defaults to `/tmp/starpy-cache/ephemeris` (re-downloaded ~30 MB on cold boot otherwise). |
| `STARPY__RENDER__CACHE_DIR` | Variable | Content-addressed render cache. Same persistence note as above. |
| `STARPY__SHARE__BASE_URL` | Variable | Base URL of the static explorer viewer used by "Copy share link". |

Geocoding © OpenStreetMap contributors · Stars: Hipparcos (ESA) ·
Constellations: Stellarium IAU (CC BY-SA 4.0) · Font: Cormorant Garamond (OFL).
