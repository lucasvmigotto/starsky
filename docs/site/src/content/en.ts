import type { PageContent } from "./types.ts";

export const overviewEn: PageContent = {
  title: "Overview",
  summary:
    "starsky is a static, client-only night-sky poster studio: the browser renders the poster and exports print-grade files, and a small Python CLI builds the sky data.",
  sections: [
    {
      heading: "What it is",
      paragraphs: [
        "starsky draws the night sky over any place and moment, in the browser. Search for a place, or type coordinates, pick a date and time, and open the sky in the Explorer: drag to look around, zoom, switch layers, select a star or a constellation. When the sky is right, make a poster of it in the Poster Studio and export PNG, SVG or PDF. A shared link carries the whole sky in its fragment, so the same link renders the same poster for everyone.",
        "There is no server, no database, and no accounts. The site is static files on Cloudflare R2; the only Python in the product builds the star data the browser fetches.",
      ],
    },
    {
      heading: "How it fits together",
      paragraphs: [
        "The CLI downloads the Hipparcos catalog, Stellarium constellation lines and star names once, then exports three JSON files. The site fetches those files and does its own astronomy and place lookup, so the CLI never renders and never serves anything.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos catalog ─┐\n                   ├─ starsky (CLI) ──► catalog.json, constellations.json, names.json ──┐\nStellarium IAU ────┘                                                               │\n                                                                                   ▼\n                                          site/ (React + TS) ──► Explorer, poster PNG / SVG / PDF",
        },
      ],
    },
    {
      heading: "Four surfaces",
      paragraphs: [
        "The flow is landing, then Explorer, then export. The landing asks one question, where do you want to explore the sky from, and its one action, Explore this sky, opens the Explorer. The Explorer (#e=) is the primary surface. The Poster Studio (#studio=) composes and exports a poster. The poster page (#s=) shows a shared poster exactly as it was made. Each has its own page in these docs.",
        "Privacy: starsky stores nothing and has no accounts. Links carry their payload in the URL fragment, which the browser never sends to the host. The one exception to be aware of is OpenStreetMap: place search (Nominatim) and the landing map tiles run from your browser, so OpenStreetMap sees your IP address.",
      ],
    },
    {
      heading: "Languages",
      paragraphs: [
        "The interface speaks English (en-US) and Brazilian Portuguese (pt-BR). The first visit follows your browser's language; the switcher in the footer changes it, and the choice is remembered on this browser only. Switching re-renders the page in place, keeping what you typed.",
        "The poster has its own language, the poster language, chosen in the Poster Studio and stored in the link. The browser of whoever opens the link never changes it, so everyone sees the same poster. Constellation and star names, coordinates, the version and the data credits are never translated.",
      ],
    },
  ],
};

export const installEn: PageContent = {
  title: "Install",
  summary:
    "Prerequisites and first commands: warm the data caches, export the sky data, and run the site locally.",
  sections: [
    {
      heading: "Prerequisites",
      paragraphs: [
        "Python 3.14 with uv, and Bun 1.4.2 (both pinned in .tool-versions). No database, no services, no credentials for a local run.",
      ],
    },
    {
      heading: "Build the sky data",
      paragraphs: [
        "Sync dependencies, warm the local caches (downloads the Hipparcos catalog and Stellarium lines), then export the JSON the site reads. The default output directory is site/public/data.",
      ],
      code: [
        {
          lang: "bash",
          text: "uv sync --all-groups\nuv run python -m starsky cache warm\nuv run python -m starsky catalog",
        },
      ],
    },
    {
      heading: "Run the site",
      paragraphs: [
        "Install the site dependencies and start the Vite dev server. Lint, typecheck, unit tests and the production build each have their own command.",
      ],
      code: [
        {
          lang: "bash",
          text: "cd site\nbun install\nbun run dev          # Vite dev server\nbun run test         # bun:test\nbun run typecheck    # TypeScript 7 (tsgo)\nbun run lint\nbun run build",
        },
      ],
    },
    {
      heading: "Docker",
      paragraphs: [
        "The image is a one-shot data job, not a service: it writes catalog.json, constellations.json and names.json to a mounted directory and exits. It runs as UID/GID 65532.",
      ],
      code: [
        {
          lang: "bash",
          text: 'docker build -t starsky .\ndocker run --rm -v "$PWD/out:/out" starsky',
        },
      ],
    },
  ],
};

