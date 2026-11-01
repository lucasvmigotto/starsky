# BCR-0015 — The interface speaks pt-BR, and the poster's language travels in the link

Status: accepted (2026-11-01), implemented by feature 018 (specs/018-pt-br)
Owner: lucas
Date: 2026-11-01

## Current behavior

The interface is en-US only. The poster caption is pinned to en-US (ux-vision D16; spec 017 removed the last dependency on the visitor's browser locale).

## Proposed behavior

- The interface is available in en-US and pt-BR. The browser language picks it on the first visit, a footer switcher changes it, and the choice is remembered on that browser.
- The giver picks the poster's language in the Studio, defaulting to the interface language. The language is stored as an optional `lang` field in `#studio=` and `#s=` (and carried in `#e=` and `#c=`). The caption date is formatted in that language.
- An absent `lang` means en-US. `en-US` is never written, so every existing link keeps its canonical bytes and renders the same file.

## Why

Owner, 2026-11-01: "I would like to ship this application translated too in the next version". Decisions the same day: pt-BR only; the creator picks the poster language, and it is stored in the link.

## Trade-off

This supersedes D16 ("The poster stays en-US permanently") but keeps its reason: one link still draws the same poster for everyone, because the language comes from the link and never from the visitor. The cost is one more optional, validated field in the link formats, rejected (not clamped) when unknown, as BCR-0008 requires.

## What stays the same

- Every existing `#s=`, `#studio=`, `#e=` and `#c=` link, byte for byte, with every reference image and SVG pin.
- Constellation and star names, coordinates, the version string, licence and attribution notices: never translated.
- No server, no detection beyond `navigator.languages`, nothing sent anywhere.

## Confirmation

Pinned old links decode and re-encode to the same bytes. A new pt-BR caption reference image. The e2e suite passes in a pt-BR browser context, including axe and the no-scroll layouts.
