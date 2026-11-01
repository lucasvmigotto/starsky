# Finding — e2e stability (017 A5)

Run: the full Playwright suite, all projects (chromium, firefox,
mobile-chromium), `--repeat-each=3 --retries=0`, in the pinned container
`mcr.microsoft.com/playwright:v1.64.1-noble` on the development machine.

## First run (before the fixes below)

2,594 passed, 135 skipped (by design), the rest failed — 24.6 min. Two causes,
neither a product defect:

1. **`contrast.spec.ts`, every test, every project — deterministic.** The
   `noUncheckedIndexedAccess` refactor (A6) replaced `data[0]` with the
   Node-side helper `at(data, 0)` inside a `page.evaluate` callback. That
   callback runs in the browser, where `at` does not exist:
   `ReferenceError: at is not defined`. The contrast checks never ran.
   **Fix:** destructure the pixel with defaults
   (`const [r = 0, g = 0, b = 0, a = 0] = …data`) and drop the import. No other
   e2e file uses the helpers inside a browser callback (checked).
2. **`explorer-motion.spec.ts`, two tests, intermittent (1 in 15).** The tests
   step the paused page clock one frame at a time and stopped as soon as
   `data-fov` read `100.000`. That attribute is printed to three decimals, so it
   reads `100.000` one frame before the glide's last; with the clock paused the
   camera then stayed a hair short of the goal
   (`0.9042013…` against `0.9042018…`) and the exact `data-q` assertion timed
   out. **Fix:** step until the glide has landed — fov at 100 *and* the
   orientation exactly the goal.

## After the fixes

- `explorer-motion.spec.ts`, all projects, `--repeat-each=10`: 120 passed.
- `contrast.spec.ts`: 18 passed (6 tests × 3 projects).
- The full suite, all projects, once: 885 passed, 45 skipped (by design), 0 failed — 7.8 min. Unit: 1,031 pass. Bundle 391 KB brotli (budget 500 KB).

## Also found on the way

The poster's moment line and caption were formatted with the visitor's browser
locale (`Intl.DateTimeFormat(undefined, …)`), so the same `#s=` link drew
"25 de dez. de 2024" for a pt-BR visitor and "Dec 25, 2024" for an en-US one —
in the exported PNG/SVG/PDF too. That breaks artifact determinism. **Fix:**
`CAPTION_LOCALE = "en-US"` in `site/src/lib/caption.ts`; a pt-BR browser
context e2e (`j2-share-link.spec.ts`) fails without the pin and passes with it.
Spec 018 (pt-BR) will make the caption locale come from the link, explicitly.
