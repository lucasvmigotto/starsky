import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../../lib/testing.ts";

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
  posterLocale: "en-US",
};

const LEGENDS = { appearance: "Appearance", advanced: "Advanced" };

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

  it("collapsible sections are <details>: Appearance and one Advanced", () => {
    setup([]);
    const summaries = [...document.querySelectorAll("details.atlas-form-details > summary")].map((e) => e.textContent);
    expect(summaries).toEqual(["Appearance", "Advanced"]);
  });

  it("the Studio's Appearance is an open fieldset; Advanced is still a collapsed disclosure", () => {
    setup([], { collapsible: false });
    expect(screen.getByRole("group", { name: "Appearance" })).toBeDefined();
    const advanced = document.querySelectorAll("details");
    expect(advanced).toHaveLength(1);
    expect(at(advanced, 0).hasAttribute("open")).toBe(false);
    expect(at(advanced, 0).querySelector("summary")?.textContent).toBe("Advanced");
  });

  it("Advanced holds constellation lines, labels and the limiting magnitude, and nothing else", () => {
    setup([]);
    const advanced = [...document.querySelectorAll("details")].find((d) => d.querySelector("summary")?.textContent === "Advanced");
    const labels = [...(advanced?.querySelectorAll("label") ?? [])].map((el) => el.textContent);
    expect(labels).toEqual(["Constellation lines", "Constellation labels", "Limiting magnitude"]);
    expect(advanced?.querySelector("#landing-title")).toBeNull();
  });

  it("pairs related controls: projection with shape, fisheye with separation, glow with its intensity, title with language", () => {
    setup([]);
    const pairs = [...document.querySelectorAll(".atlas-form-pair")];
    const ids = pairs.map((pair) => [...pair.querySelectorAll("select, input")].map((el) => el.id || el.getAttribute("name")));
    expect(ids).toEqual([
      ["landing-projection", "shape", "shape"],
      ["landing-fisheye", "landing-separation"],
      [null, "landing-glow"],
      // The poster's words: its title, and the language its date is written in (018).
      ["landing-title", "landing-lang"],
    ]);
  });

  it("offers the poster languages by their own names, and reports a choice", () => {
    const patches: Partial<PosterFieldValues>[] = [];
    setup(patches);
    const select = document.getElementById("landing-lang") as HTMLSelectElement;
    expect(screen.getByLabelText("Poster language")).toBe(select);
    const options = [...select.options].map((o) => [o.value, o.textContent, o.lang]);
    expect(options).toEqual([
      ["en-US", "English", "en-US"],
      ["pt-BR", "Português (Brasil)", "pt-BR"],
    ]);
    fireEvent.change(select, { target: { value: "pt-BR" } });
    expect(patches).toEqual([{ posterLocale: "pt-BR" }]);
  });

  it("shows the projection options capitalised while their values stay lowercase", () => {
    setup([]);
    const options = [...document.querySelectorAll<HTMLOptionElement>("#landing-projection option")];
    expect(options.map((o) => [o.value, o.textContent])).toEqual([
      ["stereographic", "Stereographic"],
      ["fisheye", "Fisheye"],
    ]);
  });

  it("shows Shape as a two-option segmented switch that is still a named radiogroup", () => {
    setup([]);
    const group = screen.getByRole("radiogroup", { name: "Shape" });
    expect(group.className).toContain("atlas-segmented");
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual(["square", "circle"]);
    expect(screen.getByRole("radio", { name: "circle" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "square" })).toBeDefined();
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
