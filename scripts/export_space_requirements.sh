#!/usr/bin/env bash
# Regenerate the Hugging Face Space requirements from the lockfile.
# The Space builder honors `python_version` from hf.README.md frontmatter,
# so this MUST resolve for that same interpreter: repo default comes from
# `.python-version` (CI pins it too). The sync test
# (tests/ci/test_space_artifact.py::test_requirements_in_sync_with_lock)
# fails if this file drifts from `uv export` output.
set -euo pipefail
cd "$(dirname "$0")/.."
uv export --frozen --no-dev --no-emit-project --no-hashes -o requirements.txt
