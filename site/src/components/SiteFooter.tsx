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
 * Attribution is legal text (Hipparcos/JPL public domain, Stellarium CC
 * BY-SA4.0, Nominatim © OpenStreetMap contributors) and is deliberately **not**
 * translated or abbreviated.
 */
import type { ReactNode } from "react";
import { t } from "../i18n/index.ts";

const SOURCE_URL = "https://github.com/lucasvmigotto/starsky";

interface Props {
  /** The page's actions (FR-011): icon buttons shown on the right. */
  children?: ReactNode;
}

export default function SiteFooter({ children }: Props): React.JSX.Element {
  return (
    <footer className="atlas-footer">
      <div className="atlas-footer-main">
        <div className="atlas-footer-info">
          <p className="atlas-footer-meta">
            <a className="atlas-link" href={SOURCE_URL} rel="noreferrer">
              {t("footer.version", { version: __APP_VERSION__ })}
            </a>
          </p>
          <p className="atlas-footer-meta">{t("footer.attribution")}</p>
        </div>
        {children !== undefined && <div className="atlas-footer-actions">{children}</div>}
      </div>
    </footer>
  );
}
