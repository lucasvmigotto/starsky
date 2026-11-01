import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: CoordinateFields } = await import("./CoordinateFields.tsx");

afterEach(() => {
  cleanup();
});

interface Calls {
  toggled: number;
  edits: [string, string][];
}

function mount(props: { open: boolean; latText?: string; lonText?: string }): Calls {
  const calls: Calls = { toggled: 0, edits: [] };
  render(
    <CoordinateFields
      open={props.open}
      latText={props.latText ?? "40.7580"}
      lonText={props.lonText ?? "-73.9855"}
      onToggle={() => calls.toggled++}
      onEdit={(lat, lon) => calls.edits.push([lat, lon])}
    />,
  );
  return calls;
}

describe("CoordinateFields", () => {
  it("is a Coordinates toggle with the inputs hidden until it is opened", () => {
    const calls = mount({ open: false });
    const toggle = screen.getByRole("button", { name: "Coordinates" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("Latitude")).toBeNull();
    fireEvent.click(toggle);
    expect(calls.toggled).toBe(1);
  });

  it("shows latitude and longitude with their values when open", () => {
    mount({ open: true });
    expect(screen.getByRole("button", { name: "Coordinates" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText<HTMLInputElement>("Latitude").value).toBe("40.7580");
    expect(screen.getByLabelText<HTMLInputElement>("Longitude").value).toBe("-73.9855");
  });

  it("reports an edit of either field with both texts", () => {
    const calls = mount({ open: true });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "30" } });
    expect(calls.edits).toEqual([
      ["12.5", "-73.9855"],
      ["40.7580", "30"],
    ]);
  });

  it("flags each field on its own with the existing error copy, as an alert tied to the input", () => {
    mount({ open: true, latText: "95", lonText: "-200" });
    const lat = screen.getByLabelText("Latitude");
    const lon = screen.getByLabelText("Longitude");
    expect(lat.getAttribute("aria-invalid")).toBe("true");
    expect(lon.getAttribute("aria-invalid")).toBe("true");
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toEqual([
      "Latitude must be a number between -90 and 90.",
      "Longitude must be a number between -180 and 180.",
    ]);
    expect(document.getElementById(lat.getAttribute("aria-describedby") ?? "")?.textContent).toContain("Latitude must be");
  });

  it("shows no error for a valid pair, the limits included", () => {
    mount({ open: true, latText: "-90", lonText: "180" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Latitude").getAttribute("aria-invalid")).toBe("false");
  });
});
