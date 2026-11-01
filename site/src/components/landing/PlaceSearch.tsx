/**
 * Place search as an ARIA combobox with a listbox: arrow keys move, Enter
 * chooses (or searches at once when no list is open), Escape closes the list.
 * Counts and failures go to one polite status region. The map is never needed:
 * this field and the coordinates are the keyboard route to a place.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { JSX, KeyboardEvent } from "react";
import { t } from "../../i18n/index.ts";
import { type ResolvedPlace, searchPlaces } from "../../lib/geocode.ts";
import {
  type SearchController,
  type SearchFn,
  type SearchState,
  createSearchController,
} from "../../lib/landing/search.ts";

interface Props {
  /** The text the field shows when the page changes the place (a pin clears it). */
  fieldText: string;
  onChoose: (place: ResolvedPlace) => void;
  search?: SearchFn;
  debounceMs?: number;
}

const defaultSearch: SearchFn = (query, signal) => searchPlaces(query, { signal });

function statusOf(state: SearchState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "loading":
      return t("landing.search.searching");
    case "results":
      return state.results.length === 1
        ? t("landing.search.resultsOne")
        : t("landing.search.results", { count: state.results.length });
    case "empty":
      return t("landing.search.empty", { query: state.query });
    case "error":
      return t("landing.search.error");
  }
}

export default function PlaceSearch({
  fieldText,
  onChoose,
  search = defaultSearch,
  debounceMs,
}: Props): JSX.Element {
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (index: number): string => `${base}-opt-${String(index)}`;
  const [text, setText] = useState(fieldText);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const controller = useRef<SearchController | null>(null);
  const latestSearch = useRef(search);
  latestSearch.current = search;

  useEffect(() => {
    setText(fieldText);
  }, [fieldText]);

  useEffect(() => {
    const created = createSearchController({
      search: (query, signal) => latestSearch.current(query, signal),
      onState: (next) => {
        setState(next);
        setDismissed(false);
        setActive(0);
      },
      ...(debounceMs === undefined ? {} : { debounceMs }),
    });
    controller.current = created;
    return () => {
      created.dispose();
      controller.current = null;
    };
  }, [debounceMs]);

  const results = state.status === "results" ? state.results : [];
  const open = results.length > 0 && !dismissed;
  const current = Math.min(active, Math.max(0, results.length - 1));

  const choose = (place: ResolvedPlace): void => {
    controller.current?.cancel();
    setText(place.short);
    onChoose(place);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (results.length === 0) break;
        event.preventDefault();
        if (dismissed) {
          setDismissed(false);
          break;
        }
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current + step + results.length) % results.length);
        break;
      }
      case "Enter": {
        event.preventDefault();
        const place = open ? (results[current] as ResolvedPlace | undefined) : undefined;
        if (place) choose(place);
        else controller.current?.submit(text);
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setDismissed(true);
        }
        break;
      default:
    }
  };

  return (
    <div className="atlas-form-field landing-search">
      <label htmlFor={`${base}-input`}>{t("landing.search.label")}</label>
      <div className="landing-search-box">
        <input
          id={`${base}-input`}
          type="text"
          role="combobox"
          className="atlas-form-input"
          placeholder={t("landing.search.placeholder")}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            controller.current?.input(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setDismissed(true);
          }}
        />
        <ul id={listId} role="listbox" aria-label={t("landing.search.listLabel")} className="landing-results" hidden={!open}>
          {open &&
            results.map((place, index) => (
              <li
                key={`${String(place.lat)},${String(place.lon)},${place.short}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === current}
                className="landing-result"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  choose(place);
                }}
              >
                {place.short}
              </li>
            ))}
        </ul>
      </div>
      <p role="status" aria-live="polite" className="atlas-form-hint landing-search-status">
        {statusOf(state)}
      </p>
    </div>
  );
}
