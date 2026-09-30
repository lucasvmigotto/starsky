/**
 * One export surface (vision D15).
 *
 * The Viewer used to offer PNG three ways: the footer's "Save image" button and
 * the `ExportControls` row. Two problems:
 *
 * 1. **One action, two names** — a direct violation of the microcopy rule that
 *    an action keeps its name through the flow.
 * 2. **The footer's copy was wrong.** It read the *on-screen* canvas, so after
 *    panning or zooming it saved the zoomed, cropped view rather than the
 *    poster. `ExportControls` composes its own canvas, so PNG has always
 *    exported the whole moment regardless of the view.
 *
 * These assertions keep the duplication from coming back.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// This file lives in src/lib/render/, so `src/` is two levels up.
const SRC = join(import.meta.dirname, "..", "..");

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    // Test files legitimately mention `createObjectURL` (the failure-injection
    // test stubs it) and `ExportControls`; this rule is about *production* code.
    .filter((e) => !e.name.includes(".test."))
    .map((e) => join(dir, e.name));
}

function readComponents(dir: string): ReadonlyArray<readonly [string, string]> {
  return componentFiles(dir).map(
    (f) =>
      [f.split("/").pop() as string, readFileSync(f, "utf-8")] as const,
  );
}

const SOURCES: ReadonlyArray<readonly [string, string]> = [
  ...readComponents(join(SRC, "components")),
  ...readComponents(SRC),
];

/** Production source with comments stripped, so a comment explaining the
 *  removal does not read as the removed control. */
const body = SOURCES.map(([, text]) =>
  text.replace(/\/\*[\s\S]*?\*\//g, ""),
).join("\n");

describe("one export surface (D15)", () => {
  it("has no second download control in any component", () => {
    // The literal is the giveaway: any new surface re-adding it fails here.
    expect(body).not.toMatch(/Save image/i);
  });

  it("keeps the download logic in ExportControls only", () => {
    // `downloadBlob` is the one path that hands a file to the browser. The old
    // footer button built its own <a download> instead.
    for (const [name, text] of SOURCES) {
      if (name === "ExportControls.tsx") continue;
      expect(text, `${name} calls downloadBlob directly`).not.toContain(
        "downloadBlob",
      );
      expect(text, `${name} builds an anchor download`).not.toMatch(
        /createObjectURL/,
      );
    }
  });

  it("no longer exports the on-screen canvas", () => {
    // `canvasRef.toBlob` was the zoom-dependent path. Exporting must go
    // through `renderPosterToCanvas`, which composes the poster afresh.
    expect(body).not.toMatch(/\.toBlob\(/);
  });

  it("still offers all three formats", () => {
    const controls = SOURCES.find(([n]) => n === "ExportControls.tsx")?.[1];
    expect(controls).toBeDefined();
    for (const format of ["png", "svg", "pdf"]) {
      expect(controls).toContain(`"${format}"`);
    }
  });
});