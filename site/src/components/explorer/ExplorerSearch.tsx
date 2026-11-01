/**
 * Search over constellations and stars, as a combobox with a listbox: arrow
 * keys move, Enter chooses, Escape closes. The result count, or "No matches.",
 * goes to a polite status region.
 */
import { useId, useState } from "react";
import type { JSX, KeyboardEvent, RefObject } from "react";
import { t } from "../../i18n/index.ts";
import { type SearchResult, searchObjects } from "../../lib/explorer/search.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";
import { formatMagnitude } from "./format.ts";

interface Props {
  scene: SkyScene;
  magLimit: number;
  onChoose: (id: string) => void;
  onClose: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

function detailOf(result: SearchResult): string {
  if (result.kind === "constellation") return `${t("explorer.kind.constellation")} · ${result.abbr}`;
  const detail = t("explorer.search.starDetail", { hip: result.hip, mag: formatMagnitude(result.mag) });
  return `${t("explorer.kind.star")} · ${detail}`;
}

function statusOf(query: string, count: number): string {
  if (query.trim() === "") return "";
  if (count === 0) return t("explorer.search.none");
  return count === 1 ? t("explorer.search.countOne") : t("explorer.search.countMany", { count });
}

export default function ExplorerSearch({ scene, magLimit, onChoose, onClose, inputRef }: Props): JSX.Element {
  const base = useId();
  const listId = `${base}-list`;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = searchObjects(scene, query, { magLimit });
  const current = Math.min(active, Math.max(0, results.length - 1));
  const optionId = (index: number): string => `${base}-opt-${String(index)}`;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (results.length > 0) setActive((current + 1) % results.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (results.length > 0) setActive((current - 1 + results.length) % results.length);
        break;
      case "Enter": {
        const result = results[current];
        if (result) {
          event.preventDefault();
          onChoose(result.id);
        }
        break;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
      default:
    }
  };

  return (
    <div className="explorer-search">
      <div className="explorer-search-row">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          className="atlas-form-input explorer-search-input"
          aria-label={t("explorer.search.input")}
          placeholder={t("explorer.search.placeholder")}
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length > 0 ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="atlas-btn-ghost" onClick={onClose}>
          {t("explorer.search.close")}
        </button>
      </div>
      <ul id={listId} role="listbox" aria-label={t("explorer.search.results")} className="explorer-results" hidden={results.length === 0}>
        {results.map((result, index) => (
          <li
            key={result.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === current}
            data-id={result.id}
            className="explorer-result"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              onChoose(result.id);
            }}
          >
            <span>{result.label}</span>
            <span className="explorer-result-detail">{detailOf(result)}</span>
          </li>
        ))}
      </ul>
      <p role="status" className="explorer-search-status">
        {statusOf(query, results.length)}
      </p>
    </div>
  );
}
