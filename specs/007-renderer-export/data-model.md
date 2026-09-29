# Data model: renderer-export

Status: Draft.

All entities are in-memory, derived from the share payload plus the exported
catalog; nothing is persisted and no personal data is involved.

- **ProjectedSky** — visible stars: `hip`, unit-disc `x`, `y`, `size`
  (`14·10^(mag/-2.5)` clamped [0.6,14]), `mag`. Mirrors the CLI
  `ProjectedVisible`. [OBSERVED: `src/starpy/render/figure.py:65-111`]
- **Segment** — `abbr`, `name`, `x_a`, `y_a`, `x_b`, `y_b`.
  [OBSERVED: `src/starpy/render/constellations.py:11-46`]
- **FigureLabel** — `abbr`, `name`, `x`, `y` (mean of visible members).
  [OBSERVED: `src/starpy/render/constellations.py:49-82`]
- **Caption** — `title?`, `detail` (`coords — place · local tz`).
  [OBSERVED: `src/starpy/render/caption.py:13-38`]
- **PosterSpec** — the frozen visual contract read from `render-spec.json`:
  colours, star sizing, glow, lines, labels, ring, caption band, fonts, share
  codec. [OBSERVED: `site/render-spec.json:6-48`]
- **ExportFormat** — `png` | `svg` | `pdf`.

Relationships: `SharePayload → ProjectedSky + Segment[] + FigureLabel[] + Caption`,
composed with `PosterSpec` into a `Poster`, which an `ExportFormat` serialises.
No tables, collections or migrations (ADR-0001/0002).