export const cliEn: PageContent = {
  title: "CLI reference",
  summary:
    "starsky catalog and starsky cache warm: flags, environment, and behavior. Generated from the real --help output; run the commands to confirm.",
  sections: [
    {
      heading: "Commands",
      paragraphs: [
        "Bare python -m starsky prints help and opens no socket. The CLI builds data only: it never renders and never serves.",
      ],
      code: [
        {
          lang: "text",
          text: "Usage: python -m starsky [OPTIONS] [COMMAND] [ARGS]...\n\nCommands:\n  cache    Data-cache commands.\n  catalog  Export the star catalog + constellation lines as JSON for the site.",
        },
      ],
      table: {
        head: ["Command", "What it does"],
        rows: [
          ["cache warm", "Download the Hipparcos catalog, constellation lines and star names into the local parquet cache."],
          ["catalog", "Write catalog.json, constellations.json and names.json for the browser."],
        ],
      },
    },
    {
      heading: "catalog flags",
      paragraphs: ["Both flags have defaults; a plain invocation targets the site checkout."],
      table: {
        head: ["Flag", "Default", "Meaning"],
        rows: [
          ["--mag-limit FLOAT", "6.5", "Faintest star included (Hipparcos magnitude)."],
          ["--output-dir PATH", "site/public/data", "Directory the three JSON files are written to (created when missing)."],
        ],
      },
    },
    {
      heading: "Environment",
      paragraphs: [
        "STARSKY__-prefixed settings (see .env.example). STARPY__* variables from the old project name are no longer read and have no compatibility alias.",
      ],
      table: {
        head: ["Key", "Purpose"],
        rows: [
          ["STARSKY__CATALOG__CACHE_DIR", "Where the Hipparcos and Stellarium parquet caches live."],
          ["STARSKY__LOG__LEVEL", "CLI log level."],
        ],
      },
    },
  ],
};

export const viewerEn: PageContent = {
  title: "Poster page",
  summary:
    "Open a shared poster, share it, export it as PNG, SVG or PDF, jump into the sky behind it, and understand every error state.",
  sections: [
    {
      heading: "Open a shared poster",
      paragraphs: [
        "A shared link ends in #s= followed by the payload. Opening it renders the exact poster: the image and its heading, nothing else. There is no map to pan and no form to face; the poster is the page. The route id of this page stays viewer so existing links keep working.",
        "A corrupt fragment, a missing payload, or an unsupported version each renders its own named state with a next step, never a blank page.",
        "The poster's caption is in the poster language the link carries (English when it carries none). The page around it, including the date under the title, follows your interface language.",
      ],
    },
    {
      heading: "What you can do from it",
      paragraphs: [
        "Four actions: share (copy the link), export, Explore this sky, and Make your own. Explore this sky opens the Explorer for the poster's place and moment; the #s= link itself is never rewritten. Make your own opens the Poster Studio seeded with the shared poster.",
      ],
    },
    {
      heading: "Keep the poster",
      paragraphs: [
        "Export offers PNG, SVG, and true-vector PDF with the poster typeface embedded, in the standard layout or the 9:16 story layout (1080 × 1920). Completion is announced in place next to the button that started it; focus never moves. A failed export names the format and leaves every control enabled.",
      ],
    },
    {
      heading: "Titles the poster face cannot draw",
      paragraphs: [
        "The bundled face covers Latin-1 accents and punctuation but has no emoji or CJK glyphs. Typing such a character in a form refuses with the character named. Opening a shared link that contains one still renders: the character is left out and the adjustment is stated, because a dead link is worse than an adjusted title.",
      ],
    },
    {
      heading: "When the poster is withheld",
      paragraphs: [
        "If the poster font cannot be loaded, no poster is drawn at all — a substituted typeface would silently change the artifact. If the star data is missing, the page says so and points at starsky catalog. Both states keep the rest of the page usable.",
      ],
    },
  ],
};

