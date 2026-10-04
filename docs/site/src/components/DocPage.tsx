import { contentOf, slug, type Locale, type Page } from "../content/pages.ts";
import { Breadcrumbs, Callout, CodeBlock, DocTable, StatusBadge } from "./blocks.tsx";

export function DocPage({ locale, page }: { locale: Locale; page: Page }) {
  const content = contentOf(page, locale);
  return (
    <article>
      <Breadcrumbs locale={locale} title={content.title} />
      <h1
        style={{
          fontFamily: "var(--font-doc-display)",
          fontSize: "2rem",
          margin: "0 0 0.5rem",
        }}
      >
        {content.title}
      </h1>
      <p>
        <StatusBadge locale={locale} maturity={page.maturity} />
      </p>
      {page.maturityNote !== "" && (
        <Callout tone={page.maturity === "Implemented" ? "info" : "warn"}>
          <p style={{ margin: 0 }}>{page.maturityNote}</p>
        </Callout>
      )}
      <p style={{ color: "var(--color-dmuted)", fontSize: "1.05rem" }}>
        {content.summary}
      </p>
      {content.sections.map((section) => (
        <section key={section.heading} style={{ marginTop: "2rem" }}>
          <h2
            style={{
              fontFamily: "var(--font-doc-display)",
              fontSize: "1.4rem",
              borderBottom: "1px solid var(--color-dborder)",
              paddingBottom: "0.4rem",
            }}
          >
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} style={{ lineHeight: 1.6 }}>
              {paragraph}
            </p>
          ))}
          {section.table && (
            <DocTable head={section.table.head} rows={section.table.rows} />
          )}
          {section.code?.map((sample, i) => (
            <CodeBlock key={i} lang={sample.lang} text={sample.text} />
          ))}
        </section>
      ))}
      <p style={{ marginTop: "2rem", fontSize: "0.85rem" }}>
        <a href={`./docs/${locale}/${slug(page)}.md`} type="text/markdown" rel="alternate">
          {locale === "pt" ? "Ler como Markdown" : "Read as Markdown"}
        </a>
        {" · "}
        <a href="./llms.txt">llms.txt</a>
      </p>
    </article>
  );
}
