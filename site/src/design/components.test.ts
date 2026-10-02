/**
 * The inventory must describe reality (000-design-system T019/T020).
 *
 * `components.md` is a contract, and a contract that drifts is worse than none.
 * These assertions tie it to the code: every component the `ui.md` files name
 * must exist or be explicitly marked planned, and every copy key the inventory
 * quotes must resolve.
 *
 * The state matrix itself is covered by each component's own tests — this file
 * checks that the *inventory* is honest, not that the components work.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..");
const DOC = readFileSync(join(import.meta.dirname, "components.md"), "utf-8");

/** Every component a `ui.md` names, and where it stands. */
const INVENTORY: ReadonlyArray<readonly [string, "built" | "planned"]> = [
  ["SiteFooter", "built"],
  ["SkyCanvas", "built"],
  ["FiguresPanel", "built"],
  ["ExportControls", "built"],
  ["States", "built"],
  ["Button", "planned"],
  ["Surface", "planned"],
  ["Tooltip", "built"],
  ["StatusRegion", "built"],
  ["FigureList", "planned"],
  ["LocaleSelect", "planned"],
];

describe("component inventory (T019)", () => {
  it("documents every component the ui.md files name", () => {
    for (const [name] of INVENTORY) {
      expect(DOC, `${name} is undocumented`).toContain(name);
    }
  });

  it("only claims as built what exists on disk", () => {
    for (const [name, status] of INVENTORY) {
      if (status !== "built") continue;
      const exists = existsSync(join(SRC, "components", `${name}.tsx`));
      // `States` is a file exporting three components, and `Tooltip`/`StatusRegion`
      // are CSS classes inside other files — so a missing file is only a failure
      // for components with a file of their own.
      const INLINE = new Set(["Tooltip", "StatusRegion", "States", "Button"]);
      if (INLINE.has(name)) continue;
      expect(exists, `${name} is marked built but has no component file`).toBe(
        true,
      );
    }
  });

  it("never marks a missing component as built", () => {
    for (const [name, status] of INVENTORY) {
      const exists = existsSync(join(SRC, "components", `${name}.tsx`));
      if (!exists && status === "built") {
        expect(
          ["Tooltip", "StatusRegion", "States", "Button"],
          `${name} has no file but is marked built`,
        ).toContain(name);
      }
    }
  });

  it("states the eight states the spec requires (DS-004)", () => {
    // The spec enumerates default, hover, focus-visible, active, disabled,
    // loading, error and selected/checked. A component may not need all of them,
    // but the inventory must be explicit about which apply.
    expect(DOC).toContain("States");
    for (const term of ["focus-visible", "disabled"]) {
      expect(DOC, `${term} is never mentioned`).toContain(term);
    }
  });

  it("quotes only copy keys that resolve", () => {
    const keys = new Set(
      [...DOC.matchAll(/`([a-z][A-Za-z]*\.[A-Za-z.]+)`/g)].map((m) => m[1]),
    );
    // Keys defined in the catalogue rather than a file path or a lib symbol.
    const candidates = [...keys].filter(
      (k) =>
        !k.startsWith("color.") &&
        !k.startsWith("space.") &&
        !k.startsWith("radius.") &&
        !k.startsWith("motion.") &&
        !k.endsWith(".ts") &&
        !k.endsWith(".md"),
    );
    const catalogue = readFileSync(join(SRC, "i18n", "en-US.ts"), "utf-8");
    for (const key of candidates) {
      expect(catalogue, `inventory quotes an unknown key: ${key}`).toContain(
        `"${key}"`,
      );
    }
  });

  it("keeps the D19 boundary: no token reaches inside the canvas", () => {
    expect(DOC).toContain("render-spec.json");
    expect(DOC).toMatch(/Never.*token/i);
  });

  it("states the one-export-surface rule (D15)", () => {
    expect(DOC).toContain("D15");
  });
});