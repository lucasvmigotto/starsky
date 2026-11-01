/**
 * The active interface locale as React state. `App` subscribes at the root, so
 * a switch re-renders the whole tree in place: no reload, no remount, and the
 * page keeps its form, camera or draft.
 */
import { useSyncExternalStore } from "react";
import { type Locale, getLocale, subscribeLocale } from "./locale.ts";

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}
