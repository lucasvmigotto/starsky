/**
 * `en-US` catalogue — generated from `docs/product/ux-vision.md`
 * → *Key-screen copy*, not hand-typed, so a key cannot drift from the vision.
 *
 * Regenerate with `bun run i18n:extract` after editing the vision.
 *
 * `pt-BR` ships as a separate slice after the retheme (vision D17), so there is
 * exactly one locale here. Nothing user-visible may be written inline in a
 * component — that is what the `no-literal-copy` lint rule enforces.
 */
export const enUS = {
  "landing.title": "The night sky over any place and moment",
  "landing.subtitle": "Drawn from 8 000+ stars, in your browser",
  // Pre-redesign copy, kept while the Landing is rebuilt in `frontend:build`.
  // Removed with it, not translated.
  "landing.title.legacy": "Map your night sky",
  "landing.subtitle.legacy":
    "Pick a place and a moment — your poster-grade sky renders right here.",
  "landing.mode.label": "Input mode",
  "landing.moment.legend": "Date and time",
  "landing.render.legend": "Render options",
  "landing.render.fisheye": "Fisheye strength",
  "landing.render.separation": "Minimum separation",
  "landing.render.magnitude": "Limiting magnitude",
  "landing.render.lines": "Constellation lines",
  "landing.render.labels": "Constellation labels",
  "landing.render.glow": "Glow intensity",
  "landing.browse": "Just browsing?",
  "landing.browse.action": "Load a random sky",
  "landing.explain": "What is this page?",
  "landing.openShared": "Open a shared sky",
  "landing.openShared.help": "Paste a link that ends in `#s=…`",
  "landing.mapMoment": "Map a moment",
  "landing.mapMoment.help": "Choose a place and a date",
  "landing.locale.label": "Language",
  "landing.locale.en": "English",
  "landing.locale.ptBR": "Português (Brasil)",

  "studio.heading": "Map a moment",
  "studio.mode.coordinates": "Coordinates",
  "studio.mode.place": "Place",
  "studio.place.label": "Place",
  "studio.place.placeholder": "Times Square, New York",
  "studio.place.resolving": "Looking that place up…",
  "studio.place.resolved": "Showing {place}",
  "studio.place.unresolved":
    "Could not find “{query}”. Try a fuller place name, or switch to Coordinates.",
  "studio.moment.legend": "Moment",
  "studio.zone.hint": "Optional — detected from the place.",
  "studio.appearance.legend": "Appearance",
  "studio.title.label": "Title",
  "studio.title.placeholder": "Our first flat",
  "studio.updated": "Map updated",

  "viewer.heading.default": "This night sky",
  "viewer.subtitle": "A night-sky atlas moment, recomputed in your browser",
  "viewer.loading": "Charting the stars…",
  "viewer.caption": "{coords} — {place} · {local} {tz}",
  "viewer.copyLink": "Copy link",
  "viewer.linkCopied": "Link copied",
  "viewer.linkFailed": "Could not copy the link. Select the address bar and copy it.",
  "viewer.randomSky": "Load a random sky",
  "viewer.makeYourOwn": "Make your own from this sky",

  "viewer.export.png": "PNG",
  "viewer.export.svg": "SVG",
  "viewer.export.pdf": "PDF",
  "viewer.export.working": "Drawing at full resolution…",
  "viewer.export.done": "Saved {filename}",
  "viewer.export.failed":
    "The {format} export failed ({detail}). The map is unaffected — try again.",

  "empty.title": "No sky on this page yet",
  "figures.legend": "Figures in this sky",
  "figures.subtitle":
    "{count} figures above the horizon. Rest on a name to light it up, open one to draw closer.",
  "figures.reset": "Reset view",
  // The hover/focus tooltip beside the canvas. Distinct from `figures.stat`,
  // which the panel uses — a tooltip wants the tighter phrasing.
  "figures.tooltip": "{count} stars · brightest mag {mag}",
  // Screen-reader-only: the canvas is not operable by pointer alone, so the
  // figure list is the keyboard path and this says so.
  "figures.hint":
    "Use the list of figures beside the sky to explore each constellation by keyboard.",
  "figures.stat": "{count} stars, brightest mag {mag}",
  "figures.title": "Constellation figures",
  // Split around the `#s=…` fragment so it renders as `<code>` rather than as
  // literal backticks. The assembled sentence is exactly `empty.body` in the
  // vision; `i18n.test.ts` asserts the three parts read as one sentence.
  "empty.bodyPrefix":
    "This page reads a shared moment from its address — look for a link ending in ",
  "empty.bodySuffix": ".",
  "empty.action": "Load a random sky",

  "legacy.title": "An older kind of link",
  "legacy.body":
    "That link comes from an earlier version. Map a fresh moment instead.",

  "invalid.title": "This link holds no sky",
  "invalid.body":
    "The link could not be read ({detail}). It may have been cut short.",
  "landing.randomSky": "Load a random sky",

  "dataError.title": "Star data could not be loaded",
  "dataError.body": "Regenerate it with `starsky catalog` and reload.",
  // Split around the `<code>` command, as with the empty state.
  "dataError.bodyPrefix": "Star data could not be loaded ({detail}). Regenerate it with ",
  "dataError.command": "starsky catalog",
  "dataError.bodySuffix": " and redeploy.",

  "fontError.title": "The poster font could not be loaded",
  "fontError.body":
    "The poster is withheld rather than drawn in a substituted typeface.",
  "fontError.bodyPrefix": "The poster font could not be loaded ({detail}). ",
  "fontError.bodySuffix":
    " The poster is not shown, because it would render in a substituted typeface rather than the one it was designed with.",

  "loading.poster": "Drawing the sky…",

  "footer.version": "starsky v{version}",
  "footer.source": "source",
  "footer.attribution":
    "Star data from Hipparcos and JPL. Constellation lines from Stellarium (CC BY-SA 4.0). Place lookup by OpenStreetMap contributors.",
} as const;

export type CopyKey = keyof typeof enUS;