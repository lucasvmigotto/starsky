import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: PosterFields } = await import("./PosterFields.tsx");
const { DEFAULTS } = await import("../../lib/scene/defaults.ts");

import type { PosterFieldValues } from "./PosterFields.tsx";

const VALUES: PosterFieldValues = {
  projection: DEFAULTS.projection,
  fisheyeStrength: DEFAULTS.fisheyeStrength,
  minSeparation: DEFAULTS.minSeparation,
  magnitudeLimit: DEFAULTS.magnitudeLimit,
  glow: DEFAULTS.glow,
  glowIntensity: DEFAULTS.glowIntensity,
  constellations: DEFAULTS.constellations,
  constellationLabels: DEFAULTS.constellationLabels,
  shape: DEFAULTS.shape,
  title: "",
};

const LEGENDS = { sky: "Sky", appearance: "Appearance", observation: "Observation" };

afterEach(() => {
  cleanup();
});

function setup(patches: Partial<PosterFieldValues>[], extra: { collapsible?: boolean; titleError?: string } = {}) {
  return render(
    <PosterFields
      idPrefix="landing"
      legends={LEGENDS}
      titleLabel="Title (optional)"
      value={VALUES}
      onChange={(patch) => {
        patches.push(patch);
      }}
      {...extra}
    />,
  );
}

describe("PosterFields", () => {
  it("renders the poster-only controls under the landing's ids", () => {
    setup([]);
    for (const id of [
      "landing-projection",
      "landing-fisheye",
      "landing-separation",
      "landing-glow",
      "landing-mag",
      "landing-title",
    ]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getByLabelText("Title (optional)")).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Shape" })).toBeDefined();
  });

  it("collapsible sections are <details> with the three legends, as on the landing", () => {
    setup([]);
    const summaries = [...document.querySelectorAll("details.atlas-form-details > summary")].map((e) => e.textContent);
    expect(summaries).toEqual(["Sky", "Appearance", "Observation"]);
  });

  it("open sections are fieldsets, always visible, for the Studio", () => {
    setup([], { collapsible: false });
    expect(document.querySelectorAll("details").length).toBe(0);
    expect(screen.getByRole("group", { name: "Appearance" })).toBeDefined();
  });

  it("reports one change as a patch", () => {
    const patches: Partial<PosterFieldValues>[] = [];
    setup(patches);
    fireEvent.change(screen.getByLabelText("Title (optional)"), { target: { value: "Hi" } });
    fireEvent.change(document.getElementById("landing-mag") as HTMLInputElement, { target: { value: "6.5" } });
    fireEvent.click(screen.getByRole("radio", { name: "square" }));
    fireEvent.click(screen.getByLabelText("Glow"));
    expect(patches).toEqual([{ title: "Hi" }, { magnitudeLimit: 6.5 }, { shape: "square" }, { glow: false }]);
  });

  it("shows a title problem next to the field", () => {
    setup([], { titleError: "No glyph for that." });
    expect(screen.getByRole("alert").textContent).toBe("No glyph for that.");
    expect(document.getElementById("landing-title")?.getAttribute("aria-invalid")).toBe("true");
  });
});
