/**
 * Component tests for the share controls.
 *
 * Same middle layer as `ExportControls.test.tsx`: happy-dom behaviour
 * (disclosure, summary, copy outcome), not pixels. The clipboard is stubbed
 * per test so both the success and the denied paths are covered.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost/" });

const { act, cleanup, render, screen } = await import("@testing-library/react");
const { default: ShareDialog } = await import("./ShareDialog.tsx");

import type { SharePayload } from "../lib/share.ts";

function makePayload(): SharePayload {
  return {
    v: 1,
    lat: 30.0131,
    lon: 31.2089,
    place: "Giza",
    when_utc: "2025-08-12T18:30:00Z",
    tz: "Africa/Cairo",
    options: {
      projection: "stereographic",
      fisheye_strength: 1.0,
      min_separation: 0.008,
      magnitude_limit: 5.8,
      glow: true,
      glow_intensity: 1.0,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title: null,
    },
  };
}

function openShare(): void {
  const trigger = screen.getByRole("button", { name: "Share" });
  if (trigger.getAttribute("aria-expanded") === "false") {
    act(() => {
      trigger.click();
    });
  }
}

afterEach(() => {
  cleanup();
});

describe("ShareDialog", () => {
  it("starts collapsed, so share does not compete with the poster", () => {
    render(<ShareDialog payload={makePayload()} />);
    expect(
      screen.getByRole("button", { name: "Share" }).getAttribute("aria-expanded"),
    ).toBe("false");
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
  });

  it("summarises the scene being shared", () => {
    render(<ShareDialog payload={makePayload()} />);
    openShare();
    const group = screen.getByRole("group", { name: "Share this sky" });
    expect(group.textContent ?? "").toContain("Giza");
    expect(group.textContent ?? "").toContain("stereographic");
    expect(group.textContent ?? "").toContain("5.8");
    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).not.toBeNull();
  });

  it("confirms the copy in place", async () => {
    let written = "";
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: (text: string): Promise<void> => {
          written = text;
          return Promise.resolve();
        },
      },
      configurable: true,
    });
    render(<ShareDialog payload={makePayload()} />);
    openShare();
    await act(async () => {
      screen.getByRole("button", { name: "Copy link" }).click();
      await Promise.resolve();
    });
    expect(written).toBe(window.location.href);
    expect(screen.getByRole("status").textContent).toBe("Link copied");
  });

  it("names the fallback when the clipboard is denied", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: (): Promise<void> =>
          Promise.reject(new Error("denied")),
      },
      configurable: true,
    });
    render(<ShareDialog payload={makePayload()} />);
    openShare();
    await act(async () => {
      screen.getByRole("button", { name: "Copy link" }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole("status").textContent).toContain(
      "Select the address bar",
    );
  });
});