export const conceptsEn: PageContent = {
  title: "Concepts",
  summary:
    "The shared vocabulary: poster, place, coordinates, scene, the four link fragments, appearance, and the contract files that bind the CLI to the browser.",
  sections: [
    {
      heading: "Glossary",
      paragraphs: [
        "These terms are used exactly everywhere — UI copy, code, and docs. The Never column lists words that must not stand in for them.",
      ],
      table: {
        head: ["Term", "Definition", "Never"],
        rows: [
          ["Poster", "The rendered night-sky image plus caption block (PNG raster, SVG/PDF vector).", "chart, plot"],
          ["Place", "A location chosen by search (Nominatim), resolved to coordinates and a name. A dropped pin or typed coordinates leave the place empty.", "coordinates, search"],
          ["Coordinates", "Validated latitude [-90,90] / longitude [-180,180]; rejected, never clamped, in shared links.", "lat/lon in prose"],
          ["Landing", "The front door: Where do you want to explore the sky from? Its one action, Explore this sky, opens the Explorer. Mirrored to #c=.", "—"],
          ["Explorer", "The primary surface: a navigable sky for a place and moment, at #e=.", "planetarium app"],
          ["Studio", "The Poster Studio at #studio=: compose the poster, then export it or copy a #s= link. Distinct from the poster page, so a draft never overwrites the canonical artifact.", "—"],
          ["Viewer", "The poster page: renders a #s= link as the image and its heading. In the interface it is called the poster page.", "—"],
          ["Scene", "The place, moment and title shared between the Explorer and the poster. Composition and camera are not part of it.", "—"],
          ["Camera", "A quaternion camera-to-world rotation plus a field of view of 5–120° (default 100), in the equatorial frame.", "—"],
          ["Figure", "One constellation drawing: stars, segments, name. A star belongs to a constellation only through its figure lines.", "—"],
          ["Below the horizon", "Altitude at or under 0. Such objects are never presented as observable.", "—"],
          ["SharePayload", "Versioned (v=1) flat JSON of lat/lon/place/when/tz/options, carried by #s= and #studio=.", "payload, fragment"],
          ["Appearance", "The interface name for render options: projection, fisheye, separation, magnitude, glow, constellations, shape, title.", "render options"],
          ["Projection", "stereographic or fisheye.", "mercator"],
          ["Shape", "circle or square. A square poster fills the square, inscribed in the horizon.", "round, box"],
          ["Limiting magnitude", "The faintest star drawn.", "—"],
          ["Story format", "The 1080 × 1920 (9:16) export layout, chosen at export time and never stored in a link.", "—"],
          ["Caption", "[Title] plus coordinates — place · local time with zone.", "—"],
        ],
      },
    },
    {
      heading: "The four link fragments",
      paragraphs: [
        "Every shareable state is one versioned URL fragment: #c= (landing form), #e= (Explorer), #studio= (Studio draft) and #s= (the poster). See Landing and links for what each holds. They share one encoding: canonical JSON, zlib level 9, URL-safe base64 without padding. Out-of-range values in a poster link are rejected rather than clamped, so a link can never silently mean something else.",
      ],
    },
    {
      heading: "The render contract",
      paragraphs: [
        "site/render-spec.json owns every visual token — colors, star sizing, glow, lines, labels, ring, caption layout, and the share-link section. The browser is the only renderer, so the file is a normative contract for one implementation, with a conformance test that fails on drift.",
      ],
    },
  ],
};

