# Tasks: sky domain and camera

Feature: `009-sky-domain` | Branch: `feat/009-sky-domain` | Input: `specs/009-sky-domain/`

Tests come first for every story (constitution IV). Executor `builder`, Reviewer `thinker`.

- [x] T001 [US1] Tests then `vec.ts`, `quat.ts`
- [x] T002 [US1] Tests then `camera.ts`: handedness, poles, RA wrap, near plane, ray round trip, drag keeps the grabbed direction under the pointer, anchored zoom
- [ ] T003 [US2] Tests then `observer.ts`: agreement with `altAz()`, Meeus reference, zenith and nadir, azimuth wrap, initial camera
- [ ] T004 [US3] Tests then `scene.ts`: below-horizon stars kept, stable ids, figure-based membership, segments whose stars are missing dropped
- [ ] T005 [US4] Tests then Python names parsing, `names.json`, CI data check, third-party notice
- [ ] T006 [US5] Tests then `payload.ts`: round trip, validation, `#s=` and `#studio=` never matched
- [ ] T007 [US6] `precision.test.ts` and `finding-precision.md` with measured values
- [ ] T008 Guard test for FR-001: no forbidden imports in `lib/sky/`
