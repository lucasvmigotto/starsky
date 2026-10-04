import { useEffect, useState } from "react";
import type { Locale } from "../content/pages.ts";
import { uiEn, uiPt, type UiKey } from "./locales.ts";

const STORE_KEY = "starsky-docs-locale";

function detect(): Locale {
  try {
    const stored = window.localStorage.getItem(STORE_KEY);
    if (stored === "pt" || stored === "en") return stored;
  } catch {
    // Private mode: fall through to the browser language.
  }
  const lang = window.navigator.language.toLowerCase();
  return lang.startsWith("pt") ? "pt" : "en";
}

export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    setLocale(detect());
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
    try {
      window.localStorage.setItem(STORE_KEY, locale);
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, [locale]);
  return [locale, setLocale];
}

export function t(locale: Locale, key: UiKey, params?: Record<string, string>): string {
  const table = locale === "pt" ? uiPt : uiEn;
  let text: string = table[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(`{${name}}`, value);
    }
  }
  return text;
}

/** Every UI key resolves in both locales — a hole ships as a build break. */
export function uiKeys(): UiKey[] {
  return Object.keys(uiEn) as UiKey[];
}
