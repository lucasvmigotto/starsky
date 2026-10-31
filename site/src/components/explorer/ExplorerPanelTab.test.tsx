import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerPanelTab } = await import("./ExplorerPanelTab.tsx");

afterEach(() => {
  cleanup();
});

describe("ExplorerPanelTab", () => {
  it("is a real button that offers to show the details, with a chevron pointing into the sky", () => {
    render(<ExplorerPanelTab open={false} controls="body" onToggle={() => {}} />);
    const tab = screen.getByRole("button", { name: "Show details" });
    expect(tab.tagName).toBe("BUTTON");
    expect(tab.getAttribute("aria-expanded")).toBe("false");
    expect(tab.getAttribute("aria-controls")).toBe("body");
    expect(tab.getAttribute("data-chevron")).toBe("left");
  });

  it("offers to hide them when open, with the chevron turned toward the screen edge", () => {
    render(<ExplorerPanelTab open controls="body" onToggle={() => {}} />);
    const tab = screen.getByRole("button", { name: "Hide details" });
    expect(tab.getAttribute("aria-expanded")).toBe("true");
    expect(tab.getAttribute("data-chevron")).toBe("right");
  });

  it("draws its chevron inline, in the current colour, hidden from screen readers", () => {
    render(<ExplorerPanelTab open={false} controls="body" onToggle={() => {}} />);
    const svg = screen.getByRole("button", { name: "Show details" }).querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.outerHTML).toContain("currentColor");
  });

  it("toggles on click", () => {
    let toggled = 0;
    render(
      <ExplorerPanelTab
        open={false}
        controls="body"
        onToggle={() => {
          toggled++;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(toggled).toBe(1);
  });
});
