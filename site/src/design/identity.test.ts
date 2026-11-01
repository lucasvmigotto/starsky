/**
 * 015-visual-identity: one header, one button family, one panel and one set of
 * form controls across the Explorer, Studio and Viewer. Reads the sources so a
 * one-off style creeping back in fails here.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(join(SRC, path), "utf-8");
const css = read("index.css");

const PAGES = {
  viewer: read("components/ViewerPage.tsx"),
  studio: read("components/studio/StudioPage.tsx"),
  explorer: read("components/explorer/ExplorerPage.tsx"),
};

/** The declarations of the first rule that starts with `selector {`. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("the header", () => {
  it("is one shared component on the Studio and Viewer, and absent from the full-bleed Explorer", () => {
    expect(read("components/SiteHeader.tsx")).toContain('className="atlas-site-name"');
    for (const name of ["viewer", "studio"] as const) {
      expect(PAGES[name], name).toContain("<SiteHeader");
      expect(PAGES[name], name).not.toContain('<header className="atlas-header">');
    }
    expect(PAGES.explorer).not.toContain("SiteHeader");
    expect(css).not.toContain(".explorer-shell");
  });
});

describe("buttons", () => {
  it("gives primary, ghost and icon one base: height, radius and type", () => {
    const base = rule(".atlas-btn,\n.atlas-btn-ghost,\n.atlas-btn-icon");
    expect(base).toContain("min-height: 44px");
    expect(base).toContain("var(--radius-control)");
  });

  it("keeps the old one-off button families out of the sources", () => {
    const gone = [
      "atlas-btn-subtle",
      "atlas-export-trigger",
      "atlas-export-button",
      "atlas-studio-actions",
      "atlas-viewer-actions",
      "explorer-tool",
      "explorer-pin",
      "explorer-close",
      "explorer-action",
      "explorer-icon-button",
    ];
    const files = [
      "index.css",
      "components/ViewerPage.tsx",
      "components/ViewControls.tsx",
      "components/ShareDialog.tsx",
      "components/ExportControls.tsx",
      "components/studio/StudioPage.tsx",
      "components/explorer/ExplorerToolbar.tsx",
      "components/explorer/ExplorerMetadata.tsx",
      "components/explorer/ExplorerInspector.tsx",
      "components/explorer/ExplorerSearch.tsx",
      "components/explorer/ExplorerLayers.tsx",
      "components/explorer/ExplorerCopyLink.tsx",
    ];
    for (const file of files) {
      const text = read(file);
      for (const name of gone) expect(text, `${file} still has ${name}`).not.toMatch(new RegExp(`${name}(?![\\w-])`));
    }
  });
});

describe("panels and form controls", () => {
  it("uses the Explorer's surface, soft edge and panel radius for every panel", () => {
    const panel = rule(".atlas-panel");
    expect(panel).toContain("var(--color-surface)");
    expect(panel).toContain("1px solid var(--color-border-soft)");
    expect(panel).toContain("var(--radius-panel)");
  });

  it("puts the Studio's controls and the Viewer's actions in that panel", () => {
    expect(PAGES.viewer).toContain("atlas-panel atlas-actions");
    expect(PAGES.studio).toContain("atlas-panel atlas-actions");
  });

  it("styles the Explorer search box with the shared input", () => {
    expect(read("components/explorer/ExplorerSearch.tsx")).toContain('className="atlas-form-input explorer-search-input"');
    expect(rule(".atlas-form-input")).toContain("var(--radius-control)");
  });
});

describe("the stylesheet", () => {
  it("has no colour mix with a bare fraction, which the browser drops", () => {
    expect(css).not.toMatch(/color-mix\(in srgb, var\(--color-[a-z-]+\) 0\.\d+\)/);
  });

  it("never rests a border on the accent or focus colour", () => {
    expect(css).not.toMatch(/border[a-z-]*:[^;]*var\(--color-(accent|focus)\)/);
  });
});

describe("form layout (FR-009)", () => {
  it("centres the primary submit at its natural width", () => {
    const submit = rule(".atlas-form-submit");
    expect(submit).toContain("justify-self: center");
    expect(submit).not.toMatch(/width:\s*100%/);
  });

  it("lays pairs side by side on wide screens and stacks them on small ones", () => {
    expect(rule(".atlas-form-pair")).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(css).toMatch(/@media \(min-width: 40rem\) \{\s*\.atlas-form-pair \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  });

  it("wraps radio and checkbox rows with even spacing", () => {
    const block = rule(".atlas-form-radio-row,\n.atlas-form-check-row");
    expect(block).toContain("flex-wrap: wrap");
    expect(block).toMatch(/gap: var\(--space-\d\) var\(--space-\d\)/);
  });

  it("draws the Shape switch as segments over real radios", () => {
    expect(rule(".atlas-segmented")).toContain("display: inline-flex");
    expect(css).toContain(".atlas-segment input:checked + span");
  });
});

describe("the Studio preview", () => {
  it("shows the sky image only, with the title and moment as text above it", () => {
    expect(PAGES.studio).toContain("geometry.skyPx");
    expect(PAGES.studio).toContain("<PosterHeading");
  });
});
