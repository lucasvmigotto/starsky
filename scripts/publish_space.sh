#!/usr/bin/env bash
# Publish the Gradio artifact to the Hugging Face Space repo.
#
# The Space must contain EXACTLY ONE readme: hf.README.md lands as README.md
# (the Hub only reads README.md) and the hf.README.md source file is removed,
# so a stale header-free README.md can never be published again.
#
# Usage: scripts/publish_space.sh <space-git-url>
# Requires: HF_TOKEN in the environment (OIDC-minted or manual).
# Override the push target (tests) with SPACE_REMOTE.
set -euo pipefail

SPACE_URL="${1:?usage: publish_space.sh <space-git-url>}"
: "${HF_TOKEN:?HF_TOKEN must be set (mint via OIDC trusted publisher)}"
REMOTE="${SPACE_REMOTE:-https://$HF_USERNAME:$HF_TOKEN@${SPACE_URL#https://}}"

# 1. Swap: Space README becomes the gradio one, source file removed.
cp hf.README.md README.md
git rm -q hf.README.md

# 2. Hard guard: the exact past failure (metadata-free README on the Space)
# must break the job LOUDLY instead of publishing a broken Space.
grep -q '^sdk: gradio' README.md \
    || { echo "::error::published README.md lacks 'sdk: gradio' frontmatter" >&2; exit 1; }
grep -q '^app_file: app.py' README.md \
    || { echo "::error::published README.md lacks 'app_file: app.py'" >&2; exit 1; }
test -f app.py || { echo "::error::app.py missing from publish tree" >&2; exit 1; }
test -f requirements.txt || { echo "::error::requirements.txt missing from publish tree" >&2; exit 1; }
test ! -e hf.README.md || { echo "::error::hf.README.md still present in publish tree" >&2; exit 1; }

# 3. Ephemeral publish commit (CI runner is discarded afterwards).
# NOTE: `-c name=value` must stay equals-joined: a space makes git read the
# value as the subcommand, the commit silently never happens (masked by
# `|| true`), and the Space gets published WITHOUT the README swap.
git add -A
git -c user.name="github-actions[bot]" \
    -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -m "chore: space publish ${GITHUB_SHA:-local}" || true
git push -f "$REMOTE" HEAD:main
