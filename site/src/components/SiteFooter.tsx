/**
 * The site footer (000-design-system T021).
 *
 * The version has exactly one home, printed as the one link `starsky@v<version>`
 * to the source (FR-011). The Viewer and the Studio put their actions on the
 * right. The version is injected from
 * `site/package.json` via `__APP_VERSION__` (vision D18) — the package was
 * renamed `starsky-site` → `starsky` so the name printed here and the package
 * name are the same string.
 *
 * Attribution is legal text (Hipparcos public domain, Stellarium CC
 * BY-SA4.0, Nominatim © OpenStreetMap contributors): the notices and names are
 * never translated or abbreviated; only the labels around them are.
 *
 * The interface language switcher lives here (018-pt-br), on every page with a
 * footer: a native select, so it is a 44 px target that every assistive
 * technology already knows. Each language is named in itself, and switching
 * re-renders the page in place. On screen it is a globe, as wide as the page's
 * icon actions: the endonyms are in its list, its name is the label, and the
 * one-row footer has no room for the longest endonym beside the credits.
 */
import type { ReactNode } from "react";
import { LANGUAGE_NAME_KEYS, LOCALES, isLocale, setLocale, t } from "../i18n/index.ts";
import { useLocale } from "../i18n/useLocale.ts";
import { Icon } from "./icons.tsx";

const SOURCE_URL = "https://github.com/lucasvmigotto/starsky";

interface Props {
  /** The page's actions (FR-011): icon buttons shown on the right. */
  children?: ReactNode;
}

const LANGUAGE_SELECT_ID = "site-language";

function LanguageSwitcher(): React.JSX.Element {
  const locale = useLocale();
  return (
    <div className="atlas-footer-lang">
      <label className="sr-only" htmlFor={LANGUAGE_SELECT_ID}>
        {t("site.language.label")}
      </label>
      <Icon name="language" />
      <select
        id={LANGUAGE_SELECT_ID}
        className="atlas-footer-select"
        title={t("site.language.label")}
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (isLocale(next)) setLocale(next);
        }}
      >
        {LOCALES.map((option) => (
          <option key={option} value={option} lang={option}>
            {t(LANGUAGE_NAME_KEYS[option])}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SiteFooter({ children }: Props): React.JSX.Element {
  return (
    <footer className="atlas-footer">
      <div className="atlas-footer-main">
        <div className="atlas-footer-info">
          <p className="atlas-footer-meta">{t("footer.attribution")}</p>
        </div>
        <div className="atlas-footer-end">
          {children !== undefined && <div className="atlas-footer-actions">{children}</div>}
          <LanguageSwitcher />
          <p className="atlas-footer-meta atlas-footer-version">
            {t("footer.tagline")}
            {" · "}
            <a className="atlas-link" href={SOURCE_URL} rel="noreferrer">
              {t("footer.version", { version: __APP_VERSION__ })}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
