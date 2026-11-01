/**
 * Place search as an ARIA combobox with a listbox: arrow keys move, Enter
 * chooses (or searches when no list is open), Escape closes the list. A
 * search button sits at the end of the field. Typing never searches (Nominatim
 * forbids client-side auto-complete, issue #65): only Enter, the button or leaving the field with new text do.
 * Counts and failures go to one polite status region. The map is never needed:
 * this field and the coordinates are the keyboard route to a place.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { JSX, KeyboardEvent } from "react";
import { Icon } from "../icons.tsx";
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
}: Props): JSX.Element {
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (index: number): string => `${base}-opt-${String(index)}`;
  const [text, setText] = useState(fieldText);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const controller = useRef<SearchController | null>(null);
  /** The last text submitted or chosen: leaving the field with it again searches nothing. */
  const settled = useRef(fieldText.trim().toLowerCase());
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const latestSearch = useRef(search);
  latestSearch.current = search;

  useEffect(() => {
    setText(fieldText);
    settled.current = fieldText.trim().toLowerCase();
  }, [fieldText]);

  useEffect(() => {
    const created = createSearchController({
      search: (query, signal) => latestSearch.current(query, signal),
      onState: (next) => {
        setState(next);
        setDismissed(false);
        setActive(0);
      },
    });
    controller.current = created;
    return () => {
      created.dispose();
      controller.current = null;
    };
  }, []);

  const results = state.status === "results" ? state.results : [];
  const open = results.length > 0 && !dismissed;
  const current = Math.min(active, Math.max(0, results.length - 1));

  const submit = (): void => {
    const query = text.trim();
    if (query === "") return;
    settled.current = query.toLowerCase();
    controller.current?.submit(query);
  };

  const choose = (place: ResolvedPlace): void => {
    controller.current?.cancel();
    settled.current = place.short.trim().toLowerCase();
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
        else submit();
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
            controller.current?.input();
          }}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            setDismissed(true);
            const to = event.relatedTarget;
            const toSearchUi = to instanceof Node && (to === buttonRef.current || listRef.current?.contains(to));
            if (!toSearchUi && text.trim().toLowerCase() !== settled.current) submit();
          }}
        />
        <button
          type="button"
          className="atlas-btn-icon landing-search-submit"
          aria-label={t("landing.search.submit")}
          title={t("landing.search.submit")}
          ref={buttonRef}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={submit}
        >
          <Icon name="search" />
        </button>
        <ul ref={listRef} id={listId} role="listbox" aria-label={t("landing.search.listLabel")} className="landing-results" hidden={!open}>
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
