# ADR-0003 — `render-spec.json` is the single normative render contract

Status: proposed
Date: 2026-09-29
Deciders: lucas

## Context and drivers

Correctness is the top driver, and after ADR-0001 two renderers implement the same poster: TypeScript in the browser (canonical) and Python/matplotlib in the CLI (offline/batch). The visual tokens already live in `site/render-spec.json` and are mirrored in Python (`src/starpy/settings/render.py`, `render/figure.py`) and TS (`site/src/lib/spec.ts`).

## Considered options

1. **Independent per-renderer constants** — drift is invisible until a poster looks wrong.
2. **Generate one renderer from the other** — no practical codegen path between matplotlib and DOM/canvas.
3. **One normative JSON spec, both renderers conform, conformance tested** (chosen).

## Decision outcome

`render-spec.json` is normative. Every visual token (colors, star size, glow, lines, labels, ring, caption band, fonts, share codec) is defined there; Python and TS constants must conform, enforced by tests on both sides. Changing the spec is a reviewed change that updates both renderers in the same PR. `site/PLAN.md`'s "Option C" note is superseded by BCR-0002.

## Consequences

Good: parity is explicit and testable; the spec is documentation and contract at once; the share codec and exported JSON schemas are covered by the same rule.

Bad: two conformance tests to keep aligned; some tokens cannot be exactly identical across engines (antialiasing, font rasterisation), so the spec pins the *values*, and a tolerance-bounded parallel run covers the *pixels*.

## Confirmation

Conformance tests pass on both sides; the parallel-run harness reports differences within the agreed tolerance before the browser default flip.
