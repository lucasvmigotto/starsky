import { useState } from "react";
import { Link } from "react-router-dom";
import { contentOf, pages, type Locale } from "../content/pages.ts";
import { t } from "../i18n/index.ts";

export function Search({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const hits =
    needle === ""
      ? []
      : pages.filter((page) => {
          const content = contentOf(page, locale);
          const haystack = [
            content.title,
            content.summary,
            ...content.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
          ]
            .join("\n")
            .toLowerCase();
          return haystack.includes(needle);
        });
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        htmlFor="ddocs-search"
        style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}
      >
        {t(locale, "search.label")}
      </label>
      <input
        id="ddocs-search"
        type="search"
        value={query}
        placeholder={t(locale, "search.placeholder")}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--color-dsurface)",
          color: "var(--color-dtext)",
          border: "1px solid var(--color-dborder)",
          borderRadius: "2px",
          padding: "0.6rem 0.75rem",
          minHeight: "44px",
          fontSize: "1rem",
        }}
      />
      {needle !== "" && (
        <div role="status" style={{ marginTop: "0.5rem" }}>
          {hits.length === 0 ? (
            <p style={{ color: "var(--color-dmuted)" }}>{t(locale, "search.none")}</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {hits.map((page) => (
                <li key={page.id} style={{ marginBottom: "0.25rem" }}>
                  <Link to={page.route}>{contentOf(page, locale).title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
