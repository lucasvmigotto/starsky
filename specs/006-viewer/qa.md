# QA — viewer

**Risk: Medium** (impact Medium × likelihood Medium). The share codec must stay
backward compatible, `#s=` state handling has four branches, and place lookup
depends on a third party.

## Traceability

| Story / FR / SC | Layer | Test (or planned) |
|---|---|---|
| US1 encode/decode round-trip | unit | `encode.test.ts`, `share.test.ts` — **exists** |
| US1 bad fragment / wrong version | unit | `share.test.ts` → `ShareDecodeError` / `ShareVersionError` |
| US1 sample fragments decode | unit | `site.test.ts` |
| US2 landing → viewer routing | unit | `share.test.ts` / `site.test.ts` — **partial** |
| US2 place lookup | unit | `geocode.test.ts` (fetch intercepted) |
| US2 viewer states empty/legacy/invalid/ready | component | **gap** — no DOM test; `States.tsx` unverified |
| US2 sky model | unit | `skymodel.test.ts` (horizon cut, declutter, figures) |
| US2 zoom / focus / reduced-motion | e2e | **planned** |
| FR-001 codec byte-compatibility | unit | `encode.test.ts` "byte-identical to the Python encoder output" — note: the Python encoder is deleted (BCR-0005), so this now asserts the frozen output, which is exactly the compatibility guarantee needed |
| FR-003 consumes `starpy catalog` output | integration | CI asserts the JSON shape; **client-side parse untested** |

## Boundary and negative cases

- Fragment that is valid base64 but not zlib → `InvalidState`.
- Payload with an unknown option → decode rejects rather than rendering garbage.
- Coordinates at the poles (±90) and the antimeridian (±180).
- Place lookup failure (network error, empty result) → an error is shown, the
  form does not submit.
- A very long place name → the caption truncates rather than overflowing.

## e2e journeys

**J2 — Shared link round-trip** (shared with 007; owns the state branches)
1. `#s=` valid → viewer renders.
2. `#s=` corrupt → `InvalidState` with a readable message.
3. No fragment → `EmptyState` with the sample links.
4. Version mismatch → `LegacyState`.

**J4 — Place lookup**
1. Choose place mode; type a query; submit.
2. With the request intercepted to succeed → the viewer renders and the resolved
   name appears.
3. With the request intercepted to fail → an error appears and no navigation
   happens.

## Exploratory charter

- **C3 — Link edge cases, 30 min.** Hand-craft fragments: truncated, extra
  padding, an added query parameter, a very old version. Look for a crash, a
  blank screen, or an unhelpful error.

## Exit criteria

Codec tests green; state branches covered by e2e; axe clean; keyboard navigation
through the figures panel works; no open High-severity defect.
