/**
 * UI chrome copy. Documentation *content* lives in `content/`; these are the
 * frame strings only. Both locales implement the same keys — a missing
 * translation is a type error.
 */
export const uiEn = {
  "nav.home": "Docs",
  "nav.skip": "Skip to content",
  "nav.menu": "Menu",
  "nav.close": "Close menu",
  "nav.sections": "Sections",
  "search.label": "Search docs",
  "search.placeholder": "Search pages…",
  "search.none": "No pages match.",
  "lang.label": "Language",
  "lang.en": "English",
  "lang.pt": "Português (Brasil)",
  "maturity.Implemented": "Implemented",
  "maturity.Partial": "Partially implemented",
  "maturity.Planned": "Planned — not implemented yet",
  "maturity.N/A": "Not applicable",
  "footer.version": "starsky docs v{version}",
  "footer.source": "source",
  "footer.product": "open the product",
  "footer.llms": "llms.txt",
  "breadcrumb.home": "Docs",
} as const;

export const uiPt: Record<UiKey, string> = {
  "nav.home": "Docs",
  "nav.skip": "Pular para o conteúdo",
  "nav.menu": "Menu",
  "nav.close": "Fechar menu",
  "nav.sections": "Seções",
  "search.label": "Buscar nos docs",
  "search.placeholder": "Buscar páginas…",
  "search.none": "Nenhuma página confere.",
  "lang.label": "Idioma",
  "lang.en": "English",
  "lang.pt": "Português (Brasil)",
  "maturity.Implemented": "Implementado",
  "maturity.Partial": "Parcialmente implementado",
  "maturity.Planned": "Planejado — ainda não implementado",
  "maturity.N/A": "Não aplicável",
  "footer.version": "docs starsky v{version}",
  "footer.source": "código-fonte",
  "footer.product": "abrir o produto",
  "footer.llms": "llms.txt",
  "breadcrumb.home": "Docs",
};

export type UiKey = keyof typeof uiEn;
