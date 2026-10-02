# ADR-0005 — Client stack: Bun + React (latest) + TypeScript 7 + Vite; `bun:test`

Status: proposed
Date: 2026-09-29
Deciders: lucas

## Context and drivers

The client becomes the primary application (ADR-0001). It must render a poster and export PNG/SVG/PDF, be buildable on free CI, and be maintainable by one person. Driver: correctness and maintainability; cost is free tier.

## Considered options

1. **Keep today's stack** — React 19 + TS 5.8 + Vite + Vitest + npm/bun.lock mixed; Vitest already fails under `bun test` (`site/src/lib/geocode.test.ts:43,79`).
2. **Bun + React (latest) + TypeScript 7 + Vite + Tailwind + `bun:test`** (chosen) — one toolchain for install, run, and test.
3. **Add a rendering framework (Svelte/Solid)** — no driver; the app already exists in React.

## Decision outcome

Adopt option 2. Bun is the package manager, dev runtime, and test runner; TypeScript 7 (`tsgo`, the native Go compiler) replaces 5.8; React and Vite stay; Vitest is removed; the 9 test files are ported to `bun:test`. Python keeps 3.14 (`uv`, `ruff`, `ty`, `pytest`) for the CLI/data tool.

## Consequences

Good: one JS toolchain; removes the runner mismatch; faster installs/builds/typecheck (TS 7 ~10× on large codebases).

Bad: TS 7 is a new compiler — plugin/ESLint integration must be verified (`typescript-eslint` compatibility); `bun:test` coverage/reporting differs from Vitest; migration touches `tsconfig`, Vite, ESLint, and all tests.

## Confirmation

`bun test` runs every suite green (including the two geocode cases), `tsgo` typecheck passes, `vite build` succeeds, and CI is green on the migrated branch.
