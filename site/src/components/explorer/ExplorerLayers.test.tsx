import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerLayers } = await import("./ExplorerLayers.tsx");
const { makeController } = await import("./harness.ts");

function mount() {
  const world = makeController();
  let closed = 0;
  render(
    <ExplorerLayers
      controller={world.controller}
      onClose={() => {
        closed++;
      }}
    />,
  );
  return { ...world, closed: () => closed };
}

afterEach(() => {
  cleanup();
});

describe("ExplorerLayers", () => {
  it("shows each layer with its current state", () => {
    mount();
    expect(screen.queryByRole("checkbox", { name: "Constellation lines", checked: true })).not.toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Equatorial grid", checked: false })).not.toBeNull();
    expect(screen.queryByRole("radio", { name: "Dimmed", checked: true })).not.toBeNull();
  });

  it("toggles layers through the controller", () => {
    const { controller } = mount();
    fireEvent.click(screen.getByRole("checkbox", { name: "Horizon" }));
    expect(controller.getLayers().horizon).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Equatorial grid" }));
    expect(controller.getLayers().equatorialGrid).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Constellation names" }));
    expect(controller.getLayers().constellationLabels).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Cardinal points" }));
    expect(controller.getLayers().cardinalDirections).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Constellation lines" }));
    expect(controller.getLayers().constellationLines).toBe(false);
  });

  it("chooses dimmed or hidden for stars below the horizon", () => {
    const { controller } = mount();
    expect(screen.getByRole("radiogroup", { name: "Below the horizon" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Hidden" }));
    expect(controller.getLayers().below).toBe("hidden");
    expect(screen.queryByRole("radio", { name: "Hidden", checked: true })).not.toBeNull();
  });

  it("closes from its button and on Escape", () => {
    const { closed } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Close layers" }));
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Horizon" }), { key: "Escape" });
    expect(closed()).toBe(2);
  });
});
