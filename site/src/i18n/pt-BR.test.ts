/**
 * The pt-BR catalogue and the locale store (018-pt-br T001).
 *
 * Key parity is a type error (`Record<CopyKey, string>`); this file checks what
 * the type cannot: that each translation keeps its original's placeholders,
 * that `t()` follows the active locale, and that the store's order (stored
 * choice, browser languages, en-US) and guarded storage hold.
 */
import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { enUS } = await import("./en-US.ts");
const { ptBR } = await import("./pt-BR.ts");
const { t } = await import("./index.ts");
const {
  LOCALE_STORAGE_KEY,
  detectLocale,
  getLocale,
  localeFromLanguages,
  readStoredLocale,
  setLocale,
  subscribeLocale,
} = await import("./locale.ts");

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
}

const realStorage = window.localStorage;
function blockStorage(): void {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    },
  });
}

beforeAll(() => {
  setLocale("en-US", { persist: false });
});

afterEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: realStorage });
  window.localStorage.clear();
  setLocale("en-US", { persist: false });
});

describe("pt-BR catalogue", () => {
  it("has exactly the en-US keys", () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(enUS).sort());
  });

  it("keeps every key's {placeholders}, key by key", () => {
    const english: Readonly<Record<string, string>> = enUS;
    const mismatched = Object.entries(ptBR)
      .filter(([key, value]) => placeholders(value).join() !== placeholders(english[key] ?? "").join())
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it("translates the interface, not the notices or names that stay as they are", () => {
    expect(ptBR["landing.title"]).not.toBe(enUS["landing.title"]);
    for (const kept of ["Hipparcos", "Stellarium", "CC BY-SA 4.0", "© OpenStreetMap contributors"]) {
      expect(ptBR["footer.attribution"]).toContain(kept);
    }
    expect(ptBR["landing.map.attribution"]).toBe(enUS["landing.map.attribution"]);
    expect(ptBR["footer.version"]).toBe(enUS["footer.version"]);
    expect(ptBR["landing.search.credit"]).toContain("Nominatim");
    // Each language is named in itself in both catalogues.
    expect(ptBR["site.language.en"]).toBe("English");
    expect(enUS["site.language.ptBR"]).toBe("Português (Brasil)");
  });

  it("splits the same sentences around their inline code as en-US does", () => {
    expect(ptBR["dataError.bodyPrefix"].endsWith(" ")).toBe(true);
    expect(ptBR["dataError.bodySuffix"].startsWith(" ")).toBe(true);
    expect(ptBR["empty.bodyPrefix"].endsWith(" ")).toBe(true);
    expect(ptBR["studio.summary.noteBefore"].endsWith(" ")).toBe(true);
  });
});

describe("t() follows the active locale", () => {
  it("resolves in en-US, then in pt-BR after a switch, with the same parameters", () => {
    expect(t("viewer.copyLink")).toBe("Copy link");
    setLocale("pt-BR", { persist: false });
    expect(t("viewer.copyLink")).toBe("Copiar link");
    expect(t("viewer.heading.abovePlace", { place: "São Paulo" })).toBe("Céu noturno sobre São Paulo");
  });

  it("still fails visibly for a missing key in pt-BR", () => {
    setLocale("pt-BR", { persist: false });
    expect(t("viewer.doesNotExist")).toBe("⟨viewer.doesNotExist⟩");
  });

  it("sets <html lang> to the active locale", () => {
    setLocale("pt-BR", { persist: false });
    expect(document.documentElement.lang).toBe("pt-BR");
    setLocale("en-US", { persist: false });
    expect(document.documentElement.lang).toBe("en-US");
  });

  it("tells subscribers about a switch, and only about a change", () => {
    let calls = 0;
    const stop = subscribeLocale(() => {
      calls += 1;
    });
    setLocale("pt-BR", { persist: false });
    setLocale("pt-BR", { persist: false });
    stop();
    setLocale("en-US", { persist: false });
    expect(calls).toBe(1);
    expect(getLocale()).toBe("en-US");
  });
});

describe("choosing the locale", () => {
  it("reads the browser's languages in order: the first en* or pt* decides", () => {
    expect(localeFromLanguages(["pt-BR", "en-US"])).toBe("pt-BR");
    expect(localeFromLanguages(["pt-PT"])).toBe("pt-BR");
    expect(localeFromLanguages(["pt"])).toBe("pt-BR");
    expect(localeFromLanguages(["fr-FR", "pt-BR"])).toBe("pt-BR");
    expect(localeFromLanguages(["en-GB", "pt-BR"])).toBe("en-US");
    expect(localeFromLanguages(["fr-FR", "de"])).toBeNull();
    expect(localeFromLanguages([])).toBeNull();
    // A tag that merely starts with the letters is not Portuguese.
    expect(localeFromLanguages(["pth"])).toBeNull();
  });

  it("prefers a stored choice over the browser, and remembers a switch", () => {
    setLocale("pt-BR");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pt-BR");
    expect(readStoredLocale()).toBe("pt-BR");
    expect(detectLocale()).toBe("pt-BR");
  });

  it("ignores a stored value that is not a locale", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr-FR");
    expect(readStoredLocale()).toBeNull();
    // happy-dom's browser languages are en-US.
    expect(detectLocale()).toBe("en-US");
  });

  it("works when storage throws: nothing stored, and switching still switches", () => {
    blockStorage();
    expect(readStoredLocale()).toBeNull();
    expect(detectLocale()).toBe("en-US");
    expect(() => {
      setLocale("pt-BR");
    }).not.toThrow();
    expect(getLocale()).toBe("pt-BR");
    expect(t("viewer.copyLink")).toBe("Copiar link");
  });
});
