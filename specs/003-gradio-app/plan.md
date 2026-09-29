Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: gradio-app (as-is) | Status: Draft, no tasks.md.

- Shell: `build_app(SkyPage(), build_sky(...))` single `Blocks(title)`, optional `gui.load`, footer attribution. [OBSERVED: `gui/pages/main.py:15-28`; `pages/sky.py:76`]
- `build_sky` returns `Callable[[Blocks], Blocks]` binding 4 callbacks to 16-input lists. [OBSERVED: `pages/sky.py:31-103`]
- `_render_options` builds `RenderOptions(Projection(...), Shape(...), stripped title|None)`. [OBSERVED: `callbacks/skymap.py:121-145`]
- `launch_app` preloads fonts/ephemeris/catalog/lines before building UI. [OBSERVED: `main.py:19-43`]
- Tests: `test_components.py:21-39`, `test_callbacks.py:14-85` green.
