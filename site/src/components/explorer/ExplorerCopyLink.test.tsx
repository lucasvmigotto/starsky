import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerCopyLink, COPIED_ICON_MS } = await import("./ExplorerCopyLink.tsx");

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  cleanup();
});

describe("ExplorerCopyLink as an icon", () => {
  it("is a button named and titled Copy link, with no visible text and an inline icon", () => {
    render(<ExplorerCopyLink getLink={() => "x"} />);
    const button = screen.getByRole("button", { name: "Copy link" });
    expect(button.getAttribute("title")).toBe("Copy link");
    expect(button.textContent).toBe("");
    const svg = button.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.outerHTML).toContain("currentColor");
    expect(svg?.outerHTML).not.toMatch(/#[0-9a-f]{3,6}|rgb/i);
  });

  it("shows a check for about two seconds after a copy, then the link again", async () => {
    stubClipboard(() => Promise.resolve());
    render(<ExplorerCopyLink getLink={() => "x"} resetMs={30} />);
    const button = screen.getByRole("button", { name: "Copy link" });
    expect(button.getAttribute("data-icon")).toBe("link");
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button.getAttribute("data-icon")).toBe("check");
    expect(button.getAttribute("aria-label")).toBe("Copy link");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(button.getAttribute("data-icon")).toBe("link");
  });

  it("waits two seconds by default", () => {
    expect(COPIED_ICON_MS).toBe(2000);
  });

  it("keeps the link icon when the copy fails", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    render(<ExplorerCopyLink getLink={() => "x"} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Copy link" }).getAttribute("data-icon")).toBe("link");
  });
});

describe("ExplorerCopyLink", () => {
  it("copies the current link and says so", async () => {
    const copied: string[] = [];
    stubClipboard((text) => {
      copied.push(text);
      return Promise.resolve();
    });
    render(<ExplorerCopyLink getLink={() => "https://x.example/#e=abc"} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(copied).toEqual(["https://x.example/#e=abc"]);
    expect(screen.getByRole("status").textContent).toBe("Link copied.");
  });

  it("reads the link at the moment of the click, not before", async () => {
    let current = "first";
    const copied: string[] = [];
    stubClipboard((text) => {
      copied.push(text);
      return Promise.resolve();
    });
    render(<ExplorerCopyLink getLink={() => current} />);
    current = "second";
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(copied).toEqual(["second"]);
  });

  it("says plainly when the clipboard refuses", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    render(<ExplorerCopyLink getLink={() => "x"} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent).toBe("Could not copy the link. Copy it from the address bar.");
    expect(screen.queryByText("Link copied.")).toBeNull();
  });
});
