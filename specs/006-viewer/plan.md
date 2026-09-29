Reconstructed by project:introspec on 2026-09-29 from 51287a78a915da74fab965cc2c27a85e4616d0e0

# Plan: viewer (as-is) | Status: Draft, no tasks.md.

- Python: `encode_payload (canonical JSON → zlib-9 → b64url strip =)`, `decode_payload (re-pad → decode → decompress → parse → v==1 check)`, `share_link = base.rstrip('/') + /#s=`. [OBSERVED: `share/spec.py:20-45`]
- TS mirrors: `canonicalJson` [OBSERVED: `encode.ts:35-60`], `bytesToBase64Url` [`encode.ts:62-69`], `encodePayload` [`encode.ts:75-79`], `decodeShareFragment` (inflate raw zlib, parse, version + field validation) [`share.ts:72-106`], `fragmentFromHash` (`s=` via `SPEC.shareLink.fragmentParam`) [`share.ts:109-113`].
- Normative tokens: `render-spec.json:6-48` (colors, star size formula, glow, lines, labels, ring, band 0.22, fonts, shareLink codec).
- Viewer: `buildSkyModel` (mag filter → `altAz` → `project` → horizon cut `r>1.001` → px/py/size; brightest-first declutter; figures/segments assembly) [OBSERVED: `skymodel.ts:51-155`]; `SkyCanvas` draw + `pickFigure` + `animateView` 650ms. [OBSERVED: `SkyCanvas.tsx:68-250`; `ViewerPage.tsx:152-212`]
- Tests: `tests/share/test_spec.py` green; `bun test` 44/46 (2 geocode-runner failures, vitest API under bun).
