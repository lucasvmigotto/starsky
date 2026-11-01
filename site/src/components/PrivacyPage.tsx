/**
 * The privacy notice, on its own page (`#privacy`) so it no longer takes a line
 * of the landing. It says only what the code does: no accounts, analytics or
 * cookies; the sky lives in the link's fragment; OpenStreetMap sees the IP when
 * the landing searches or loads tiles; two small browser-storage entries.
 */
import { Fragment } from "react";
import type { JSX, ReactNode } from "react";
import { t } from "../i18n/index.ts";
import SiteFooter from "./SiteFooter.tsx";
import SiteHeader from "./SiteHeader.tsx";

export const PRIVACY_HASH = "#privacy";
export const OSM_PRIVACY_POLICY = "https://osmfoundation.org/wiki/Privacy_Policy";

/** Fill `{name}` slots in a translated template with elements, keeping the words around them. */
function interleave(template: string, slots: Readonly<Record<string, ReactNode>>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    const slot = name === undefined ? undefined : slots[name];
    return <Fragment key={i}>{slot ?? part}</Fragment>;
  });
}

export default function PrivacyPage(): JSX.Element {
  return (
    <div className="atlas-page privacy-page">
      <SiteHeader />
      <main className="atlas-main">
        <article className="atlas-panel privacy-card">
          <h1 className="font-display text-3xl leading-tight">{t("site.privacy.title")}</h1>
          <p>{t("site.privacy.browser")}</p>
          <p>{t("site.privacy.links")}</p>
          <p>
            {interleave(t("site.privacy.osm"), {
              osm: <a href="https://www.openstreetmap.org/">{t("site.privacy.osm.name")}</a>,
              policy: <a href={OSM_PRIVACY_POLICY}>{t("site.privacy.osm.policy")}</a>,
            })}
          </p>
          <p>{t("site.privacy.device")}</p>
          <p>{t("site.privacy.host")}</p>
          <p>
            <a className="atlas-link" href="#/">
              {t("site.privacy.back")}
            </a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
