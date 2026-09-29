# BCR-0003 — Retire the Hugging Face Space; the client is hosted only on R2

Status: accepted (2026-09-29)
Owner: you
Date: 2026-09-29
From: `project:refactor`, commit `51287a7`

## Current behavior

- The HF Space is one of two deploys: `hf.Dockerfile`, `app.py`, `hf.README.md`, `.github/workflows/hf_spaces.yml` (OIDC trusted publisher), `scripts/publish_space.sh`, `scripts/export_space_requirements.sh`, `requirements.txt`, `tests/ci/test_space_artifact.py`.
- The static client deploys to Cloudflare R2 (`static_r2.yml`), and its "full app" link defaults to the Space (`site/src/lib/site.ts:32-37`).

## Proposed behavior

- Delete the HF Space artifacts and workflow; drop `requirements.txt` (it exists only for the Space; the repo builds with `uv`).
- Delete `tests/ci/test_space_artifact.py`.
- The client's "full app" link becomes the R2 site itself (or is removed), not the Space.
- Optional: keep HF only as an OIDC-free artifact host if a future need appears — not now.

## Why

With Gradio removed (BCR-0001) the Space has nothing to run; the only remaining reason to keep HF is cost avoidance on R2, which the data size (~100 KB brotli) does not justify (confirmed 2026-09-29).

## Impacts

- Users: the `huggingface.co/spaces/lucasvmigotto/starpy` URL stops working (no real users, confirmed).
- CI/secrets: `hf_spaces.yml` and its OIDC setup removed; `DOCKER_HUB_PAT`, GHCR, and R2 secrets remain.
- Docs: `hf.README.md`, README HF sections, `THIRD_PARTY_NOTICES` references updated.

## Data migration

None.

## Tests that will prove it

- `grep -r huggingface` is empty outside docs; no workflow references HF.
- `uv sync --frozen` and the Docker build succeed without `requirements.txt`.
- Static-site build and R2 deploy pass with the new link target.
