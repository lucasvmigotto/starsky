/**
 * BCR-0013: the poster page is the heading, the sky image, then share, export
 * and the actions. The caption band and the figures panel are gone from the
 * page; the exports keep their caption (covered by the export tests and the
 * reference images).
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { t } from "../i18n/index.ts";

const SRC = join(import.meta.dirname, "..");
const viewer = readFileSync(join(SRC, "components", "ViewerPage.tsx"), "utf-8");
const canvas = readFileSync(join(SRC, "components", "SkyCanvas.tsx"), "utf-8");
const catalogue = readFileSync(join(SRC, "i18n", "en-US.ts"), "utf-8");

describe("the Viewer page (BCR-0013)", () => {
  it("has no figures panel and no hover tooltip", () => {
    expect(existsSync(join(SRC, "components", "FiguresPanel.tsx"))).toBe(false);
    expect(viewer).not.toContain("FiguresPanel");
    expect(viewer).not.toContain("atlas-tooltip");
    expect(viewer).not.toMatch(/figures\./);
  });

  it("lays out heading, image, share, export, then the actions", () => {
    const at = (needle: string): number => {
      const i = viewer.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at("displayHeadingTitle(payload"),
      at("<SkyCanvas"),
      at("<ShareDialog"),
      at("<ExportControls"),
      at('goTo("explore")'),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("blits only the sky region, so the caption band is never on the page", () => {
    expect(canvas).toContain("SKY_H");
    expect(canvas).not.toContain("drawFocusOverlay");
    // The composition is still the whole poster; the crop is the blit's.
    expect(canvas).toContain("renderPoster(ctx, payload, model, CANVAS_W, dpr, PREVIEW)");
  });

  it("keeps no copy for what was removed", () => {
    expect(catalogue).not.toMatch(/"figures\./);
    expect(catalogue).not.toContain("viewer.announced.figureSelected");
    expect(t("viewer.announced.viewReset")).toBe("Showing the whole sky again.");
  });
});
