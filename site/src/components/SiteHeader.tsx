/**
 * The one header: the site name, linking to the start. Every surface (Explorer,
 * Studio, Viewer) renders this and nothing else in its place (015, FR-007).
 */
import type { JSX } from "react";
import { t } from "../i18n/index.ts";

export default function SiteHeader(): JSX.Element {
  return (
    <header className="atlas-header">
      <a className="atlas-site-name" href="#/">
        {t("site.name")}
      </a>
    </header>
  );
}