export const architectureEn: PageContent = {
  title: "Architecture",
  summary:
    "Static-first, no runtime server: a React + TypeScript client on R2, a Python data CLI, and render-spec.json as the contract between them. OpenStreetMap is the one outside dependency, and the top risk.",
  sections: [
    {
      heading: "Topology",
      paragraphs: [
        "One static client served from Cloudflare R2. One Python CLI that runs at build time and in CI to produce the data. No API, no database, no server process anywhere — so there is nothing to authenticate, scale, or keep awake.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos + Stellarium ──► starsky catalog ──► catalog / constellations / names .json ──┐\n                                                                                    ├─► R2 ──► browser\n                                                              site/ build ──► dist/ ────┘",
        },
      ],
    },
    {
      heading: "Decisions",
      paragraphs: ["Eight architecture decision records under docs/product/adr/."],
      table: {
        head: ["ADR", "Decision"],
        rows: [
          ["0001", "Static-first, no runtime server."],
          ["0002", "R2-only hosting; data served same-origin."],
          ["0003", "render-spec.json is the normative render contract."],
          ["0004", "Static resilience and observability posture."],
          ["0005", "TypeScript 7 + Bun + React client stack."],
          ["0006", "Explorer camera contract: a quaternion in the equatorial frame."],
          ["0007", "Explorer renders on Canvas 2D; WebGL only if its limits are hit."],
          ["0008", "OpenStreetMap tiles for the location map, on demand."],
        ],
      },
    },
    {
      heading: "Data flow",
      paragraphs: [
        "Hipparcos and Stellarium sources download into local parquet caches (cache warm). catalog exports the browser JSON with a magnitude filter. The site fetches the JSON same-origin, computes alt/az itself, and renders the sky on canvas, with exports generated client-side. Place search goes to Nominatim from the browser.",
        "The client code is organised by context under site/src/lib: sky (vectors, observer, camera, scene), explorer, landing, scene (the Explorer-to-poster translation), studio and render.",
      ],
    },
    {
      heading: "OpenStreetMap: the top risk",
      paragraphs: [
        "The risk the owner ranks first is being blocked by OpenStreetMap. Two of its services are used, both from the visitor's browser: Nominatim for place search, and the tile server for the landing map. Neither takes a credential.",
        "Mitigations: search runs only on Enter, the search button, or leaving the field, never as you type; results are cached for the session and requests are at least one second apart; map tiles load for the visible view only, with the Referer kept and the attribution always visible; automated tests never contact either host and fail on any unstubbed request. Coordinates always work without either service.",
        "The map exists on the landing only. The Explorer, the Studio and the poster page make no OpenStreetMap request. If a block happens, the fallback is a keyed geocoder or self-hosted tiles.",
      ],
    },
  ],
};

export const deliveryEn: PageContent = {
  title: "Delivery",
  summary:
    "Pipelines, fitness gates, environments, and the rollback runbook. Partly implemented: the gates hold, but the R2 deploy is blocked on a token scope.",
  sections: [
    {
      heading: "Pipelines",
      paragraphs: ["Every push runs the fast gates; main additionally runs the browser matrix and publishes."],
      table: {
        head: ["Workflow", "What it does"],
        rows: [
          ["ci.yml", "Python: ruff, ty, pytest, no-server check, real cache warm + catalog asserting shape and counts."],
          ["site_ci.yml", "Site: lint, typecheck, i18n agreement, unit/component/reference tests, build, brotli budgets, secret scan."],
          ["site_e2e.yml", "Playwright journeys on Chromium and Firefox, including offline export, font integrity and a network guard that fails on any unstubbed OpenStreetMap request."],
          ["site_docs.yml", "Verifies this docs site and deploys it to the docs bucket under /starsky/."],
          ["site_r2.yml", "Rebuilds data + site, verifies, and deploys to R2 on main."],
          ["security.yml", "Dependency review, Trivy, CodeQL."],
          ["release.yml", "Tags, SBOM + attestation, GitHub Release."],
        ],
      },
    },
    {
      heading: "Fitness gates",
      paragraphs: [
        "Bundle ≤ 500 KB and data ≤ 400 KB brotli (fonts excluded by design); no secret-like strings in dist/; no server imports in src/; catalogue and vision copy keys agree in both directions; render-spec conformance and the reference-image suite stay green.",
      ],
    },
    {
      heading: "Rollback",
      paragraphs: [
        "Re-run site_r2.yml on the last good commit. Content-hashed assets keep their names, and index.html uploads last, so the previous entry keeps serving until a good deploy replaces it. Versioned asset/data prefixes with a manifest pointer are planned; until then there is no pointer to flip and no timed drill has run.",
      ],
    },
    {
      heading: "Known gap",
      paragraphs: [
        "Partial — the deploy path is unverified in production: the R2 token lacks the ListObjects scope, so the deploy job fails on access denied while every verify gate passes. The bucket keeps serving the previous build. Fix the token scope, then re-run the workflow.",
      ],
    },
  ],
};

