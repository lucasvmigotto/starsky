# Feature: Poster Studio and share migration

Feature: `012-poster-studio` | Status: Implemented | Depends: 011 | Issue: #53 | Direction: BCR-0011, BCR-0012

## Why

Posters become an output of the sky. They need their own surface, connected to the Explorer in both directions. This lands before the landing redesign (013), so a poster can be built at every point in the sequence.

## User stories

### US1 (P1): compose a poster in the Studio

- **Given** `#studio=<draft>`, **then** a live poster preview shows with poster-only controls: shape, title, projection, fisheye, glow, separation, magnitude, constellation lines and labels. Each change redraws the preview and updates the fragment with `replaceState`.
- The place and moment show as a read-only summary. Changing them is the landing's job.
- A title the poster font can't draw shows the same message as today and is not applied.
- Export and share are available. Copy link yields a `#s=` link, never `#studio=`.

### US2 (P1): move between surfaces without losing the scene

- **Explorer → Studio:** "Create poster" opens the Studio with the same place, time, timezone, title and magnitude, and default poster composition.
- **Studio → Explorer:** "Return to Explorer" restores the same scene, and the camera the visitor left if this tab still has it; otherwise the initial view.
- **Viewer → Explorer:** "Explore this sky" on a `#s=` link opens the Explorer for its place and time. The original link isn't rewritten.
- **Viewer → Studio:** "Make your own from this sky" opens the Studio seeded from the link.

### US3 (P1): 9:16 export (BCR-0012)

- **Given** the export controls in the Viewer or Studio, **then** the visitor can pick Standard or Story (9:16), then PNG, SVG or PDF.
- **Story** output is exactly 1080 × 1920 px: the same sky and caption as a 1080 px standard poster, centered, equal margins, background color throughout.
- The choice is not stored in any link. Standard remains the default.

### US4 (P1): compatibility

- Old `#s=` fragments decode unchanged and open the Viewer. Standard exports and reference images are byte-identical. The landing keeps working as it does today until 013.

## Requirements

- **FR-001** `render-spec.json` changes only by adding the new format entry.
- **FR-002** With no story option, `renderPoster` and `buildPosterSvg` output is byte-identical to before.
- **FR-003** Scene conversions are pure and tested; bad magnitudes and options are clamped to the ranges the share validation accepts.
- **FR-004** Camera memory for the return trip is per-tab, tolerates unavailable storage, is used only if the scene matches, and is never in a link.
- **FR-005** Studio code loads lazily. Copy is in the catalogue and the vision. The bundle budget still passes.
