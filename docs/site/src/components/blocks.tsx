import { Link } from "react-router-dom";
import type { Locale } from "../content/pages.ts";
import type { Maturity } from "../content/types.ts";
import { t } from "../i18n/index.ts";

export function StatusBadge({
  locale,
  maturity,
}: {
  locale: Locale;
  maturity: Maturity;
}) {
  const colors: Record<Maturity, { fg: string; bg: string }> = {
    Implemented: { fg: "var(--color-daccent-ink)", bg: "var(--color-daccent)" },
    Partial: { fg: "var(--color-dbg)", bg: "#e0b45c" },
    Planned: { fg: "var(--color-dtext)", bg: "var(--color-draised)" },
    "N/A": { fg: "var(--color-dmuted)", bg: "transparent" },
  };
  const style = colors[maturity];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        color: style.fg,
        background: style.bg,
        border: "1px solid var(--color-dborder)",
      }}
    >
      {t(locale, `maturity.${maturity}`)}
    </span>
  );
}

export function Callout({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <aside
      style={{
        borderLeft: `3px solid ${tone === "warn" ? "#e0b45c" : "var(--color-daccent)"}`,
        background: "var(--color-dsurface)",
        padding: "0.75rem 1rem",
        borderRadius: "0 4px 4px 0",
        margin: "1rem 0",
      }}
    >
      {children}
    </aside>
  );
}

export function CodeBlock({ lang, text }: { lang: string; text: string }) {
  return (
    <div style={{ position: "relative", margin: "1rem 0" }}>
      <pre
        tabIndex={0}
        aria-label={`Code sample${lang !== "" ? ` in ${lang}` : ""}. Scroll horizontally to read it all.`}
        style={{
          background: "var(--color-dsurface)",
          border: "1px solid var(--color-dborder)",
          borderRadius: "4px",
          padding: "1rem",
          overflowX: "auto",
          fontSize: "0.85rem",
          tabSize: 2,
        }}
      >
        <code data-lang={lang}>{text}</code>
      </pre>
      <button
        type="button"
        aria-label="Copy code"
        onClick={() => {
          void navigator.clipboard.writeText(text).catch(() => undefined);
        }}
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          background: "var(--color-draised)",
          color: "var(--color-dtext)",
          border: "1px solid var(--color-dborder)",
          borderRadius: "2px",
          padding: "0.3rem 0.6rem",
          minHeight: "44px",
        }}
      >
        {"⧉"}
      </button>
    </div>
  );
}

export function DocTable({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  return (
    <div style={{ overflowX: "auto", margin: "1rem 0" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "0.9rem",
        }}
      >
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderBottom: "2px solid var(--color-dborder)",
                  color: "var(--color-daccent)",
                }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderBottom: "1px solid var(--color-dborder)",
                    verticalAlign: "top",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Breadcrumbs({ locale, title }: { locale: Locale; title: string }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
      <Link to="/" style={{ color: "var(--color-dmuted)" }}>
        {t(locale, "breadcrumb.home")}
      </Link>
      <span aria-hidden="true" style={{ margin: "0 0.5rem", color: "var(--color-dfaint)" }}>
        {"/"}
      </span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
