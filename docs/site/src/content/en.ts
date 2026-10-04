import type { PageContent } from "./types.ts";

export const overviewEn: PageContent = {
  title: "Overview",
  summary:
    "starsky is a static, client-only night-sky poster studio: the browser renders the poster and exports print-grade files, and a small Python CLI builds the sky data.",
  sections: [
    {
      heading: "What it is",
      paragraphs: [
        "starsky draws the night sky over any place and moment, in the browser. Pick coordinates or a place, a date and time, and appearance options, and the poster renders live. A shared link carries the whole sky in its fragment, so the same link renders the same poster for everyone.",
        "There is no server, no database, and no accounts. The site is static files on Cloudflare R2; the only Python in the product builds the star data the browser fetches.",
      ],
    },
    {
      heading: "How it fits together",
      paragraphs: [
        "The CLI downloads the Hipparcos catalog and Stellarium constellation lines once, then exports two JSON files. The site fetches those files and does its own astronomy and place lookup, so the CLI never renders and never serves anything.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos catalog ─┐\n                   ├─ starsky (CLI) ──► catalog.json, constellations.json ──┐\nStellarium IAU ────┘                                                      │\n                                                                          ▼\n                                       site/ (React + TS) ──► poster PNG / SVG / PDF",
        },
      ],
    },
    {
      heading: "Two surfaces",
      paragraphs: [
        "Landing builds a moment: coordinates or a place name, date, time, timezone, and appearance. Viewer shows a shared sky from a #s= link: the map, constellation figures, caption, view controls, copy-link, and the export surface. A Studio build-and-tune surface at #studio= is planned, not built.",
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
        "The image is a one-shot data job, not a service: it writes catalog.json and constellations.json to a mounted directory and exits. It runs as UID/GID 65532.",
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
          ["cache warm", "Download the Hipparcos catalog and constellation lines into the local parquet cache."],
          ["catalog", "Write catalog.json and constellations.json for the browser."],
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
          ["--output-dir PATH", "site/public/data", "Directory the two JSON files are written to (created when missing)."],
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
  title: "Viewer guide",
  summary:
    "Open a shared sky, read the map, tune the view, keep the poster as PNG, SVG or PDF, and understand every error state.",
  sections: [
    {
      heading: "Open a shared sky",
      paragraphs: [
        "A shared link ends in #s= followed by the payload. Opening it renders the exact sky: poster, constellation figures, and caption. No interaction is required; the map is the page.",
        "A corrupt fragment, a missing payload, or an unsupported version each renders its own named state with a next step, never a blank page.",
      ],
    },
    {
      heading: "Read and tune the view",
      paragraphs: [
        "Drag to pan, scroll to zoom, use arrow keys with the map focused (+, -, 0 to reset). The view controls under the poster do the same by button. Selecting a figure lights it up and announces it to screen readers.",
      ],
    },
    {
      heading: "Keep the poster",
      paragraphs: [
        "Export offers PNG, SVG, and true-vector PDF with the poster typeface embedded. Completion is announced in place next to the button that started it; focus never moves. A failed export names the format, reassures that the map is unaffected, and leaves every control enabled.",
      ],
    },
    {
      heading: "Titles the poster face cannot draw",
      paragraphs: [
        "The bundled face covers Latin-1 accents and punctuation but has no emoji or CJK glyphs. Typing such a character in the landing form refuses with the character named. Opening a shared link that contains one still renders: the character is left out and the adjustment is stated, because a dead link is worse than an adjusted title.",
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
    "The shared vocabulary: poster, place, coordinates, share payload, appearance, and the contract files that bind the CLI to the browser.",
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
          ["Place", "Free-text location resolved via Nominatim to coordinates plus names.", "coordinates, search"],
          ["Coordinates", "Validated latitude [-90,90] / longitude [-180,180].", "lat/lon in prose"],
          ["Viewer", "The surface that renders a #s= link. The product's resting state.", "—"],
          ["Studio", "Planned build-and-tune surface at #studio=. Not built yet.", "—"],
          ["Landing", "The choice surface: open a shared sky, or map a moment.", "—"],
          ["SharePayload", "Versioned (v=1) flat JSON of lat/lon/place/when/tz/options.", "payload, fragment"],
          ["Appearance", "The interface name for render options: projection, fisheye, separation, magnitude, glow, constellations, shape, title.", "render options"],
          ["Projection", "stereographic or fisheye.", "mercator"],
          ["Shape", "circle or square.", "round, box"],
          ["Figure", "One constellation drawing: stars, segments, name.", "—"],
          ["Caption", "[Title] plus coordinates — place · local time with zone.", "—"],
        ],
      },
    },
    {
      heading: "The share payload",
      paragraphs: [
        "Canonical JSON, zlib level 9, URL-safe base64 without padding, after #s=. Version 1. Out-of-range option values are rejected rather than clamped, so a link can never silently mean something else. Unknown option fields are rejected rather than rendered.",
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
    "Static-first, no runtime server: a React + TypeScript client on R2, a Python data CLI, and render-spec.json as the contract between them.",
  sections: [
    {
      heading: "Topology",
      paragraphs: [
        "One static client served from Cloudflare R2. One Python CLI that runs at build time and in CI to produce the data. No API, no database, no server process anywhere — so there is nothing to authenticate, scale, or keep awake.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos + Stellarium ──► starsky catalog ──► catalog.json ──┐\n                                                        ├─► R2 ──► browser\n                                      site/ build ──► dist/ ────┘",
        },
      ],
    },
    {
      heading: "Decisions",
      paragraphs: ["Five architecture decision records under docs/product/adr/."],
      table: {
        head: ["ADR", "Decision"],
        rows: [
          ["0001", "Static-first, no runtime server."],
          ["0002", "R2-only hosting; data served same-origin."],
          ["0003", "render-spec.json is the normative render contract."],
          ["0004", "Static resilience and observability posture."],
          ["0005", "TypeScript 7 + Bun + React client stack."],
        ],
      },
    },
    {
      heading: "Data flow",
      paragraphs: [
        "Hipparcos and Stellarium sources download into local parquet caches (cache warm). catalog exports the browser JSON with a magnitude filter. The site fetches the JSON same-origin, computes alt/az itself, resolves places via Nominatim in the browser, and renders everything on canvas with exports generated client-side.",
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
          ["site_e2e.yml", "Playwright journeys on Chromium and Firefox, including offline export and font integrity."],
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
      paragraphs: ["Per specs/README.md. Implemented means the code path exists and runs; Verified means e2e suites pass in CI — nothing is Verified yet."],
      table: {
        head: ["Feature", "Status", "Note"],
        rows: [
          ["design-system", "Implemented", "Tokens, atlas classes, i18n guards."],
          ["catalog-cli + data-cache", "Implemented", "starsky catalog and cache warm ship."],
          ["viewer", "Implemented", "Landing, #s= viewer, share codec, place lookup."],
          ["renderer-export", "Implemented", "Poster rendering and PNG/SVG/PDF export with embedded font."],
          ["site-delivery", "Partial", "Deploy, budgets and gates wired; versioned prefixes, smoke test and drills open."],
          ["Studio (#studio=)", "Planned — not implemented yet.", "Build-and-tune surface; share re-encodes to #s=."],
          ["pt-BR product locale", "Planned — not implemented yet.", "Ships as its own slice after the catalogue exists."],
          ["Gradio app / Python renderer / HF Space", "Retired.", "Removed by BCR-0001/0003/0005; will not return."],
        ],
      },
    },
  ],
};
