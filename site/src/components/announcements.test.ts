/**
 * Announcements and the canvas as text (000-design-system T034–T036).
 *
 * A canvas that appears silently, and a figure that lights up without saying so,
 * are invisible to anyone not looking at the screen. These assert the
 * announcements exist, are polite rather than assertive, and carry real
 * information — a live region that says "done" without saying *what* is worse
 * than none, because it consumes the user's attention and says nothing.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..", "components");
const viewer = readFileSync(join(SRC, "ViewerPage.tsx"), "utf-8");
const canvas = readFileSync(join(SRC, "SkyCanvas.tsx"), "utf-8");

describe("async announcements (T035)", () => {
  it("has one polite live region in the Viewer", () => {
    expect(viewer).toMatch(/aria-live="polite"/);
    expect(viewer).toContain("sr-only");
  });

  it("announces the poster when it is ready", () => {
    expect(viewer).toContain('t("viewer.announced.ready")');
  });

  it("announces the figure that was selected, by name", () => {
    expect(viewer).toContain('t("viewer.announced.figureSelected"');
    // The name must be interpolated, not a bare "something selected".
    expect(viewer).toContain("name: fig.name");
  });

  it("announces returning to the whole sky", () => {
    expect(viewer).toContain('t("viewer.announced.viewReset")');
  });
});

describe("alert vs. status (T034)", () => {
  it("uses role=alert only for the two withholding failures", () => {
    // `dataError` withholds the map and `fontError` withholds the poster
    // (BCR-0007). Everything else is progress, which is `status`.
    //
    // Comments are stripped: a comment *explaining* the rule quotes
    // `role="alert"` and would otherwise count as a third use.
    const code = viewer.replace(/\/\*[\s\S]*?\*\//g, "");
    const alerts = code.match(/role="alert"/g) ?? [];
    expect(alerts).toHaveLength(2);
    expect(viewer).toContain("dataError.bodyPrefix");
    expect(viewer).toContain("fontError.bodyPrefix");
  });

  it("never marks the announcements as alerts", () => {
    const block = viewer.match(/sr-only[^>]*role="status"/);
    expect(block).not.toBeNull();
    expect(viewer).not.toMatch(/role="alert"[^>]*aria-live/);
  });

  it("keeps the export status polite", () => {
    const controls = readFileSync(join(SRC, "ExportControls.tsx"), "utf-8");
    expect(controls).toMatch(/role="status"/);
    expect(controls).toMatch(/aria-live="polite"/);
  });
});

describe("the canvas is not image-only (T036, DS-A11Y-006)", () => {
  it("keeps the caption as readable text, built from the shared formatter", () => {
    // Built from `formatDetailLine`, so the spoken caption and the drawn one
    // cannot disagree — the UI and the artifact showing different coordinates
    // is what vision principle 4 forbids.
    expect(canvas).toContain("formatDetailLine");
    expect(canvas).toMatch(/<span className="sr-only">\{caption\}<\/span>/);
  });

  it("exposes the focused figure's name as text", () => {
    expect(canvas).toContain("focusedName");
    expect(canvas).toContain('t("viewer.announced.figureSelected"');
  });

  it("labels the canvas for a titled and an untitled poster", () => {
    expect(canvas).toContain('t("viewer.canvasLabel"');
    expect(canvas).toContain('t("viewer.canvasLabel.untitled")');
    // No literal English left in the aria-label.
    expect(canvas).not.toMatch(/aria-label=\{\s*`/);
  });

  it("still names the keyboard path for a canvas that cannot take focus", () => {
    expect(canvas).toContain('t("figures.hint")');
  });
});