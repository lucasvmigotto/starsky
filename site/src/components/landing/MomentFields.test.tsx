import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: MomentFields } = await import("./MomentFields.tsx");
const { default: AdvancedFields } = await import("./AdvancedFields.tsx");

afterEach(() => {
  cleanup();
});

describe("MomentFields", () => {
  it("puts date and time, timezone and Detect in one pair, with visible labels", () => {
    render(<MomentFields title="" titleError={null} onTitle={() => undefined} when="2026-01-01T00:00" tz="UTC" onWhen={() => undefined} onTz={() => undefined} onDetect={() => undefined} />);
    const pair = document.getElementById("landing-when")?.closest(".atlas-form-pair");
    expect(pair).not.toBeNull();
    expect(pair?.querySelector("#landing-tz")).not.toBeNull();
    expect(pair?.querySelector("label[for='landing-when']")?.textContent).toBe("Date and time");
    expect(pair?.querySelector("label[for='landing-tz']")?.textContent).toBe("Timezone");
    expect(screen.getByRole("button", { name: "Detect my timezone" })).toBeDefined();
  });

  it("puts an optional Title first, above the date row, and reports it", () => {
    const seen: string[] = [];
    render(<MomentFields title="" titleError={null} onTitle={(x) => seen.push(x)} when="2026-01-01T00:00" tz="UTC" onWhen={() => undefined} onTz={() => undefined} onDetect={() => undefined} />);
    const title = screen.getByLabelText<HTMLInputElement>("Title");
    expect(title.maxLength).toBe(200);
    expect(title.compareDocumentPosition(screen.getByLabelText("Date and time")) & 4).toBeTruthy();
    fireEvent.change(title, { target: { value: "Our first flat" } });
    expect(seen).toEqual(["Our first flat"]);
  });

  it("shows the title error beside the field as an alert tied to it", () => {
    render(<MomentFields title="x" titleError="cannot draw" onTitle={() => undefined} when="2026-01-01T00:00" tz="UTC" onWhen={() => undefined} onTz={() => undefined} onDetect={() => undefined} />);
    const title = screen.getByLabelText("Title");
    expect(title.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("cannot draw");
    expect(title.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });

  it("Detect is an icon button, named and titled, with no visible text", () => {
    render(<MomentFields title="" titleError={null} onTitle={() => undefined} when="2026-01-01T00:00" tz="UTC" onWhen={() => undefined} onTz={() => undefined} onDetect={() => undefined} />);
    const button = screen.getByRole("button", { name: "Detect my timezone" });
    expect(button.getAttribute("title")).toBe("Detect my timezone");
    expect(button.className).toContain("atlas-btn-icon");
    expect(button.querySelector("svg[data-icon=locate]")).not.toBeNull();
    expect(button.textContent).toBe("");
  });

  it("reports edits and Detect", () => {
    const seen: string[] = [];
    render(
      <MomentFields
        title=""
        titleError={null}
        onTitle={() => undefined}
        when="2026-01-01T00:00"
        tz="UTC"
        onWhen={(w) => seen.push(`when:${w}`)}
        onTz={(z) => seen.push(`tz:${z}`)}
        onDetect={() => seen.push("detect")}
      />,
    );
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-02-03T04:05" } });
    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "Asia/Tokyo" } });
    fireEvent.click(screen.getByRole("button", { name: "Detect my timezone" }));
    expect(seen).toEqual(["when:2026-02-03T04:05", "tz:Asia/Tokyo", "detect"]);
  });
});

describe("AdvancedFields", () => {
  it("is one collapsed disclosure holding the limiting magnitude only", () => {
    render(<AdvancedFields mag={5.8} onMag={() => undefined} />);
    const details = document.querySelector("details");
    expect(details?.open).toBe(false);
    expect(details?.querySelector("summary")?.textContent).toBe("Advanced");
    const controls = [...(details?.querySelectorAll("input, select, textarea") ?? [])];
    expect(controls.map((c) => c.id)).toEqual(["landing-mag"]);
    expect(screen.getByLabelText("Limiting magnitude")).toBeDefined();
  });

  it("reports the magnitude as a number", () => {
    const seen: number[] = [];
    render(<AdvancedFields mag={5.8} onMag={(m) => seen.push(m)} />);
    fireEvent.change(screen.getByLabelText("Limiting magnitude"), { target: { value: "4.2" } });
    expect(seen).toEqual([4.2]);
  });
});
