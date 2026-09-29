# DEPRECATED — 003-gradio-app

Retired on 2026-09-29 by BCR-0001 (accepted), under ADR-0001 (static-first,
no runtime server). The Gradio interface is removed: `src/starpy/gui/`,
`src/starpy/main.py`, `app.py`, `settings/gradio.py`, `settings/hf.py` and the
`gradio` dependency.

The stories in `spec.md` are superseded by feature **007-renderer-export** (the
browser becomes the poster renderer) and **002-cli** (Python is CLI-only).
Key entities (`RenderOptions`, `LocationInput`, `Observation`) move to those
features unchanged.

This directory is kept only as history; nothing here is built.
