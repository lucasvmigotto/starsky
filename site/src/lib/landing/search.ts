/**
 * Place search for the landing, on explicit submit only. Pure of React: the
 * controller owns the wait timer, the request in flight and the cache, and
 * reports state to a callback, so the rules are testable with a stubbed search,
 * a fake clock and fake timers.
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * auto-complete search "must not" be implemented on the client side with the
 * API, at most 1 request per second, and repeated queries should be cached.
 * So typing never sends anything (it only aborts and goes idle), a request
 * starts only on Enter or the search button, starts are at least
 * SEARCH_MIN_INTERVAL_MS apart, and answers are cached for the page session
 * (issue #65).
 */
import type { ResolvedPlace } from "../geocode.ts";

/** The policy's "maximum of 1 request per second": gap between request starts. */
export const SEARCH_MIN_INTERVAL_MS = 1000;

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
  timers?: Timers;
  /** Milliseconds, monotonic enough for spacing requests. */
  now?: () => number;
}

export interface SearchController {
  /** The text changed: abort anything pending and go idle. Never sends a request. */
  input: () => void;
  /** Enter or the search button: answer from the cache, else search (after the rate wait). */
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
  timers = BROWSER_TIMERS,
  now = () => performance.now(),
}: Options): SearchController {
  let timer: number | null = null;
  let inflight: AbortController | null = null;
  let lastStart = Number.NEGATIVE_INFINITY;
  let disposed = false;
  const cache = new Map<string, ResolvedPlace[]>();

  const emit = (state: SearchState): void => {
    if (!disposed) onState(state);
  };

  const report = (query: string, results: ResolvedPlace[]): void => {
    emit(results.length > 0 ? { status: "results", query, results } : { status: "empty", query });
  };

  const stop = (): void => {
    if (timer !== null) timers.clear(timer);
    timer = null;
    inflight?.abort();
    inflight = null;
  };

  const run = (query: string, key: string): void => {
    const controller = new AbortController();
    inflight = controller;
    lastStart = now();
    search(query, controller.signal).then(
      (results) => {
        if (controller.signal.aborted) return;
        cache.set(key, results);
        report(query, results);
      },
      () => {
        if (controller.signal.aborted) return;
        emit({ status: "error", query });
      },
    );
  };

  return {
    input() {
      if (disposed) return;
      stop();
      emit({ status: "idle" });
    },
    submit(text) {
      if (disposed) return;
      const query = text.trim();
      if (query === "") return;
      stop();
      const key = query.toLowerCase();
      const cached = cache.get(key);
      if (cached) {
        report(query, cached);
        return;
      }
      emit({ status: "loading", query });
      const wait = lastStart + SEARCH_MIN_INTERVAL_MS - now();
      if (wait > 0) {
        timer = timers.set(() => {
          timer = null;
          run(query, key);
        }, wait);
      } else {
        run(query, key);
      }
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
