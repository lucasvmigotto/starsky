# syntax=docker/dockerfile:1
#
# The CLI data tool (BCR-0005): builds the sky JSON the browser app consumes.
# There is no server and no renderer here, so this image is a one-shot job, not
# a long-running service.
#
# Base images are build ARGs because DHI requires registry enrollment
# (`docker login dhi.io`). With enrollment, the defaults below apply:
#   BUILDER_IMAGE=dhi.io/python:3.14-debian13-dev   (shell + toolchain)
#   RUNTIME_IMAGE=dhi.io/python:3.14-debian13       (minimal, non-root 65532)
# Without DHI access, override with the public equivalents:
#   --build-arg BUILDER_IMAGE=ghcr.io/astral-sh/uv:python3.14-trixie
#   --build-arg RUNTIME_IMAGE=python:3.14-slim-trixie
# (CI builds with the public images.)
#
# The runtime stage performs NO `RUN` steps (DHI minimal images ship no
# shell): the writable cache dir is prepared in the builder and copied over.
# The job runs as numeric UID/GID 65532 (DHI default non-root user).

ARG BUILDER_IMAGE=dhi.io/python:3.14-debian13-dev
ARG RUNTIME_IMAGE=dhi.io/python:3.14-debian13

FROM ${BUILDER_IMAGE} AS builder

WORKDIR /build

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# `uv` binary present in astral images; pip-installed otherwise (DHI dev).
RUN \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    sh -c 'command -v uv >/dev/null 2>&1 || pip install --no-cache-dir uv' \
    && uv sync \
        --frozen \
        --no-install-project \
        --no-editable \
        --compile-bytecode \
        --no-dev

RUN mkdir -p /cache && chmod 777 /cache

FROM ${RUNTIME_IMAGE} AS app

WORKDIR /app

COPY ./src/starsky/ /app/starsky/

COPY \
    --from=builder \
    /build/.venv/ \
    /app/.venv/

COPY \
    --from=builder \
    /cache \
    /tmp/starsky-cache

ENV PATH="/app/.venv/bin:$PATH"
ENV HOME="/tmp"
ENV PYTHONUNBUFFERED=1

VOLUME ["/tmp/starsky-cache"]

USER 65532:65532

ENTRYPOINT ["/app/.venv/bin/python"]

CMD ["-m", "starsky", "catalog", "--output-dir", "/out"]
