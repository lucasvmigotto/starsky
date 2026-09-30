# starsky — development environment

Status: Draft

How the container layers fit together, why they're shaped this way, and the
alternatives that were considered and rejected. Design by `devcontainer:setup`;
rules from `containers.md`.

## The layers

| Layer | File | Who uses it |
|---|---|---|
| Human devcontainer | `.devcontainer/devcontainer.json` | a person at the keyboard |
| `tools` image | `Containerfile` (target `tools`) | agents and CI — the reference environment |
| CLI runtime image | `Dockerfile` | production: the `starsky catalog` data job |
| Task recipes | `Makefile` | everyone; also called by CI |

`containers.md` §2: when the human devcontainer and the `tools` image disagree,
**`tools` is right** and the devcontainer has drifted. `make doctor` exists to
show that drift.

## One devcontainer, not two

starsky ships **two artifacts** — the Python CLI (a Docker image) and the site
(a Bun bundle). The Phase 1.1 rule splits a repo's devcontainers when it is an
**API + client** pair. This is not one: there is no server, the site is static,
and the two artifacts never call each other at runtime.

They also share everything a split would separate: one repository, one machine,
one developer. Neither needs its own debugger, env file, forwarded port or
restart lifecycle — the four things that justify a split.

**Rejected: `cli/` + `site/` devcontainers.** It would duplicate the base image,
the cache volumes and the IDE setup, and force two windows for work that
frequently touches both (a change to `render-spec.json` lands in the site and is
referenced by the CLI's export). The split earns its keep when modules have
independent lifecycles; these don't.

**Rejected: one container per shipped artifact in the `tools` layer.** Same
reason: `make lint` would run `ruff` in one container and `eslint` in another to
no benefit — the checks are independent, not conflicting.

## Toolchains: two features, not three

```jsonc
"features": {
  "ghcr.io/devcontainers-extra/features/uv:1": {},
  "ghcr.io/devcontainers-extra/features/bun:1": { "version": "1.4.2" }
}
```

**There is no `python` feature, deliberately.** `uv` manages interpreters: running
`uv sync` on a base with no Python at all downloads the CPython that
`pyproject.toml`'s `requires-python` demands. Verified 2026-09-30 on this base —
no `python3` present, `uv sync` fetched **CPython 3.14.7** and installed the
dependencies.

The official `python` feature was rejected for two further reasons, both found by
inspecting its metadata rather than guessing:

- it defaults `editor.defaultFormatter` to **autopep8**, while this project
  formats with **ruff** — a devcontainer whose formatter disagrees with CI
  produces spurious diffs on every save;
- its `installTools: true` default pulls flake8, black, mypy, pylint and more
  into the image, all of which ruff and ty already cover.

## Versions come from one file

`.tool-versions` holds `python 3.14` and `bun 1.4.2`. Before it existed the repo
had **four** Bun versions in play — CI used `latest`, the `devenv` catalog shipped
1.3.9, a host had 1.4.0, and the e2e container installed 1.4.2 — so "it passed
locally" meant very little.

The `Makefile` reads the file and passes the values as build args; the
devcontainer pins Bun's feature option to the same value. `uv` needs no pin,
because it resolves the interpreter from `requires-python`.

## Caches and volumes

A feature-installed runtime lands in the **user's home**, so a rebuild without a
volume re-downloads it — the CPython fetch is ~35 MB.

| Volume | Holds |
|---|---|
| `starsky-uv-cache` | uv's package cache |
| `starsky-uv-data` | uv's managed interpreters and tools |
| `starsky-bun-cache` | Bun's install cache |
| `starsky-cache` | the sky-data parquet caches the CLI writes |
| `starsky-extensions` | VS Code extensions |

A new named volume is **root-owned**, so `developer` cannot write into it on
first run. `postCreateCommand` runs a one-time `chown` rather than leaving a
manual fix that every rebuild would repeat (the pitfall in `containers.md` §3b).

## `UV_LINK_MODE=copy`

uv's default is to hardlink from its cache into the venv. The cache is on a
volume and the venv is on a bind mount — different filesystems — so hardlinking
always fails and uv prints a warning on every sync. Set once in `containerEnv`,
rather than read the warning forever.

## Pitfalls specific to this setup

- **`.env` is seeded once.** `initializeCommand` copies `.env.example` → `.env`
  only when `.env` is absent. Editing `.env.example` later does **not** refresh a
  live `.env`; run `cp .env.example .env` and recreate the container.
- **`podman compose` delegates to the docker-compose CLI**, whose `run` has no
  `--network` flag (verified 2026-09-30). The offline guarantee is therefore
  expressed as a `network_mode: none` service in `compose.tools.yml`, not as a
  CLI flag — which also keeps the recipes portable to other compose providers.
- **The `devenv` base has neither Python nor Bun.** That is the point — the
  features supply them. `python3: command not found` on the base is expected, not
  a broken image.
- **The base's default shell is zsh.** A command run without an explicit shell
  may behave differently from bash; the `Containerfile` therefore pins
  `debian:trixie-slim` (bash) rather than the zsh base, so the tools image and CI
  agree.

## The `devenv` catalog and this repo

The human devcontainer uses `ghcr.io/lucasvmigotto/devenv:debian-trixie` — the
curated family, for its non-root `developer` user, passwordless escalation, zsh +
`dottod` shell and Nerd Fonts.

The `tools` image deliberately does **not**: it builds from `debian:trixie-slim`
plus the pinned toolchains, because §2 wants that layer *thin*, pinned by digest
in release builds, and identical to what CI runs. Using the comfort image there
would make the reference environment the heavier one.

## Verification

```bash
make doctor     # .tool-versions vs the tools image
make lint       # ruff + format check + import style + eslint
make typecheck  # ty + tsgo
make test       # pytest + bun test, offline
make build      # uv build + vite build
```
