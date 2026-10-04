import { useState } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { homePage, pages, type Locale } from "./content/pages.ts";
import { DocPage } from "./components/DocPage.tsx";
import { Search } from "./components/Search.tsx";
import { Footer, Header, Nav, SkipLink } from "./components/chrome.tsx";
import { useLocale } from "./i18n/index.ts";

function Shell({ locale, onLocale }: { locale: Locale; onLocale: (n: Locale) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = location.pathname;
  return (
    <div>
      <SkipLink locale={locale} />
      <Header locale={locale} onLocale={onLocale} onMenu={() => { setMenuOpen((v) => !v); }} />
      <div
        style={{
          display: "flex",
          gap: "2rem",
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "1.5rem 1rem",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: menuOpen ? "block" : "none",
            minWidth: "12rem",
          }}
          className="ddocs-nav"
        >
          <Search locale={locale} />
          <Nav locale={locale} current={current} />
        </div>
        <main id="ddocs-content" style={{ flex: 1, minWidth: 0 }} tabIndex={-1}>
          <Routes>
            {pages.map((page) => (
              <Route
                key={page.id}
                path={page.route}
                element={<DocPage locale={locale} page={page} />}
              />
            ))}
            <Route
              path="*"
              element={<DocPage locale={locale} page={homePage} />}
            />
          </Routes>
        </main>
      </div>
      <Footer locale={locale} />
    </div>
  );
}

function Root() {
  const [locale, setLocale] = useLocale();
  return <Shell locale={locale} onLocale={setLocale} />;
}

export default function App() {
  return (
    // No basename: the docs-hub prefix lives in the URL pathname via Vite's
    // `base`; the hash carries the route. A hash router with `basename`
    // looks for the prefix inside the hash and renders a blank page.
    <HashRouter>
      <Root />
    </HashRouter>
  );
}
