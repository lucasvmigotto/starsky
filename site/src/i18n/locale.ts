/**
 * The active interface locale (018-pt-br, BCR-0015).
 *
 * Chosen once, in this order: the visitor's stored choice, then the browser's
 * `navigator.languages` (the first `en*` or `pt*` tag decides, so any `pt*` tag
 * ahead of English gives `pt-BR`), then `en-US`. Switching notifies subscribers
 * so the whole interface re-renders without a reload, and `<html lang>`
 * follows.
 *
 * Storage is `localStorage`, and every access is guarded: a private window or
 * blocked site data makes it throw, and the switcher must still work for the
 * rest of the visit. Nothing leaves the browser.
 *
 * This is the **interface** locale only. The poster's words come from its link
 * (`lang` in `#s=` / `#studio=`), never from here, so one link draws the same
 * poster for every visitor.
 */

export type Locale = "en-US" | "pt-BR";

export const LOCALES: readonly Locale[] = ["en-US", "pt-BR"];
export const DEFAULT_LOCALE: Locale = "en-US";
export const LOCALE_STORAGE_KEY = "starsky.locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en-US" || value === "pt-BR";
}

/** The locale a browser's language list asks for, or null when it names neither. */
export function localeFromLanguages(languages: readonly string[]): Locale | null {
  for (const tag of languages) {
    const lower = tag.toLowerCase();
    if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
    if (lower === "en" || lower.startsWith("en-")) return "en-US";
  }
  return null;
}

export function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // No storage: the choice holds for this visit only.
  }
}

function browserLanguages(): readonly string[] {
  try {
    // `Array.from` throws where `navigator.languages` is absent (Bun, old engines).
    return Array.from(navigator.languages);
  } catch {
    return [];
  }
}

/** Stored choice, then the browser's languages, then `en-US`. */
export function detectLocale(): Locale {
  return readStoredLocale() ?? localeFromLanguages(browserLanguages()) ?? DEFAULT_LOCALE;
}

function applyDocumentLang(locale: Locale): void {
  try {
    document.documentElement.lang = locale;
  } catch {
    // No document (unit tests without a DOM).
  }
}

let active: Locale = detectLocale();
applyDocumentLang(active);
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return active;
}

/** Switch the interface language, remember it on this browser and tell every subscriber. */
export function setLocale(next: Locale, { persist = true }: { persist?: boolean } = {}): void {
  if (persist) writeStoredLocale(next);
  if (next === active) return;
  active = next;
  applyDocumentLang(next);
  for (const listener of listeners) listener();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
