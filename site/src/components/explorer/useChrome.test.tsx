import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render } = await import("@testing-library/react");
const { useRef } = await import("react");
const { default: useChrome } = await import("./useChrome.ts");

const IDLE = 40;
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let tapGuard: (() => boolean) | null = null;

function Probe({ popover = false, pinned = false }: { popover?: boolean; pinned?: boolean }) {
  const root = useRef<HTMLDivElement | null>(null);
  const chrome = useChrome({ rootRef: root, popoverOpen: popover, pinned, idleMs: IDLE });
  tapGuard = chrome.hiddenNow;
  return (
    <div ref={root} data-testid="root" data-chrome={chrome.state}>
      <div className="explorer-dock">
        <button type="button" data-testid="control" />
      </div>
      <canvas data-testid="canvas" tabIndex={0} />
    </div>
  );
}

const state = (container: HTMLElement): string | null =>
  container.querySelector("[data-testid=root]")?.getAttribute("data-chrome") ?? null;

afterEach(() => {
  cleanup();
});

describe("useChrome", () => {
  it("starts hidden and says so to a tap that arrives first", () => {
    const { container } = render(<Probe />);
    expect(state(container)).toBe("hidden");
    expect(tapGuard?.()).toBe(true);
  });

  it("comes back on pointermove, pointerdown, wheel, touchstart and keydown", () => {
    for (const type of ["pointermove", "pointerdown", "wheel", "touchstart", "keydown"]) {
      const { container, unmount } = render(<Probe />);
      act(() => {
        document.dispatchEvent(new Event(type, { bubbles: true }));
      });
      expect(state(container), type).toBe("visible");
      unmount();
    }
  });

  it("hides again after the idle time", async () => {
    const { container } = render(<Probe />);
    act(() => {
      document.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    expect(state(container)).toBe("visible");
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("keeps later activity from hiding it early", async () => {
    const { container } = render(<Probe />);
    act(() => {
      document.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    await act(async () => {
      await wait(IDLE / 2);
      document.dispatchEvent(new Event("pointermove", { bubbles: true }));
      await wait(IDLE * 0.75);
    });
    expect(state(container)).toBe("visible");
  });

  it("stays while a popover is open, and hides after it closes", async () => {
    const { container, rerender } = render(<Probe popover />);
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("visible");
    rerender(<Probe popover={false} />);
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("stays while the strip is pinned", async () => {
    const { container } = render(<Probe pinned />);
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("visible");
  });

  it("stays while the pointer rests on a control, and hides once it leaves", async () => {
    const { container, getByTestId } = render(<Probe />);
    act(() => {
      document.dispatchEvent(new Event("pointermove", { bubbles: true }));
      fireEvent.pointerOver(getByTestId("control"));
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("visible");
    act(() => {
      fireEvent.pointerOver(getByTestId("canvas"));
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("stays while focus is on a control, and focusing one brings it back", async () => {
    const { container, getByTestId } = render(<Probe />);
    expect(state(container)).toBe("hidden");
    act(() => {
      getByTestId("control").focus();
    });
    expect(state(container)).toBe("visible");
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("visible");
    act(() => {
      getByTestId("control").blur();
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("does not count focus on the map itself as a control", async () => {
    const { container, getByTestId } = render(<Probe />);
    act(() => {
      document.dispatchEvent(new Event("pointermove", { bubbles: true }));
      getByTestId("canvas").focus();
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("stays through a drag, from pointerdown to pointerup", async () => {
    const { container } = render(<Probe />);
    act(() => {
      document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("visible");
    act(() => {
      document.dispatchEvent(new Event("pointerup", { bubbles: true }));
    });
    await act(async () => {
      await wait(IDLE * 3);
    });
    expect(state(container)).toBe("hidden");
  });

  it("reports hidden to a touch tap at tap time, before that tap's own activity", () => {
    render(<Probe />);
    expect(tapGuard?.()).toBe(true);
    act(() => {
      document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(tapGuard?.()).toBe(false);
  });
});
