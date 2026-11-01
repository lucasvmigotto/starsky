/**
 * Debounced, cancellable place search for the landing. Pure of React: the
 * controller owns the timer and the request in flight and reports state to a
 * callback, so the rules are testable with a stubbed search and fake timers.
 *
 * Nominatim's policy asks for about one request a second and no heavy use, so
 * typing waits for a pause, and a request is aborted the moment the text
 * changes.
 */
import type { ResolvedPlace } from "../geocode.ts";

export const SEARCH_DEBOUNCE_MS = 400;
export const SEARCH_MIN_CHARS = 3;

export type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "results"; query: string; results: ResolvedPlace[] }
  | { status: "empty"; query: string }
  | { status: "error"; query: string };

export type SearchFn = (query: string, signal: AbortSignal) => Promise<ResolvedPlace[]>;

interface Timers {
  set: (fn: () => void, ms: number) => number;
  clear: (id: number) => void;
}

interface Options {
  search: SearchFn;
  onState: (state: SearchState) => void;
  debounceMs?: number;
  minLength?: number;
  timers?: Timers;
}

export interface SearchController {
  /** The text changed: wait for a pause, then search. */
  input: (text: string) => void;
  /** Enter was pressed: search now. */
  submit: (text: string) => void;
  /** Abort and return to idle (a place was chosen, or the field was cleared). */
  cancel: () => void;
  /** Abort and go quiet for good (the page is leaving). */
  dispose: () => void;
}

const BROWSER_TIMERS: Timers = {
  set: (fn, ms) => window.setTimeout(fn, ms),
  clear: (id) => {
    window.clearTimeout(id);
  },
};

export function createSearchController({
  search,
  onState,
  debounceMs = SEARCH_DEBOUNCE_MS,
  minLength = SEARCH_MIN_CHARS,
  timers = BROWSER_TIMERS,
}: Options): SearchController {
  let timer: number | null = null;
  let inflight: AbortController | null = null;
  let disposed = false;

  const emit = (state: SearchState): void => {
    if (!disposed) onState(state);
  };

  const stop = (): void => {
    if (timer !== null) timers.clear(timer);
    timer = null;
    inflight?.abort();
    inflight = null;
  };

  const run = (query: string): void => {
    stop();
    const controller = new AbortController();
    inflight = controller;
    emit({ status: "loading", query });
    search(query, controller.signal).then(
      (results) => {
        if (controller.signal.aborted) return;
        emit(results.length > 0 ? { status: "results", query, results } : { status: "empty", query });
      },
      () => {
        if (controller.signal.aborted) return;
        emit({ status: "error", query });
      },
    );
  };

  return {
    input(text) {
      if (disposed) return;
      stop();
      const query = text.trim();
      if (query.length < minLength) {
        emit({ status: "idle" });
        return;
      }
      timer = timers.set(() => {
        timer = null;
        run(query);
      }, debounceMs);
    },
    submit(text) {
      if (disposed) return;
      const query = text.trim();
      if (query === "") return;
      run(query);
    },
    cancel() {
      stop();
      emit({ status: "idle" });
    },
    dispose() {
      stop();
      disposed = true;
    },
  };
}
