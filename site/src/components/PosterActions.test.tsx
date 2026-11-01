import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: PosterActions } = await import("./PosterActions.tsx");
const { t } = await import("../i18n/index.ts");

import type { SharePayload } from "../lib/share.ts";
import type { SkyModel } from "../lib/skymodel.ts";

const PAYLOAD: SharePayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "UTC",
  options: {
    projection: "stereographic",
    fisheye_strength: 1,
    min_separation: 0.008,
    magnitude_limit: 5.8,
    glow: true,
    glow_intensity: 1,
    constellations: true,
    constellation_labels: true,
    shape: "circle",
    title: "Night",
  },
};
const MODEL = { stars: [], figures: [], segments: [] } as unknown as SkyModel;

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <PosterActions payload={PAYLOAD} model={MODEL}>
      <button type="button" className="atlas-btn-icon" aria-label={t("viewer.exploreSky")} title={t("viewer.exploreSky")}>
        <svg />
      </button>
      <button type="button" className="atlas-btn-icon" aria-label={t("viewer.makeYourOwn")} title={t("viewer.makeYourOwn")}>
        <svg />
      </button>
    </PosterActions>,
  );
}

function trigger(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

describe("PosterActions (FR-011)", () => {
  it("is icon-only buttons of one size, each with an accessible name and a title", () => {
    mount();
    const names = ["Share", "Export", t("viewer.exploreSky"), t("viewer.makeYourOwn")];
    for (const name of names) {
      const button = trigger(name);
      expect(button.className, name).toContain("atlas-btn-icon");
      expect(button.getAttribute("title"), name).toBe(name);
      expect(button.textContent, name).toBe("");
      expect(button.querySelector("svg"), name).not.toBeNull();
    }
    const order = [...document.querySelectorAll(".atlas-actions > button, .atlas-actions > .atlas-export > button")].map((b) =>
      b.getAttribute("aria-label"),
    );
    expect(order).toEqual(names);
  });

  it("opens one popover at a time: opening Export closes Share", () => {
    mount();
    fireEvent.click(trigger("Share"));
    expect(trigger("Close share").getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("share-details")?.hasAttribute("hidden")).toBe(false);
    fireEvent.click(trigger("Export"));
    expect(trigger("Close export").getAttribute("aria-expanded")).toBe("true");
    expect(trigger("Share").getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("share-details")?.hasAttribute("hidden")).toBe(true);
    expect(document.getElementById("export-formats")?.hasAttribute("hidden")).toBe(false);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    mount();
    fireEvent.click(trigger("Share"));
    const copy = screen.getByRole("button", { name: "Copy link" });
    copy.focus();
    fireEvent.keyDown(copy, { key: "Escape" });
    expect(document.getElementById("share-details")?.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(trigger("Share"));
  });

  it("keeps the triggers' controls wiring and both live regions", () => {
    mount();
    expect(trigger("Share").getAttribute("aria-controls")).toBe("share-details");
    expect(trigger("Export").getAttribute("aria-controls")).toBe("export-formats");
    expect(document.querySelectorAll('.atlas-actions [role="status"]')).toHaveLength(2);
  });

  it("has no panel of its own: the buttons live in the footer", () => {
    mount();
    expect(document.querySelector(".atlas-panel")).toBeNull();
  });
});
