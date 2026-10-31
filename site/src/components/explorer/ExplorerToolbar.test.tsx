import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { Profiler } = await import("react");
const { default: ExplorerToolbar } = await import("./ExplorerToolbar.tsx");
const { default: ExplorerInspector } = await import("./ExplorerInspector.tsx");
const { makeController } = await import("./harness.ts");
const { FOV_MAX_DEG, FOV_MIN_DEG } = await import("../../lib/sky/camera.ts");

import type { ReactNode } from "react";

interface Opts {
  fov?: number;
  searchOpen?: boolean;
  layersOpen?: boolean;
}

function mount(opts: Opts = {}, wrap: (node: ReactNode) => ReactNode = (n) => n) {
  const world = makeController(opts.fov);
  const calls = { search: 0, layers: 0 };
  render(
    wrap(
      <ExplorerToolbar
        controller={world.controller}
        searchOpen={opts.searchOpen ?? false}
        layersOpen={opts.layersOpen ?? false}
        onToggleSearch={() => {
          calls.search++;
        }}
        onToggleLayers={() => {
          calls.layers++;
        }}
      />,
    ),
  );
  return { ...world, calls };
}

afterEach(() => {
  cleanup();
});

describe("ExplorerToolbar: Create poster", () => {
  it("is offered once the page can act on it, and asks for the poster", () => {
    const world = makeController();
    let created = 0;
    render(
      <ExplorerToolbar
        controller={world.controller}
        searchOpen={false}
        layersOpen={false}
        onToggleSearch={() => {}}
        onToggleLayers={() => {}}
        onCreatePoster={() => {
          created++;
        }}
      />,
    );
    const button = screen.getByRole("button", { name: "Create poster" });
    expect(button.tagName).toBe("BUTTON");
    fireEvent.click(button);
    expect(created).toBe(1);
  });
});

describe("ExplorerToolbar", () => {
  it("has no Inspector button: the panel's tab replaces it", () => {
    mount();
    expect(screen.queryByRole("button", { name: "Inspector" })).toBeNull();
  });

  it("offers named buttons for zoom, reset, layers and search", () => {
    mount();
    const toolbar = screen.getByRole("toolbar", { name: "Map controls" });
    expect(toolbar).toBeTruthy();
    for (const name of ["Zoom in", "Zoom out", "Reset view", "Layers", "Search"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: /poster/i })).toBeNull();
  });

  it("gives each button a tooltip, with the key where there is one", () => {
    mount();
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("title")).toBe("Zoom in (+)");
    expect(screen.getByRole("button", { name: "Zoom out" }).getAttribute("title")).toBe("Zoom out (-)");
    expect(screen.getByRole("button", { name: "Reset view" }).getAttribute("title")).toBe("Reset view (0)");
    expect(screen.getByRole("button", { name: "Layers" }).getAttribute("title")).toBe("Layers");
  });

  it("zooms and resets through the controller", () => {
    const { controller } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(controller.getCamera().fovDeg).toBeCloseTo(48, 6);
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(controller.getCamera().fovDeg).toBeCloseTo(60, 6);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(controller.getCamera().fovDeg).toBe(100);
  });

  it("disables zoom in at the closest limit and zoom out at the widest", () => {
    mount({ fov: FOV_MIN_DEG });
    expect(screen.getByRole("button", { name: "Zoom in" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Zoom out" }).hasAttribute("disabled")).toBe(false);
    cleanup();
    mount({ fov: FOV_MAX_DEG });
    expect(screen.getByRole("button", { name: "Zoom out" }).hasAttribute("disabled")).toBe(true);
  });

  it("disables a zoom button as soon as its own click reaches the limit, and keeps focus on the toolbar", () => {
    mount({ fov: 5.2 });
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    zoomIn.focus();
    fireEvent.click(zoomIn);
    expect(zoomIn.hasAttribute("disabled")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Zoom out" }));
  });

  it("learns of a wheel zoom to the limit when the view settles", () => {
    const { controller, settle } = mount({ fov: 6 });
    controller.wheel(-200, 400, 300);
    controller.wheel(-200, 400, 300);
    controller.wheel(-200, 400, 300);
    act(() => {
      settle();
    });
    expect(screen.getByRole("button", { name: "Zoom in" }).hasAttribute("disabled")).toBe(true);
  });

  it("reflects what is open with aria-expanded and toggles by click", () => {
    const { calls } = mount({ layersOpen: true });
    expect(screen.getByRole("button", { name: "Layers" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Search" }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Layers" }));
    expect(calls).toEqual({ search: 1, layers: 1 });
  });
});

describe("FR-001: a moving sky does not rerender the panels", () => {
  it("does not rerender the toolbar or the inspector for pointer moves, wheel, keys or frames", () => {
    let toolbarRenders = 0;
    let inspectorRenders = 0;
    const world = makeController();
    const noop = (): void => undefined;
    render(
      <>
        <Profiler
          id="toolbar"
          onRender={() => {
            toolbarRenders++;
          }}
        >
          <ExplorerToolbar
            controller={world.controller}
            searchOpen={false}
            layersOpen={false}
            onToggleSearch={noop}
            onToggleLayers={noop}
          />
        </Profiler>
        <Profiler
          id="inspector"
          onRender={() => {
            inspectorRenders++;
          }}
        >
          <ExplorerInspector
            scene={world.scene}
            view={world.controller.view}
            selection="HIP:1"
            open
            onChoose={noop}
            onCenter={noop}
            onClear={noop}
            onToggle={noop}
            onClose={noop}
          />
        </Profiler>
      </>,
    );
    const toolbarBefore = toolbarRenders;
    const inspectorBefore = inspectorRenders;
    expect(toolbarBefore).toBeGreaterThan(0);
    const c = world.controller;
    c.pointerDown(1, 100, 100);
    for (let i = 1; i <= 50; i++) c.pointerMove(1, 100 + i * 3, 100 + i);
    c.pointerUp(1, 250, 150);
    c.wheel(-120, 400, 300);
    c.wheel(120, 400, 300);
    c.key("ArrowLeft");
    c.key("ArrowUp");
    c.invalidate();
    act(() => {
      world.settle();
    });
    expect(toolbarRenders).toBe(toolbarBefore);
    expect(inspectorRenders).toBe(inspectorBefore);

    // Control: the probe does see a render when the zoom buttons' state really changes.
    c.zoomBy(40);
    act(() => {
      world.settle();
    });
    expect(toolbarRenders).toBeGreaterThan(toolbarBefore);
    expect(inspectorRenders).toBe(inspectorBefore);
  });
});
