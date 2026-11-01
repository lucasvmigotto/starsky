# Finding: performance (017 A4)

Measured 2026-11-01 by `site/e2e/perf.spec.ts`, Chromium only (frame timing and CDP throttling are Chromium features), inside `mcr.microsoft.com/playwright:v1.64.1-noble` on the owner's Linux laptop under podman, with `--repeat-each=3` over the chromium and mobile-chromium projects: 6 samples per measure.

## Explorer drag

A scripted pointer drag: two circles across the canvas in 180 moves. Frame time is the gap between consecutive `requestAnimationFrame` callbacks while the sky redraws. The app drew 180 frames in every sample, one per move.

| Condition | p50 | p95, six samples | Worst max | Guard |
|---|---|---|---|---|
| Container, unthrottled | 16.7 ms | 16.7–16.8 ms (one 33.4 ms, the first run, cold) | 50.1 ms | p95 < 50 ms |
| CPU throttled ×4 (proxy) | 16.7 ms | 16.8 ms (one 33.4, one 49.9) | 83.3 ms | p95 < 200 ms |

Reading: the Explorer holds 60 Hz while dragging, even under ×4 throttling, with occasional single dropped frames.

## Poster render and export (×4 throttled proxy)

| Measure | Range over 6 samples | Budget |
|---|---|---|
| Poster render | 708–1,236 ms | 2,000 ms target, 8,000 ms guard |
| PNG export | 317–521 ms | — |
| SVG export | 71–266 ms | — |
| PDF export | 459–1,378 ms | — |

## Limits

- A container on a laptop is not a phone. CPU throttling is a relative proxy, and GPU, thermal and memory limits are not modelled.
- Firefox and WebKit timing are not measured.
- The ≤ 2 s poster budget remains an `[ASSUMPTION]` (`docs/product/test-strategy.md`). It needs a real mid-range phone, which the owner will check.
