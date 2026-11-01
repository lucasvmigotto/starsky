import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: LandingPage } = await import("./LandingPage.tsx");

afterEach(() => {
  cleanup();
});

describe("LandingPage layout (015)", () => {
  it("has no 'What is this page?' disclosure, and keeps the random-sky link", () => {
    render(<LandingPage />);
    expect(screen.queryByText("What is this page?")).toBeNull();
    expect(document.querySelector(".atlas-form-explainer")).toBeNull();
    expect(screen.getByRole("button", { name: "Load a random sky" })).toBeDefined();
  });

  it("puts date and time and the timezone with Detect in one pair, labels visible", () => {
    render(<LandingPage />);
    const pair = document.getElementById("landing-when")?.closest(".atlas-form-pair");
    expect(pair).not.toBeNull();
    expect(pair?.querySelector("#landing-tz")).not.toBeNull();
    expect(pair?.textContent).toContain("Timezone");
    expect(pair?.querySelector("label[for='landing-when']")?.textContent).toBe("Date and time");
    expect(screen.getByRole("button", { name: "Detect" })).toBeDefined();
  });

  it("has one Appearance and one Advanced disclosure, and no Sky or Observation", () => {
    render(<LandingPage />);
    const summaries = [...document.querySelectorAll("details > summary")].map((e) => e.textContent);
    expect(summaries).toEqual(["Appearance", "Advanced"]);
  });

  it("keeps every input's id and name", () => {
    render(<LandingPage />);
    for (const id of ["landing-when", "landing-tz", "landing-projection", "landing-fisheye", "landing-separation", "landing-glow", "landing-title", "landing-mag"]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(screen.getByRole("radiogroup", { name: "Input mode" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Shape" })).toBeDefined();
  });
});
