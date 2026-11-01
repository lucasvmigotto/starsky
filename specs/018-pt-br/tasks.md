# Tasks — 018 pt-BR

- [ ] T001 Locale core: `pt-BR.ts` typed against `en-US`, active-locale store (guarded `localStorage`), `t()` per locale, `<html lang>`, placeholder-parity test.
- [ ] T002 Footer language switcher, plus the e2e: browser `pt-BR` gives Portuguese on first visit, switching re-renders and persists, and blocked storage still works.
- [ ] T003 Translate every key in natural Brazilian Portuguese, and add the ux-vision pt-BR table. `check_i18n_keys.py` covers both locales.
- [ ] T004 Interface `Intl` formatting with the active locale (metadata, ShareDialog, Studio moment, landing date hints).
- [ ] T005 `lang` in `#s=` and `#studio=` (absent means en-US; byte-identity tests on pinned old links), then `#e=` and `#c=`. The Studio poster-language choice and the handoffs carry it.
- [ ] T006 Caption formatter takes the poster language. Add a pt-BR reference image and glyph coverage for pt-BR.
- [ ] T007 Layout checks in pt-BR: phone width, no-scroll at 1440 and 1920, and axe in pt-BR.
- [ ] T008 Docs: BCR-0015, docs site (en and pt), README, brief glossary, specs/README.
