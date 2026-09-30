# ADR-0003 — The browser is the sole renderer; `render-spec.json` is its contract

Status: proposed (supersedes the two-renderer form)
Date: 2026-09-29
Deciders: lucas

## Context and drivers

Correctness is the top driver, and the poster is the product. An earlier version
of this decision made `render-spec.json` a contract binding **two** renderers —
Python/matplotlib and the browser — with a parity harness and a tolerance. That
framing cost real effort: the harness found five genuine bugs, then the two
implementations still disagreed on constellation-label clipping, and the
difference blocked shipping. The Python render was, in the owner's words,
"additional" — the browser is the protagonist.

## Considered options

1. **Two renderers kept in lockstep** — a parity gate, a tolerance, and every
   change applied twice. Rejected: the second renderer exists only to be kept
   equal to the first, at the price of matplotlib, Skyfield, Pillow, numpy and
   scipy in the dependency tree, a 30 MB cold start, and a permanent negotiation.
2. **The browser is normative; the CLI follows best-effort** — still two
   implementations, one always chasing. Rejected: same cost, weaker guarantee.
3. **The browser is the only renderer; the CLI prepares data** (chosen, BCR-0005).

## Decision outcome

`site/render-spec.json` is the **browser's** normative contract: colours, star
sizing, glow, lines, labels, ring, caption and the unit rules
(`units.referenceDpi`). There is no second implementation to agree with, so no
parity tolerance and no drift between renderers. The Python side builds the
data (`starsky catalog`) and nothing else.

## Consequences

Good: one implementation, one contract; the Python dependency tree shrinks to
cli/httpx/polars/pydantic and the CLI's only job is reproducible data; a whole
class of "these two must match" maintenance disappears; the 30 MB ephemeris
cold start is gone.

Bad: no headless CLI rendering. Anyone scripting `starsky render` must use the
browser (or drive it) — accepted 2026-09-29. The `render-spec.json` name is now
slightly grander than its role.

## Confirmation

`grep` finds no matplotlib/skyfield/PIL in `src/`; the site builds and exports
PNG/SVG/PDF with no Python at runtime; `starsky catalog` reproduces the exact
star and segment counts (8870 / 843 at mag ≤ 6.5 on 2026-09-29).
