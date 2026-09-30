/**
 * The site footer (000-design-system T021).
 *
 * Extracted from `ViewerPage` so the Landing can carry it too, and so the
 * version has exactly one home. The version is injected from
 * `site/package.json` via `__APP_VERSION__` (vision D18) — the package was
 * renamed `starsky-site` → `starsky` so the name printed here and the package
 * name are the same string.
 *
 * Attribution is legal text (Hipparcos/JPL public domain, Stellarium CC
 * BY-SA4.0, Nominatim © OpenStreetMap contributors) and is deliberately **not**
 * translated or abbreviated.
 */
import { t } from "../i18n/index.ts";

const SOURCE_URL = "https://github.com/lucasvmigotto/starsky";

export default function SiteFooter(): React.JSX.Element {
  return (
    <footer className="atlas-footer">
      <p className="atlas-footer-meta">
        {t("footer.version", { version: __APP_VERSION__ })}{" "}
        <a className="atlas-link" href={SOURCE_URL} rel="noreferrer">
          {t("footer.source")}
        </a>
      </p>
      <p className="atlas-footer-meta">{t("footer.attribution")}</p>
    </footer>
  );
}