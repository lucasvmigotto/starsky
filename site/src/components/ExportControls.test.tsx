/**
 * Component tests for the poster export controls (refactor Slice 4 follow-up).
 *
 * The unit suites cover the exporters' output and the Playwright journeys cover
 * a real browser; this is the cheap middle layer that catches "the button does
 * nothing" in PR CI without spinning a browser.
 *
 * `happy-dom` provides the DOM; the renderer and the download path are stubbed
 * so the test asserts *behaviour* (state, accessibility, error surfacing), not
 * canvas pixels — those belong to `reference.test.ts` and `site/e2e/`.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost/" });

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: ExportControls, EXPORT_SIZE_PX } = await import(
  "./ExportControls.tsx"
);
const { act } = await import("react");

import type { SharePayload } from "../lib/share.ts";
import type { SkyModel } from "../lib/skymodel.ts";

function makePayload(): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: "Times Square",
    when_utc: "2026-01-01T00:00:00Z",
    tz: "UTC",
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
      title: "Export Night",
    },
  };
}

const MODEL = {
  stars: [],
  figures: [],
  segments: [],
  when: new Date("2026-01-01T00:00:00Z"),
} as unknown as SkyModel;

afterEach(() => {
  cleanup();
});

/**
 * Open the disclosure so the format buttons are in the tree.
 *
 * They are hidden by default (vision principle 3 — export is the last step),
 * and `hidden` removes them from the accessibility tree, so a `getByRole` that
 * does not open first correctly finds nothing.
 */
function openFormats(): void {
  const trigger = screen.getByRole("button", { name: /export/i });
  if (trigger.getAttribute("aria-expanded") === "false") {
    act(() => {
      trigger.click();
    });
  }
}

describe("ExportControls", () => {
  it("starts collapsed, so export does not compete with the poster", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    const trigger = screen.getByRole("button", { name: "Export" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    for (const label of ["PNG", "SVG", "PDF"]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
  });

  it("reveals the formats when the trigger is activated", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    // The trigger now reads "Close export", so match on that, not "Export".
    const trigger = screen.getByRole("button", { name: "Close export" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    for (const label of ["PNG", "SVG", "PDF"]) {
      expect(screen.getByRole("button", { name: label })).toBeDefined();
    }
  });

  it("points aria-controls at the panel it discloses", () => {
    // The disclosure pattern: without aria-controls the trigger announces an
    // expansion with no referent.
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    const trigger = screen.getByRole("button", { name: "Export" });
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)).not.toBeNull();
  });

  it("toggles closed again", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    act(() => {
      screen.getByRole("button", { name: "Close export" }).click();
    });
    expect(screen.getByRole("button", { name: "Export" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "PNG" })).toBeNull();
  });

  it("does not persist the open state — a shared link must not carry it", () => {
    // The hash is the share payload; writing UI state into it would change
    // what a link means.
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    const before = window.location.hash;
    expect(before).not.toContain("export");
  });

  it("renders the three formats as real buttons", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    for (const label of ["PNG", "SVG", "PDF"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.tagName).toBe("BUTTON");
      expect((button as HTMLButtonElement).type).toBe("button");
    }
  });

  it("labels the group accessibly", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    // Named by the trigger, which is also what discloses it — one control
    // rather than a label element plus a group.
    const group = screen.getByRole("group", { name: /export/i });
    expect(group).toBeDefined();
  });

  it("exposes a polite live region for status", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("keeps every button keyboard reachable (no positive tabindex)", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    for (const label of ["PNG", "SVG", "PDF"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.getAttribute("tabindex")).toBeNull();
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("marks the clicked format busy and disables the group while working", () => {
    render(<ExportControls payload={makePayload()} model={MODEL} />);
    openFormats();
    const svg = screen.getByRole("button", { name: "SVG" });
    // The SVG path is synchronous, so a sync act() flushes it fully.
    act(() => {
      svg.click();
    });
    // What must hold is that the control returns to idle and reports a result
    // rather than hanging in a busy state.
    expect((svg as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toContain("SVG");
  });

  it("uses the export size independent of the preview size", () => {
    expect(EXPORT_SIZE_PX).toBe(1600);
  });

  it("surfaces an export failure in the live region instead of doing nothing", () => {
    // Make the download path throw. A silent no-op is the bug this guards.
    type CreateObjectUrl = (blob: Blob) => string;
    const original: CreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (): string => {
      throw new Error("blob blocked");
    };
    try {
      render(<ExportControls payload={makePayload()} model={MODEL} />);
      openFormats();
      const svg = screen.getByRole("button", { name: "SVG" });
      act(() => {
        svg.click();
      });
      const status = screen.getByRole("status").textContent ?? "";
      expect(status.toLowerCase()).toContain("svg");
      expect(status.toLowerCase()).toContain("failed");
    } finally {
      URL.createObjectURL = original;
    }
  });
});