export const roadmapEn: PageContent = {
  title: "Roadmap",
  summary:
    "What is built, what is next, and what was deliberately retired. Planned items are labelled and never mixed into how-to pages.",
  sections: [
    {
      heading: "Status",
      paragraphs: ["Per specs/README.md. Implemented means the code path exists and runs on the dev branch; Verified means e2e suites pass in CI — nothing is Verified yet. Promotion of dev to main is pending, so the production site may still serve an older build."],
      table: {
        head: ["Feature", "Status", "Note"],
        rows: [
          ["design-system", "Implemented", "Tokens, atlas classes, i18n guards."],
          ["catalog-cli + data-cache", "Implemented", "starsky catalog and cache warm ship."],
          ["viewer (006), renderer-export (007)", "Implemented", "The #s= poster page, share codec, PNG/SVG/PDF export with embedded font."],
          ["sky-domain (009)", "Implemented", "Camera, observer, scene, #e=, star names."],
          ["explorer-canvas, explorer-ui (010, 011)", "Implemented", "Canvas 2D Explorer, inspector, search, layers, toolbar."],
          ["poster-studio (012)", "Implemented", "The Studio at #studio=, story export."],
          ["explorer-polish, visual-identity (014, 015)", "Implemented", "Idle collapse, horizon list, tooltips, bundled interface font, image-only poster page."],
          ["location-first (013)", "Implemented", "Map-first landing, #c= link."],
          ["square-fill (016)", "Implemented", "Square poster fills the square."],
          ["pt-br (018)", "Implemented", "Interface in en-US and pt-BR with a footer switcher; poster language chosen in the Studio and stored in the link (BCR-0015)."],
          ["constellation-tooltip (019)", "Implemented", "Constellation hover tooltip and the figure's star list in the inspector."],
          ["site-delivery (008)", "Partial", "Deploy, budgets and gates wired; versioned prefixes, smoke test and drills open."],
          ["hardening (017)", "Partial", "In progress: accessibility, failure, performance and stability passes, strict indexing, docs."],
          ["Promotion of dev to main", "Planned — not implemented yet.", "Pending the owner's go-ahead."],
          ["Versioned R2 prefixes, manifest, rollback drill", "Planned — not implemented yet.", "008 T003, T018, T021."],
          ["WebGL renderer", "Planned — not implemented yet.", "Later, and only if Canvas 2D limits are hit (ADR-0007)."],
          ["Gradio app / Python renderer / HF Space", "Retired.", "Removed by BCR-0001/0003/0005; will not return."],
        ],
      },
    },
  ],
};

