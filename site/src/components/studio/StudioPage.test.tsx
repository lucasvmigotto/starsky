/**
 * The Studio at the component level (012 T007): the draft in the fragment, the
 * poster-only controls, the read-only summary, copy link, and the way back.
 * Canvas pixels are the reference suite's and the e2e journeys' job.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

// Vite defines this at build time; the footer reads it.
(globalThis as unknown as Record<string, unknown>)["__APP_VERSION__"] = "0.0.0-test";

const { act, cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { default: StudioPage, DRAFT_DEBOUNCE_MS } = await import("./StudioPage.tsx");
const { draftHash } = await import("../../lib/studio/draft.ts");
const { decodeShareFragment, fragmentFromHash } = await import("../../lib/share.ts");
const { decodeExplorer, explorerFragmentFromHash } = await import("../../lib/sky/payload.ts");
const { saveReturnCamera } = await import("../../lib/scene/returnCamera.ts");
const { encodePayload } = await import("../../lib/encode.ts");
const { t } = await import("../../i18n/index.ts");

import type { SharePayload } from "../../lib/share.ts";

const PAYLOAD: SharePayload = {
  v: 1,
  lat: 30.0131,
  lon: 31.2089,
  place: "Giza",
  when_utc: "2025-08-12T18:30:00Z",
  tz: "Africa/Cairo",
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
    title: "Perseids",
  },
};

const realFetch = globalThis.fetch;
const realFonts = Object.getOwnPropertyDescriptor(document, "fonts");

beforeEach(() => {
  globalThis.fetch = ((url: string): Promise<Response> =>
    Promise.resolve(
      new Response(JSON.stringify(url.includes("catalog") ? { stars: [] } : { segments: [] }), {
        status: 200,
      }),
    )) as unknown as typeof fetch;
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve(), check: () => true },
  });
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  if (realFonts) Object.defineProperty(document, "fonts", realFonts);
  else Reflect.deleteProperty(document, "fonts");
});

function open(payload: SharePayload = PAYLOAD): void {
  window.location.hash = draftHash(payload);
}

function currentDraft(): SharePayload {
  const fragment = window.location.hash.replace(/^#studio=/, "");
  return decodeShareFragment(fragment);
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, DRAFT_DEBOUNCE_MS + 60));
  });
}

describe("StudioPage", () => {
  it("shows the poster-only controls and a read-only summary of the moment", async () => {
    open();
    render(<StudioPage />);
    expect(screen.getByRole("heading", { level: 1, name: t("studio.poster.heading") })).toBeDefined();
    expect(screen.getByLabelText(t("studio.title.label"))).toBeDefined();
    expect(document.getElementById("studio-mag")).not.toBeNull();
    expect(document.getElementById("studio-projection")).not.toBeNull();
    // Summary: the place and the formatted moment, as text, not inputs.
    const summary = screen.getByRole("group", { name: t("studio.moment.legend") });
    expect(summary.textContent).toContain("Giza");
    expect(summary.textContent).toContain("30.0131°N");
    expect(summary.querySelector("input")).toBeNull();
    await settle();
  });

  it("updates #studio= with replaceState after a change, without a hashchange or a #s=", async () => {
    open();
    render(<StudioPage />);
    // Setting the hash above queues its own hashchange; let that pass first.
    await settle();
    let hashchanges = 0;
    const onHash = (): void => {
      hashchanges += 1;
    };
    window.addEventListener("hashchange", onHash);
    fireEvent.change(document.getElementById("studio-mag") as HTMLInputElement, { target: { value: "6.5" } });
    await settle();
    window.removeEventListener("hashchange", onHash);
    expect(window.location.hash.startsWith("#studio=")).toBe(true);
    expect(currentDraft().options.magnitude_limit).toBe(6.5);
    expect(currentDraft().place).toBe("Giza");
    expect(hashchanges).toBe(0);
  });

  it("shows the control's new value at once, before the preview catches up", () => {
    open();
    render(<StudioPage />);
    fireEvent.change(document.getElementById("studio-mag") as HTMLInputElement, { target: { value: "6.5" } });
    expect(document.querySelector('output[for="studio-mag"]')?.textContent).toBe("6.5");
  });

  it("refuses a title the poster face cannot draw, with the usual message, and keeps the last good one", async () => {
    open();
    render(<StudioPage />);
    await settle();
    fireEvent.change(screen.getByLabelText(t("studio.title.label")), { target: { value: "Night \u{1F30C}" } });
    await settle();
    expect(screen.getByRole("alert").textContent).toBe(t("fontError.titleUnsupported", { character: "\u{1F30C}" }));
    expect(currentDraft().options.title).toBe("Perseids");
    fireEvent.change(screen.getByLabelText(t("studio.title.label")), { target: { value: "Night" } });
    await settle();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(currentDraft().options.title).toBe("Night");
  });

  it("says so when a seeded title arrives with a character it cannot draw, and drops it", async () => {
    open({ ...PAYLOAD, options: { ...PAYLOAD.options, title: "Noite \u{1F30C} Austral" } });
    render(<StudioPage />);
    await settle();
    expect(document.body.textContent).toContain(t("fontError.titleAdjusted", { characters: "\u{1F30C}" }));
    const field: unknown = screen.getByLabelText(t("studio.title.label"));
    expect(field instanceof HTMLInputElement && field.value).toBe("Noite Austral");
  });

  it("copies a #s= link for the current draft, never a #studio= one", async () => {
    open();
    let copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string): Promise<void> => {
          copied = text;
          return Promise.resolve();
        },
      },
    });
    render(<StudioPage />);
    await settle();
    fireEvent.change(document.getElementById("studio-mag") as HTMLInputElement, { target: { value: "4.2" } });
    await settle();
    act(() => {
      screen.getByRole("button", { name: t("viewer.share.open") }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: t("viewer.copyLink") }).click();
      await Promise.resolve();
    });
    expect(copied).not.toContain("studio=");
    const fragment = fragmentFromHash(copied.slice(copied.indexOf("#")));
    expect(fragment).not.toBeNull();
    expect(decodeShareFragment(fragment ?? "").options.magnitude_limit).toBe(4.2);
    expect(screen.getByText(t("viewer.linkCopied"))).toBeDefined();
  });

  it("offers Return to Explorer for the same scene, at the initial view when nothing was saved", async () => {
    open();
    render(<StudioPage />);
    await settle();
    const link = screen.getByRole("link", { name: t("studio.returnToExplorer") });
    const href = link.getAttribute("href") ?? "";
    const fragment = explorerFragmentFromHash(href);
    expect(fragment).not.toBeNull();
    const explorer = decodeExplorer(fragment ?? "");
    expect(explorer.place).toBe("Giza");
    expect(explorer.when_utc).toBe(PAYLOAD.when_utc);
    expect(explorer.title).toBe("Perseids");
    expect(explorer.sel).toBeNull();
  });

  it("returns to the camera the visitor left, when this tab still has it", async () => {
    saveReturnCamera(
      { lat: PAYLOAD.lat, lon: PAYLOAD.lon, when_utc: PAYLOAD.when_utc },
      { orientation: [0, 0, 0, 1], fovDeg: 33 },
    );
    open();
    render(<StudioPage />);
    await settle();
    const href = screen.getByRole("link", { name: t("studio.returnToExplorer") }).getAttribute("href") ?? "";
    const explorer = decodeExplorer(explorerFragmentFromHash(href) ?? "");
    expect(explorer.fov).toBe(33);
    expect(explorer.q).toEqual([0, 0, 0, 1]);
  });

  it("shows the invalid-link pattern, with a way back, for an unreadable draft", () => {
    window.location.hash = "#studio=not-a-draft";
    render(<StudioPage />);
    expect(screen.getByText(t("invalid.title"))).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("could not be read");
    expect(screen.getByRole("link", { name: t("studio.back") }).getAttribute("href")).toBe("#/");
  });

  it("rejects what the share validation rejects (same codec, same limits)", () => {
    const bad = encodePayload({ ...PAYLOAD, options: { ...PAYLOAD.options, magnitude_limit: 9 } });
    window.location.hash = `#studio=${bad}`;
    render(<StudioPage />);
    expect(screen.getByText(t("invalid.title"))).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("magnitude_limit");
  });

  it("offers export, including the layout choice, from the shared controls", async () => {
    open();
    render(<StudioPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("viewer.export.open") })).toBeDefined();
    });
    act(() => {
      screen.getByRole("button", { name: t("viewer.export.open") }).click();
    });
    expect(screen.getByRole("radio", { name: t("viewer.export.layout.story") })).toBeDefined();
  });
});
