#!/usr/bin/env bash
# Publish the Docker-SDK artifact to the Hugging Face Space repo.
#
# The Space receives a MINIMAL artifact tree — README.md (the docker one),
# Dockerfile (staged from hf.Dockerfile), app.py, requirements.txt, src/ —
# assembled in a temp dir. The live checkout is never touched, and everything
# else (tests, workflows, scripts, site incl. its PNG banner) stays
# out of the Space repo, which the Hub's no-binary pre-receive hook would
# reject.
#
# The Space must contain EXACTLY ONE readme: hf.README.md lands as README.md
# (the Hub only reads README.md) and is never present under its own name, so
# a stale header-free README.md can never be published again. Same swap
# applies to the Dockerfile: hf.Dockerfile lands as Dockerfile (the only
# name the builder reads); the repo-root Dockerfile is the Docker Hub image
# and never goes to the Space.
#
# Usage: scripts/publish_space.sh <space-git-url>
# Requires: HF_TOKEN in the environment (OIDC-minted or manual).
# Override the push target (tests) with SPACE_REMOTE.
set -euo pipefail

SPACE_URL="${1:?usage: publish_space.sh <space-git-url>}"
: "${HF_TOKEN:?HF_TOKEN must be set (mint via OIDC trusted publisher)}"
REMOTE="${SPACE_REMOTE:-https://$HF_USERNAME:$HF_TOKEN@${SPACE_URL#https://}}"

# 1. Assemble the minimal artifact tree in a temp dir (live checkout untouched).
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD -- README.md hf.README.md hf.Dockerfile app.py requirements.txt src/ \
    | tar -x -C "$STAGE"

# 2. Swap: Space README/Dockerfile become the hf ones, sources removed.
mv "$STAGE/hf.README.md" "$STAGE/README.md"
mv "$STAGE/hf.Dockerfile" "$STAGE/Dockerfile"

# 3. Hard guard: the exact past failure (metadata-free README on the Space)
# must break the job LOUDLY instead of publishing a broken Space.
grep -q '^sdk: docker' "$STAGE/README.md" \
    || { echo "::error::published README.md lacks 'sdk: docker' frontmatter" >&2; exit 1; }
grep -q '^app_port: 7860' "$STAGE/README.md" \
    || { echo "::error::published README.md lacks 'app_port: 7860'" >&2; exit 1; }
test -f "$STAGE/app.py" || { echo "::error::app.py missing from publish tree" >&2; exit 1; }
test -f "$STAGE/requirements.txt" || { echo "::error::requirements.txt missing from publish tree" >&2; exit 1; }
test -f "$STAGE/Dockerfile" || { echo "::error::Dockerfile missing from publish tree" >&2; exit 1; }
grep -Eq '^FROM python:3\.(1[4-9]|[2-9][0-9]*)' "$STAGE/Dockerfile" \
    || { echo "::error::Space Dockerfile must pin python >=3.14" >&2; exit 1; }
test ! -e "$STAGE/hf.README.md" || { echo "::error::hf.README.md still present in publish tree" >&2; exit 1; }
test ! -e "$STAGE/hf.Dockerfile" || { echo "::error::hf.Dockerfile still present in publish tree" >&2; exit 1; }

# 4. Commit the staged tree and push it (fresh repo: always non-empty).
# NOTE: `-c name=value` must stay equals-joined: a space makes git read the
# value as the subcommand and the commit silently never happens.
git -C "$STAGE" init -q -b main
git -C "$STAGE" add -A
git -C "$STAGE" -c user.name="github-actions[bot]" \
    -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -qm "chore: space publish ${GITHUB_SHA:-local}"
git -C "$STAGE" push -f "$REMOTE" HEAD:main