export const explorerEn: PageContent = {
  title: "Explorer",
  summary:
    "The primary surface: a navigable sky for your place and moment. Look around, zoom, switch layers, inspect stars and constellations, then make a poster.",
  sections: [
    {
      heading: "Open the Explorer",
      paragraphs: [
        "Press Explore this sky on the landing, or open a #e= link. The sky fills the window, drawn on Canvas 2D for the place and moment you chose. The same link always shows the same sky and the same view.",
        "Objects below the horizon are never presented as observable: they are hidden or dimmed, and the sky says so.",
      ],
    },
    {
      heading: "Look around",
      paragraphs: [
        "Drag to look around, scroll or pinch to zoom, double-click to center on a spot. With the sky focused, the arrow keys turn the view, plus and minus zoom, 0 returns to the start and Escape clears the selection. The field of view runs from 5° to 120°. Reset glides back to the initial view and ends exactly on it.",
      ],
    },
    {
      heading: "Layers, search and the list",
      paragraphs: [
        "The toolbar toggles constellation lines, labels, the horizon, cardinal points and the grid, and chooses whether objects below the horizon are hidden or dimmed. Search finds stars and constellations by name.",
        "The constellation list is grouped by the horizon, so what is up now comes before what is below. A star belongs to a constellation only through its figure lines. Selecting a figure, in the list or on the sky, lights it up.",
      ],
    },
    {
      heading: "Stars, tooltips and the inspector",
      paragraphs: [
        "Hovering a star for about a second and a half shows a tooltip. Selecting a star or a constellation opens the inspector: a right panel with a tab on large screens, a bottom sheet on phones. A one-line summary of the place and moment stays visible; it expands during activity.",
        "Hovering a constellation's lines or name for the same time shows its name, how many stars form its figure, and up to three of its named stars, brightest first, for example \"Orion • 22 stars\" over \"Rigel, Betelgeuse, Bellatrix +19\". A star under the pointer keeps its own tooltip, and a figure that is not drawn cannot be hovered. Tooltips need a mouse or pen; on a touch screen, tap instead.",
        "A selected constellation's inspector lists every star of its figure, brightest first, by name or HIP number with its magnitude, and says in words which are below the horizon. Choosing one selects that star. Names of stars and constellations are never translated.",
      ],
    },
    {
      heading: "Controls that get out of the way",
      paragraphs: [
        "The controls collapse after four seconds idle, unless something holds them open: a popover, focus, the pointer, a pin or a drag. They start collapsed on load, so the sky is the first thing you see.",
      ],
    },
    {
      heading: "Next: a poster",
      paragraphs: [
        "Create poster in the toolbar opens the Poster Studio with the same place, moment and title. Return to Explorer in the Studio comes back to the camera you left, if the tab still remembers it. That memory lives only in this tab's session storage and never appears in a link.",
      ],
    },
  ],
};

export const linksEn: PageContent = {
  title: "Landing and links",
  summary:
    "The landing form, the four link fragments (#c=, #e=, #studio=, #s=), what each one holds, and how strictly each is read.",
  sections: [
    {
      heading: "The landing",
      paragraphs: [
        "The landing asks one question: Where do you want to explore the sky from? Search for a place, or switch to coordinates. An always-visible OpenStreetMap map shows the place and accepts a click or a dragged pin. Add an optional title, a date, time and timezone, and set a limiting magnitude under Advanced. The one action, Explore this sky, opens the Explorer.",
        "Place search runs on Enter, on the search button, or when you leave the field with new text. It never runs as you type: OpenStreetMap's Nominatim policy forbids autocomplete. Results are cached for the session and requests are at least one second apart. If search or the map fails, the message appears inline and coordinates still work.",
      ],
    },
    {
      heading: "Privacy",
      paragraphs: [
        "starsky stores nothing and has no accounts. A link carries its payload in the URL fragment, which the browser never sends to the host. Place search (Nominatim) and the landing map (OpenStreetMap tiles) run from your browser, so OpenStreetMap sees your IP address; the landing says so in one line. starsky has no credentials for either service.",
      ],
    },
    {
      heading: "The four fragments",
      paragraphs: [
        "Every fragment carries v: 1 and uses the same encoding: canonical JSON, zlib level 9, URL-safe base64 without padding. None may exceed 4096 characters.",
      ],
      table: {
        head: ["Fragment", "Holds", "Opens", "Reading rule"],
        rows: [
          ["#c=", "A pre-filled landing form: place, coordinates, local date and time, timezone, title, limiting magnitude, poster language.", "The landing", "Tolerant per field"],
          ["#e=", "A scene (place, moment, title, limiting magnitude, poster language) plus a durable view: camera, field of view, layers, selection.", "The Explorer", "Strict, whole payload"],
          ["#studio=", "A poster being composed: the same payload as #s=.", "The Poster Studio", "Strict"],
          ["#s=", "The finished poster: coordinates, moment, timezone, appearance options, poster language.", "The poster page", "Strict, version-migrated"],
        ],
      },
    },
    {
      heading: "Tolerance rules",
      paragraphs: [
        "#c= is forgiving by design. A field that fails the form's own rule is dropped and the rest still pre-fill. A link it cannot read at all, or one with another version, gives a blank form and a short notice. It never triggers a search and never adds a history entry; the page rewrites it in place as you edit, so the address bar is always the link to share.",
        "#e=, #studio= and #s= are strict. An out-of-range value is rejected, never clamped. In #e= the camera must be a real rotation, the field of view must be 5–120°, and the selection must name a star (HIP) or a constellation (CON). An unknown version is never guessed at: it is reported as unsupported.",
        "A #e= link never carries pointer, hover, animation or panel state.",
      ],
    },
    {
      heading: "Why #s= is separate, and stays stable",
      paragraphs: [
        "#s= is the canonical artifact: the sky someone sent you. The Studio uses its own fragment so a tuned draft can never replace it. Copying the link from the Studio yields a #s= link, not a #studio= one, so what you share is the finished poster rather than an editing session.",
        "#s= stays byte-compatible with every link issued since version 1. The export layout (standard or story) is never stored in any link.",
      ],
    },
    {
      heading: "The poster language: lang",
      paragraphs: [
        "Every fragment may carry one optional top-level field, lang, with exactly one value: \"pt-BR\". It is the poster language, and absent means English (en-US). English is never written, so every link made before it existed keeps its exact bytes and draws the same poster.",
        "#s=, #studio= and #e= reject any other value, \"en-US\" included, as they reject any out-of-range field. #c= drops an unknown lang and pre-fills the rest. The interface language is never stored in a link: it belongs to the person reading, the poster language to the poster.",
      ],
    },
  ],
};

