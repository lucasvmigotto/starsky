# Task recipes — one entry point for people, agents and CI.
#
# Every recipe runs in the `tools` service (`compose.tools.yml`), so a green run
# here means the same thing as a green run in CI (`containers.md` §2, §6).
# `ENGINE` is Podman when installed, Docker otherwise — never hardcoded (§1).
#
# When a workflow step and a recipe disagree, that is a bug: fix the workflow to
# call the recipe, not the other way round.

ENGINE ?= $(shell command -v podman >/dev/null 2>&1 && echo podman || echo docker)
COMPOSE ?= $(ENGINE) compose -f compose.tools.yml
# Versions are read from .tool-versions and passed as build args, so the tools
# image cannot drift from the devcontainer or CI.
PY_VERSION := $(shell awk '/^python/{print $$2}' .tool-versions)
BUN_VERSION := $(shell awk '/^bun/{print $$2}' .tool-versions)
BUILD_ARGS := --build-arg PYTHON_VERSION=$(PY_VERSION) --build-arg BUN_VERSION=$(BUN_VERSION)

.DEFAULT_GOAL := help

.PHONY: help fmt lint typecheck test test-e2e build up doctor shell clean

help: ## List the recipes
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# --- quality gates (these mirror the workflows exactly) ----------------------

fmt: ## Format the Python sources
	$(COMPOSE) run --rm offline uv run --no-sync ruff format src tests

lint: ## Lint and format-check Python, then lint the site
	$(COMPOSE) run --rm offline sh -c '\
		uv run --no-sync ruff check src tests \
		&& uv run --no-sync ruff format --check src tests \
		&& uv run --no-sync python scripts/check_declarative_imports.py src tests \
		&& cd site && bun run lint'

typecheck: ## Type-check both modules
	$(COMPOSE) run --rm offline sh -c '\
		uv run --no-sync ty check src tests && cd site && bun run typecheck'

test: ## Unit, component and reference tests (no network)
	$(COMPOSE) run --rm offline sh -c '\
		uv run --no-sync pytest -q && cd site && bun test'

test-e2e: ## Browser journeys (needs the Playwright image; not network-free)
	$(COMPOSE) run --rm tools sh -c 'cd site && bun run test:e2e'

build: ## Build the CLI package and the site bundle
	# Not `offline`: `uv build` fetches its build backend (uv-build) at build
	# time, so it needs the network even with a warm cache. The reference's
	# "--network=none once dependencies are resolved" applies to test and lint,
	# which run against the environment the image already resolved.
	$(COMPOSE) run --rm tools sh -c '\
		uv build --no-sources --out-dir /tmp/dist && cd site && bun run build'

# --- environment --------------------------------------------------------------

up: ## Build the tools image
	$(ENGINE) build -f Containerfile --target tools $(BUILD_ARGS) -t starpy-tools .

doctor: ## Compare the toolchains: .tool-versions vs the tools image
	@printf 'declared in .tool-versions: python=%s bun=%s\n' '$(PY_VERSION)' '$(BUN_VERSION)'
	@$(COMPOSE) run --rm offline sh -c 'python --version && bun --version && uv --version'
	@printf 'devcontainer pins Bun:       %s\n' \
		"$$(grep -oE '\"version\": \"[0-9][^\"]*\"' .devcontainer/devcontainer.json | head -1 || echo 'n/a — uv manages Python')"

shell: ## Interactive shell in the tools service
	$(COMPOSE) run --rm tools sh

clean: ## Remove the tools image and its cache volumes
	-$(ENGINE) rmi -f starpy-tools >/dev/null 2>&1
	-$(ENGINE) volume rm -f starpy-tools-uv starpy-tools-bun >/dev/null 2>&1
