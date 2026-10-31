import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerCopyLink } = await import("./ExplorerCopyLink.tsx");

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  cleanup();
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
