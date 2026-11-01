import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../lib/testing.ts";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen } = await import("@testing-library/react");
const { ICON_NAMES, Icon } = await import("./icons.tsx");
const { default: ExplorerToolbar } = await import("./explorer/ExplorerToolbar.tsx");
const { makeController } = await import("./explorer/harness.ts");

afterEach(() => {
  cleanup();
});

describe("Icon", () => {
  it("draws every icon on the shared 24 px grid with one stroke style", () => {
    for (const name of ICON_NAMES) {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg?.getAttribute("stroke")).toBe("currentColor");
      expect(svg?.getAttribute("stroke-width")).toBe("1.75");
      expect(svg?.getAttribute("stroke-linecap")).toBe("round");
      expect(svg?.getAttribute("stroke-linejoin")).toBe("round");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      cleanup();
    }
  });
});

describe("the Explorer toolbar", () => {
  it("is six icon buttons, each named and titled, with no visible text", () => {
    const { controller } = makeController();
    render(
      <ExplorerToolbar
        controller={controller}
        searchOpen={false}
        layersOpen={false}
        onToggleSearch={() => {}}
        onToggleLayers={() => {}}
        onCreatePoster={() => {}}
      />,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Map controls" });
    const buttons = [...toolbar.querySelectorAll("button")];
    expect(buttons).toHaveLength(6);
    const names = ["Zoom in", "Zoom out", "Reset view", "Layers", "Search", "Create poster"];
    buttons.forEach((button, i) => {
      expect(button.getAttribute("aria-label")).toBe(at(names, i));
      expect(button.getAttribute("title") ?? "").toContain(names[i] ?? "?");
      expect(button.textContent).toBe("");
      expect(button.querySelector("svg")).not.toBeNull();
    });
  });
});
