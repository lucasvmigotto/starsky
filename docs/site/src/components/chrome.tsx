import { Link } from "react-router-dom";
import { contentOf, pages, type Locale, type Page } from "../content/pages.ts";
import { t } from "../i18n/index.ts";
import { publicHref } from "../lib/paths.ts";

export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a href="#ddocs-content" className="ddocs-skip-link">
      {t(locale, "nav.skip")}
    </a>
  );
}

export function Header({
  locale,
  onLocale,
  onMenu,
}: {
  locale: Locale;
  onLocale: (next: Locale) => void;
  onMenu: () => void;
}) {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--color-dborder)",
        background: "var(--color-dsurface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "0.75rem 1rem",
        }}
      >
        <button
          type="button"
          onClick={onMenu}
          aria-label={t(locale, "nav.menu")}
          style={{
            background: "none",
            border: "1px solid var(--color-dborder)",
            color: "var(--color-dtext)",
            borderRadius: "2px",
            padding: "0.4rem 0.7rem",
            minHeight: "44px",
          }}
        >
          {"\u2630"}
        </button>
        <Link
          to="/"
          style={{
            color: "var(--color-dtext)",
            textDecoration: "none",
            fontFamily: "var(--font-doc-display)",
            fontSize: "1.25rem",
          }}
        >
          {t(locale, "nav.home")} · starsky
        </Link>
        <span style={{ flex: 1 }} />
        <label className="ddocs-sr-only" htmlFor="ddocs-lang">
          {t(locale, "lang.label")}
        </label>
        <select
          id="ddocs-lang"
          value={locale}
          onChange={(event) => {
            onLocale(event.target.value as Locale);
          }}
          style={{
            background: "var(--color-draised)",
            color: "var(--color-dtext)",
            border: "1px solid var(--color-dborder)",
            borderRadius: "2px",
            padding: "0.4rem",
            minHeight: "44px",
          }}
        >
          <option value="en">{t(locale, "lang.en")}</option>
          <option value="pt">{t(locale, "lang.pt")}</option>
        </select>
      </div>
    </header>
  );
}

export function Nav({ locale, current }: { locale: Locale; current: string }) {
  return (
    <nav aria-label={t(locale, "nav.sections")}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {pages.map((page: Page) => (
          <li key={page.id} style={{ marginBottom: "0.25rem" }}>
            <Link
              to={page.route}
              aria-current={page.route === current ? "page" : undefined}
              style={{
                display: "block",
                padding: "0.6rem 0.75rem",
                borderRadius: "2px",
                minHeight: "44px",
                color:
                  page.route === current
                    ? "var(--color-daccent-ink)"
                    : "var(--color-dtext)",
                background:
                  page.route === current
                    ? "var(--color-daccent)"
                    : "transparent",
                textDecoration: "none",
                fontWeight: page.route === current ? 600 : 400,
              }}
            >
              {contentOf(page, locale).title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-dborder)",
        marginTop: "3rem",
        padding: "1.5rem 1rem",
        color: "var(--color-dmuted)",
        fontSize: "0.9rem",
      }}
    >
      <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
        <p style={{ margin: "0 0 0.5rem" }}>
          {t(locale, "footer.version", { version: __DOCS_VERSION__ })}
          {" · "}
          <a href="https://github.com/lucasvmigotto/starsky">
            {t(locale, "footer.source")}
          </a>
          {" · "}
          <a href="https://starsky.lucasvmigotto.me/">
            {t(locale, "footer.product")}
          </a>
          {" · "}
          <a href={publicHref("llms.txt")}>{t(locale, "footer.llms")}</a>
        </p>
      </div>
    </footer>
  );
}
