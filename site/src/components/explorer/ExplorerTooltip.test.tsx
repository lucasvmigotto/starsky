import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, render } = await import("@testing-library/react");
const { default: ExplorerTooltip } = await import("./ExplorerTooltip.tsx");
const { makeController } = await import("./harness.ts");

const DELAY = 30;
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function mount() {
  const world = makeController();
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  let invalidations = 0;
  const original = world.controller.invalidate.bind(world.controller);
  world.controller.invalidate = () => {
    invalidations++;
    original();
  };
  const { container } = render(
    <div>
      <ExplorerTooltip
        controller={world.controller}
        scene={world.scene}
        canvas={canvas}
        rightInset={() => 0}
        delayMs={DELAY}
      />
    </div>,
  );
  const send = (type: string, init: PointerEventInit = {}): void => {
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent(type, { pointerType: "mouse", clientX: 402, clientY: 301, bubbles: true, ...init }),
      );
    });
  };
  const tip = (): HTMLElement | null => container.querySelector(".explorer-tooltip");
  const rest = (ms = DELAY * 3): Promise<void> =>
    act(async () => {
      await wait(ms);
    });
  return { world, canvas, send, tip, rest, invalidations: () => invalidations, container };
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("ExplorerTooltip", () => {
  it("shows the star's name or HIP number, magnitude and horizon after the pointer rests", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    expect(tip()).toBeNull();
    await rest();
    expect(tip()?.textContent).toContain("HIP 1");
    expect(tip()?.textContent).toContain("Magnitude 1.00");
    expect(tip()?.textContent).toMatch(/Above the horizon|Below the horizon/);
  });

  it("is hidden from screen readers and never takes the pointer", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    await rest();
    expect(tip()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("never shows for touch, and a touch does not start the timer", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { pointerType: "touch" });
    await rest();
    expect(tip()).toBeNull();
  });

  it("shows for a pen", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { pointerType: "pen" });
    await rest();
    expect(tip()).not.toBeNull();
  });

  it("closes when the pointer moves off the star", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    await rest();
    send("pointermove", { clientX: 30, clientY: 30 });
    expect(tip()).toBeNull();
  });

  it("does not open if the pointer left before the delay", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    send("pointermove", { clientX: 30, clientY: 30 });
    await rest();
    expect(tip()).toBeNull();
  });

  it("closes on a press, a wheel and when the pointer leaves the map", async () => {
    for (const type of ["pointerdown", "wheel", "pointerleave"]) {
      const { send, tip, rest, container } = mount();
      send("pointermove");
      await rest();
      expect(tip(), type).not.toBeNull();
      send(type);
      expect(tip(), type).toBeNull();
      cleanup();
      container.remove();
    }
  });

  it("does not open while a button is held, which is a drag", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { buttons: 1 });
    await rest();
    expect(tip()).toBeNull();
  });

  it("closes on Escape before anything else sees the key, and the selection is untouched", async () => {
    const { send, tip, rest, world } = mount();
    world.controller.select("HIP:2");
    send("pointermove");
    await rest();
    expect(tip()).not.toBeNull();
    let reached = false;
    const spy = (): void => {
      reached = true;
    };
    document.body.addEventListener("keydown", spy);
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    document.body.removeEventListener("keydown", spy);
    expect(tip()).toBeNull();
    expect(reached).toBe(false);
    expect(world.controller.getSelection()).toBe("HIP:2");
  });

  it("lets Escape through when no tooltip is open", () => {
    mount();
    let reached = false;
    const spy = (): void => {
      reached = true;
    };
    document.body.addEventListener("keydown", spy);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    document.body.removeEventListener("keydown", spy);
    expect(reached).toBe(true);
  });

  it("draws no frames: it never asks the controller to repaint", async () => {
    const { send, rest, invalidations } = mount();
    const before = invalidations();
    send("pointermove");
    send("pointermove", { clientX: 404, clientY: 303 });
    await rest();
    send("pointermove", { clientX: 30, clientY: 30 });
    send("pointerleave");
    expect(invalidations()).toBe(before);
  });
});
