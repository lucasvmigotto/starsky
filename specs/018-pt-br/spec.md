# 018 — Brazilian Portuguese

Feature: `018-pt-br` | Status: Implemented | Depends: 017 | Issue: #71 | Direction: BCR-0015, ux-vision D17

## Why

Owner, 2026-11-01: "I would like to ship this application translated too in the next version". Their decisions the same day:
- Languages: **pt-BR only**, plus the en-US default.
- Poster text: **the creator picks, and the choice is stored in the link**.

## User stories

- **US1 (P1).** A Portuguese-speaking visitor sees the whole interface in pt-BR, chosen from their browser language on the first visit and switchable in the footer. The choice is remembered on this browser, and `<html lang>` follows it.
- **US2 (P1).** A giver chooses the poster's language in the Studio, defaulting to the interface language. The caption date is formatted in that language. The language travels in `#studio=` and `#s=`, so every recipient sees the same poster.
- **US3 (P1).** Every existing link still renders exactly as before. An absent language field means en-US, and its canonical JSON and the poster's bytes are unchanged.
- **US4 (P2).** The landing and the Explorer carry the chosen poster language forward (`#c=`, `#e=`), so a poster made later starts in the same language.

## Requirements

- **FR-001** A catalogue `site/src/i18n/pt-BR.ts` with exactly the `en-US` keys, typed so that a missing key is a type error. `t()` resolves the active locale. Placeholders must match key by key, enforced by a test.
- **FR-002** `docs/product/ux-vision.md` holds a pt-BR copy table next to the en-US one. `check_i18n_keys.py` checks both locales both ways.
- **FR-003** The active locale is chosen in this order: a stored choice, then `navigator.languages` (any `pt*` gives pt-BR), then en-US. The store is `localStorage`, guarded, and works without it. The footer switcher is a labelled select or toggle with 44 px targets. The interface re-renders without a reload.
- **FR-004** Interface dates and numbers use `Intl` with the active locale. Coordinates keep the poster's format with Latin digits.
- **FR-005** Poster language is an optional top-level `lang: "pt-BR"` in `#s=` and `#studio=`. It is absent for en-US, so existing links keep byte identity. `en-US` is never written. Unknown values are rejected, not clamped (BCR-0008). The same optional field goes in `#e=` and `#c=` (tolerant in `#c=`).
- **FR-006** The caption uses an **explicit** locale everywhere: the poster language for the artifact and the active locale for the interface. It never uses the browser default. (017 already pinned the artifact to en-US.) The date is the only word the poster artifact localizes: constellation and star names are proper names (see below), and the title is the creator's own text. The display-only heading ("Night sky above {place}") follows the interface locale.
- **FR-007** Cormorant Garamond glyph coverage must include every character pt-BR captions and titles use, checked by the glyph-coverage test.
- **FR-008** A new reference image for a pt-BR caption. Every existing reference and SVG pin stays unchanged.
- **FR-009** Text expansion: layouts hold pt-BR strings at 390 px and keep the no-scroll e2e green at 1440×900 and 1920×1080.
- **FR-010** Docs: BCR-0015, the docs site (en and pt) and README note language support, and the brief glossary gains "Poster language".

## Do not translate

- Fragment formats.
- Coordinates.
- The version string.
- Licence and attribution notices.
- Constellation and star proper names.
- The `OpenStreetMap` and `Nominatim` names.

## Out of scope

Other languages (adding one later is a catalogue file plus its copy table). The docs site is already en and pt-BR.
