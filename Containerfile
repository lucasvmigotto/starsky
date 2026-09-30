# syntax=docker/dockerfile:1
#
# The `tools` image — the reference environment for agents and CI.
#
# `containers.md` §2: this is what every task (lint, typecheck, test, build) runs
# in, through the project's Makefile recipes. The human devcontainer
# (`.devcontainer/devcontainer.json`) is the comfortable layer; this one is the
# reproducible one, and when the two disagree, this image is right.
#
# It carries BOTH toolchains because starpy ships two artifacts from one repo
# (the Python data CLI and the Bun site) and splitting the tools layer would
# mean running half the checks twice, in two containers, to no benefit.
#
# Build:
#   $CONTAINER_ENGINE build -f Containerfile --target tools -t starpy-tools \
#     --build-arg PYTHON_VERSION=$(awk '/^python/{print $2}' .tool-versions) \
#     --build-arg BUN_VERSION=$(awk '/^bun/{print $2}' .tool-versions) .
#
# Versions come from .tool-versions (the single source); the defaults below only
# make the file buildable standalone. `make doctor` fails if they drift.

ARG BASE_IMAGE=debian:trixie-slim
ARG PYTHON_VERSION=3.14
ARG BUN_VERSION=1.4.2

FROM ${BASE_IMAGE} AS base

ARG PYTHON_VERSION
ARG BUN_VERSION

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV TZ=UTC
ENV UV_LINK_MODE=copy

# `unzip` is not incidental: it is what the official Bun installer needs, and
# its absence is a failure this repo has already hit once.
#
# `fontconfig` + the bundled poster font are there for the reference-image
# suite: `@napi-rs/canvas` draws **nothing** without a font backend, so on a bare
# image every glyph silently vanishes and the suite compares blank canvases.
# Verified 2026-09-30 — see specs/007-renderer-export/finding-reference-drift.md.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update -qq \
    && apt-get install --yes --no-install-recommends -qq \
        ca-certificates \
        curl \
        fontconfig \
        git \
        unzip \
    && rm -rf /var/lib/apt/lists/*

# The poster font, installed where fontconfig finds it, so the container's text
# rendering matches the product's bundled face rather than a fallback.
RUN --mount=type=bind,source=assets/fonts/CormorantGaramond.ttf,target=/tmp/CormorantGaramond.ttf \
    install -Dm644 /tmp/CormorantGaramond.ttf \
        /usr/local/share/fonts/starpy/CormorantGaramond.ttf \
    && fc-cache -f >/dev/null \
    && fc-list | grep -qi cormorant

# uv, pinned. It also provisions the Python interpreter (see deps below), which
# is why no separate Python install appears here.
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    curl -LsSf https://astral.sh/uv/install.sh | sh \
    && install -m 0755 /root/.local/bin/uv /usr/local/bin/uv \
    && install -m 0755 /root/.local/bin/uvx /usr/local/bin/uvx

# Bun, pinned to .tool-versions. `bunx` is a symlink to the same binary in a
# normal install, so create it — scripts and docs assume both exist.
RUN curl -fsSL -o /tmp/bun.zip \
        "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip" \
    && unzip -q /tmp/bun.zip -d /tmp/bun \
    && install -m 0755 /tmp/bun/bun-linux-x64/bun /usr/local/bin/bun \
    && ln -sf /usr/local/bin/bun /usr/local/bin/bunx \
    && rm -rf /tmp/bun /tmp/bun.zip \
    && bun --version

FROM base AS deps

# Redeclared: an ARG is scoped per build stage, so the value does not carry
# across `FROM` even though the ENV it fed does.
ARG PYTHON_VERSION

# The venv lives OUTSIDE /src on purpose. At recipe time the repo is bind-mounted
# over /src, which would shadow any .venv baked there — so dependencies built in
# the image would be invisible at runtime. /opt/venv is not shadowed.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# Python dependencies. `uv sync` fetches the interpreter PYTHON_VERSION names
# into a shared location, then resolves the lockfile.
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    --mount=type=bind,source=pyproject.toml,target=/src/pyproject.toml \
    --mount=type=bind,source=uv.lock,target=/src/uv.lock \
    sh -c 'cd /src && uv python install "${PYTHON_VERSION}" \
        && uv sync --frozen --no-install-project --no-editable --all-groups'

# Install the project itself, editable. The package uses a src/ layout, so
# without this the bind-mounted source is not importable and `pytest` fails at
# collection with ModuleNotFoundError. A stub is enough at build time — the
# bind mount supplies the real sources at run time, and editable means the
# installed path resolves to them.
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    --mount=type=bind,source=pyproject.toml,target=/src/pyproject.toml \
    --mount=type=bind,source=README.md,target=/src/README.md \
    sh -c 'mkdir -p /src/src/starpy \
        && touch /src/src/starpy/__init__.py \
        && cd /src \
        && uv pip install --python /opt/venv/bin/python --no-deps -e .'

# Node dependencies for the site.
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    --mount=type=bind,source=site/package.json,target=/src/site/package.json \
    --mount=type=bind,source=site/bun.lock,target=/src/site/bun.lock \
    sh -c 'cd /src/site && bun install --frozen-lockfile'

# The working root: recipes mount the repo over this.
WORKDIR /src

FROM deps AS tools

# Nothing extra to install: ruff, ty and pytest arrive with the Python
# dependencies (pyproject.toml dev group), and vite/tsgo/playwright with the
# site's. A tool installed only here would be invisible to CI.
COPY --from=deps /src /src

# `uv run` must find the environment built above, and the venv's own bin needs
# to be on PATH for tools invoked directly.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

# Prove both toolchains are present and at the declared versions at build time,
# so a broken tag or a missing interpreter fails the build rather than the first
# test run.
RUN bun --version \
    && uv --version \
    && /opt/venv/bin/python --version \
    && cd /src/site \
    && bun x tsgo --version