export const studioEn: PageContent = {
  title: "Poster Studio",
  summary:
    "Compose the poster with a live preview, then export PNG, SVG or PDF in standard or story layout, or copy a link to the finished poster.",
  sections: [
    {
      heading: "Open the Studio",
      paragraphs: [
        "Choose Create poster in the Explorer, or Make your own on a poster page. The Studio opens at #studio= with the same place, moment, timezone and title. Opening it from a poster page starts from that poster. Changing the place or moment is done on the start page; the Studio says so and links to it.",
      ],
    },
    {
      heading: "Appearance",
      paragraphs: [
        "The preview follows your changes after a short pause, and the fragment follows the preview. The controls are projection (stereographic or fisheye), shape (square or circle), fisheye strength, minimum separation between stars, glow, and the title.",
        "A title the poster typeface cannot draw is refused in the Studio. One that arrives from a link loses the characters it cannot draw, and the Studio says so.",
      ],
    },
    {
      heading: "Poster language",
      paragraphs: [
        "Poster language sets the language of the caption's date: English (Jun 24, 2025, 8:30 PM) or Portuguese (24 de jun. de 2025, 20:30). A new poster starts in the interface language, or in the language the Explorer link already carries; a draft or poster link keeps the language it holds. The choice is stored in #studio= and in the #s= link you copy, so every recipient sees the same caption whatever their browser speaks.",
        "Only the date changes: the title is your own text, and constellation and star names are proper names. English writes nothing into the link, so a poster in English has exactly the link it always had.",
      ],
    },
    {
      heading: "Square fills the square",
      paragraphs: [
        "A square poster is all sky: the view is zoomed so the square is inscribed in the horizon, its corners on the horizon, and clipped to the square. A circle keeps the full horizon disc with its ring.",
      ],
    },
    {
      heading: "Export",
      paragraphs: [
        "Export offers PNG, SVG and a true-vector PDF with the poster typeface embedded. Choose the layout at export time: standard, or story, a 9:16 layout of 1080 × 1920 for phones. The layout is never part of a link. The files keep their caption band, and completion is announced next to the button that started it.",
      ],
    },
    {
      heading: "Share and return",
      paragraphs: [
        "Copy link produces a #s= link to the finished poster. Return to Explorer reopens the same scene at the camera you left, or at the initial view if this tab no longer remembers it. The preview is static; zooming and exploring live in the Explorer.",
      ],
    },
    {
      heading: "If the poster is withheld",
      paragraphs: [
        "As on the poster page, a missing poster font or missing star data stops the poster from being drawn rather than substituting anything, and the page says why.",
      ],
    },
  ],
};
