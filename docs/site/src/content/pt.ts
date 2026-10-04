import type { PageContent } from "./types.ts";

export const overviewPt: PageContent = {
  title: "Visão geral",
  summary:
    "starsky é um estúdio estático de pôsteres do céu noturno, só no navegador: o browser renderiza o pôster e exporta arquivos prontos para impressão, e uma pequena CLI em Python monta os dados do céu.",
  sections: [
    {
      heading: "O que é",
      paragraphs: [
        "starsky desenha o céu noturno de qualquer lugar e momento, no navegador. Escolha coordenadas ou um lugar, uma data e hora e opções de aparência, e o pôster renderiza ao vivo. Um link compartilhado carrega o céu inteiro no fragmento, então o mesmo link renderiza o mesmo pôster para todos.",
        "Não há servidor, banco de dados nem contas. O site são arquivos estáticos no Cloudflare R2; o único Python do produto monta os dados de estrelas que o navegador busca.",
      ],
    },
    {
      heading: "Como as peças se encaixam",
      paragraphs: [
        "A CLI baixa o catálogo Hipparcos e as linhas de constelação do Stellarium uma vez e exporta dois arquivos JSON. O site busca esses arquivos e faz a própria astronomia e busca de lugares, então a CLI nunca renderiza nem serve nada.",
      ],
      code: [
        {
          lang: "text",
          text: "Catálogo Hipparcos ─┐\n                   ├─ starsky (CLI) ──► catalog.json, constellations.json ──┐\nIAU Stellarium ────┘                                                      │\n                                                                          ▼\n                                       site/ (React + TS) ──► pôster PNG / SVG / PDF",
        },
      ],
    },
    {
      heading: "Duas superfícies",
      paragraphs: [
        "Landing monta um momento: coordenadas ou nome de lugar, data, hora, fuso e aparência. Viewer mostra um céu compartilhado via link #s=: o mapa, figuras de constelação, legenda, controles de vista, copiar link e a superfície de exportação. Uma superfície de construção e ajuste em #studio= está planejada, não construída.",
      ],
    },
  ],
};

export const installPt: PageContent = {
  title: "Instalação",
  summary:
    "Pré-requisitos e primeiros comandos: aquecer os caches de dados, exportar os dados do céu e rodar o site localmente.",
  sections: [
    {
      heading: "Pré-requisitos",
      paragraphs: [
        "Python 3.14 com uv e Bun 1.4.2 (ambos fixados em .tool-versions). Sem banco de dados, sem serviços, sem credenciais para rodar localmente.",
      ],
    },
    {
      heading: "Montar os dados do céu",
      paragraphs: [
        "Sincronize as dependências, aqueça os caches locais (baixa o catálogo Hipparcos e as linhas do Stellarium) e exporte o JSON que o site lê. O diretório de saída padrão é site/public/data.",
      ],
      code: [
        {
          lang: "bash",
          text: "uv sync --all-groups\nuv run python -m starsky cache warm\nuv run python -m starsky catalog",
        },
      ],
    },
    {
      heading: "Rodar o site",
      paragraphs: [
        "Instale as dependências do site e suba o servidor de desenvolvimento do Vite. Lint, typecheck, testes unitários e build de produção têm comando próprio.",
      ],
      code: [
        {
          lang: "bash",
          text: "cd site\nbun install\nbun run dev          # servidor de desenvolvimento do Vite\nbun run test         # bun:test\nbun run typecheck    # TypeScript 7 (tsgo)\nbun run lint\nbun run build",
        },
      ],
    },
    {
      heading: "Docker",
      paragraphs: [
        "A imagem é um trabalho de dados de execução única, não um serviço: escreve catalog.json e constellations.json num diretório montado e sai. Roda como UID/GID 65532.",
      ],
      code: [
        {
          lang: "bash",
          text: 'docker build -t starsky .\ndocker run --rm -v "$PWD/out:/out" starsky',
        },
      ],
    },
  ],
};

export const cliPt: PageContent = {
  title: "Referência da CLI",
  summary:
    "starsky catalog e starsky cache warm: flags, ambiente e comportamento. Gerado da saída real de --help; rode os comandos para confirmar.",
  sections: [
    {
      heading: "Comandos",
      paragraphs: [
        "python -m starsky sem argumentos imprime ajuda e não abre socket. A CLI só monta dados: nunca renderiza nem serve.",
      ],
      code: [
        {
          lang: "text",
          text: "Usage: python -m starsky [OPTIONS] [COMMAND] [ARGS]...\n\nCommands:\n  cache    Data-cache commands.\n  catalog  Export the star catalog + constellation lines as JSON for the site.",
        },
      ],
      table: {
        head: ["Comando", "O que faz"],
        rows: [
          ["cache warm", "Baixa o catálogo Hipparcos e as linhas de constelação para o cache local em parquet."],
          ["catalog", "Escreve catalog.json e constellations.json para o navegador."],
        ],
      },
    },
    {
      heading: "Flags de catalog",
      paragraphs: ["Ambas as flags têm padrão; a invocação simples mira o checkout do site."],
      table: {
        head: ["Flag", "Padrão", "Significado"],
        rows: [
          ["--mag-limit FLOAT", "6.5", "Estrela mais fraca incluída (magnitude Hipparcos)."],
          ["--output-dir PATH", "site/public/data", "Diretório onde os dois JSON são escritos (criado se faltar)."],
        ],
      },
    },
    {
      heading: "Ambiente",
      paragraphs: [
        "Configurações com prefixo STARSKY__ (veja .env.example). Variáveis STARPY__* do nome antigo do projeto não são mais lidas e não têm alias de compatibilidade.",
      ],
      table: {
        head: ["Chave", "Finalidade"],
        rows: [
          ["STARSKY__CATALOG__CACHE_DIR", "Onde vivem os caches em parquet do Hipparcos e do Stellarium."],
          ["STARSKY__LOG__LEVEL", "Nível de log da CLI."],
        ],
      },
    },
  ],
};

export const viewerPt: PageContent = {
  title: "Guia do Viewer",
  summary:
    "Abra um céu compartilhado, leia o mapa, ajuste a vista, guarde o pôster em PNG, SVG ou PDF e entenda cada estado de erro.",
  sections: [
    {
      heading: "Abra um céu compartilhado",
      paragraphs: [
        "Um link compartilhado termina em #s= seguido do payload. Abri-lo renderiza o céu exato: pôster, figuras de constelação e legenda. Nenhuma interação é necessária; o mapa é a página.",
        "Fragmento corrompido, payload ausente ou versão não suportada rendem cada um seu estado nomeado com um próximo passo, nunca uma página em branco.",
      ],
    },
    {
      heading: "Leia e ajuste a vista",
      paragraphs: [
        "Arraste para mover, role para zoom, use as setas com o mapa focado (+, -, 0 para reenquadrar). Os controles de vista sob o pôster fazem o mesmo por botão. Selecionar uma figura a ilumina e a anuncia para leitores de tela.",
      ],
    },
    {
      heading: "Guarde o pôster",
      paragraphs: [
        "Exportação oferece PNG, SVG e PDF verdadeiramente vetorial com a tipografia do pôster embutida. A conclusão é anunciada no lugar, junto ao botão que iniciou; o foco nunca se move. Uma exportação que falha nomeia o formato, tranquiliza que o mapa segue intacto e deixa todos os controles ativos.",
      ],
    },
    {
      heading: "Títulos que a tipografia não desenha",
      paragraphs: [
        "A fonte empacotada cobre acentos latinos e pontuação, mas não tem glifos de emoji ou CJK. Digitar tal caractere no formulário recusa nomeando o caractere. Abrir um link compartilhado que o contenha ainda renderiza: o caractere é deixado de fora e o ajuste é declarado, porque um link morto é pior que um título ajustado.",
      ],
    },
    {
      heading: "Quando o pôster é retido",
      paragraphs: [
        "Se a fonte do pôster não carregar, nenhum pôster é desenhado — uma tipografia substituta mudaria silenciosamente o artefato. Se os dados de estrelas faltarem, a página diz isso e aponta para starsky catalog. Ambos os estados mantêm o resto da página utilizável.",
      ],
    },
  ],
};

export const conceptsPt: PageContent = {
  title: "Conceitos",
  summary:
    "O vocabulário compartilhado: pôster, lugar, coordenadas, payload de compartilhamento, aparência e os arquivos de contrato que ligam a CLI ao navegador.",
  sections: [
    {
      heading: "Glossário",
      paragraphs: [
        "Estes termos são usados com exatidão em todo lugar — textos da interface, código e docs. A coluna Nunca lista palavras que não podem substituí-los.",
      ],
      table: {
        head: ["Termo", "Definição", "Nunca"],
        rows: [
          ["Poster", "A imagem do céu noturno renderizada mais o bloco de legenda (PNG raster, SVG/PDF vetorial).", "chart, plot"],
          ["Place", "Local em texto livre resolvido via Nominatim para coordenadas mais nomes.", "coordinates, search"],
          ["Coordinates", "Latitude validada [-90,90] / longitude [-180,180].", "lat/lon em prosa"],
          ["Viewer", "A superfície que renderiza um link #s=. O estado de repouso do produto.", "—"],
          ["Studio", "Superfície planejada de construção e ajuste em #studio=. Ainda não construída.", "—"],
          ["Landing", "A superfície de escolha: abrir um céu compartilhado ou mapear um momento.", "—"],
          ["SharePayload", "JSON plano versionado (v=1) de lat/lon/place/when/tz/options.", "payload, fragment"],
          ["Appearance", "O nome na interface para opções de render: projeção, fisheye, separação, magnitude, brilho, constelações, forma, título.", "render options"],
          ["Projection", "stereographic ou fisheye.", "mercator"],
          ["Shape", "circle ou square.", "round, box"],
          ["Figure", "Um desenho de constelação: estrelas, segmentos, nome.", "—"],
          ["Caption", "[Título] mais coordenadas — lugar · hora local com zona.", "—"],
        ],
      },
    },
    {
      heading: "O payload de compartilhamento",
      paragraphs: [
        "JSON canônico, zlib nível 9, base64 URL-safe sem padding, após #s=. Versão 1. Valores fora do intervalo são rejeitados em vez de ajustados, então um link nunca pode significar silenciosamente outra coisa. Campos desconhecidos são rejeitados em vez de renderizados.",
      ],
    },
    {
      heading: "O contrato de render",
      paragraphs: [
        "site/render-spec.json detém todos os tokens visuais — cores, dimensionamento de estrelas, brilho, linhas, rótulos, anel, layout da legenda e a seção de link compartilhado. O navegador é o único renderizador, então o arquivo é um contrato normativo para uma implementação, com teste de conformidade que falha em divergência.",
      ],
    },
  ],
};

export const architecturePt: PageContent = {
  title: "Arquitetura",
  summary:
    "Estático primeiro, sem servidor de runtime: um cliente React + TypeScript no R2, uma CLI de dados em Python e render-spec.json como contrato entre eles.",
  sections: [
    {
      heading: "Topologia",
      paragraphs: [
        "Um cliente estático servido do Cloudflare R2. Uma CLI em Python que roda em build e em CI para produzir os dados. Sem API, sem banco, sem processo servidor em lugar nenhum — então não há nada para autenticar, escalar ou manter acordado.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos + Stellarium ──► starsky catalog ──► catalog.json ──┐\n                                                        ├─► R2 ──► navegador\n                                      build do site ──► dist/ ────┘",
        },
      ],
    },
    {
      heading: "Decisões",
      paragraphs: ["Cinco registros de decisão de arquitetura em docs/product/adr/."],
      table: {
        head: ["ADR", "Decisão"],
        rows: [
          ["0001", "Estático primeiro, sem servidor de runtime."],
          ["0002", "Hospedagem só em R2; dados servidos mesma-origem."],
          ["0003", "render-spec.json é o contrato normativo de render."],
          ["0004", "Postura de resiliência e observabilidade estática."],
          ["0005", "Stack cliente TypeScript 7 + Bun + React."],
        ],
      },
    },
    {
      heading: "Fluxo de dados",
      paragraphs: [
        "Fontes Hipparcos e Stellarium baixam para caches locais em parquet (cache warm). catalog exporta o JSON do navegador com filtro de magnitude. O site busca o JSON mesma-origem, calcula alt/az sozinho, resolve lugares via Nominatim no navegador e renderiza tudo em canvas com exportações geradas no cliente.",
      ],
    },
  ],
};

export const deliveryPt: PageContent = {
  title: "Entrega",
  summary:
    "Pipelines, portões de fitness, ambientes e o runbook de rollback. Parcialmente implementado: os portões seguram, mas o deploy no R2 está bloqueado num escopo de token.",
  sections: [
    {
      heading: "Pipelines",
      paragraphs: ["Todo push roda os portões rápidos; main roda ainda a matriz de navegadores e publica."],
      table: {
        head: ["Workflow", "O que faz"],
        rows: [
          ["ci.yml", "Python: ruff, ty, pytest, checagem no-server, cache warm + catalog real afirmando forma e contagens."],
          ["site_ci.yml", "Site: lint, typecheck, acordo i18n, testes unitários/componente/referência, build, orçamentos brotli, varredura de segredos."],
          ["site_e2e.yml", "Jornadas Playwright em Chromium e Firefox, incluindo exportação offline e integridade da fonte."],
          ["site_r2.yml", "Reconstrói dados + site, verifica e faz deploy no R2 em main."],
          ["security.yml", "Revisão de dependências, Trivy, CodeQL."],
          ["release.yml", "Tags, SBOM + atestação, GitHub Release."],
        ],
      },
    },
    {
      heading: "Portões de fitness",
      paragraphs: [
        "Bundle ≤ 500 KB e dados ≤ 400 KB brotli (fontes excluídas por desenho); nada parecido com segredo em dist/; nenhuma importação servidora em src/; chaves de catálogo e visão concordam nas duas direções; conformidade de render-spec e suíte de imagens de referência seguem verdes.",
      ],
    },
    {
      heading: "Rollback",
      paragraphs: [
        "Rode site_r2.yml de novo no último commit bom. Assets com hash de conteúdo mantêm os nomes, e index.html sobe por último, então a entrada anterior segue servindo até um deploy bom substituí-la. Prefixos versionados de assets/dados com ponteiro de manifesto estão planejados; até lá não há ponteiro para virar e nenhum drill cronometrado rodou.",
      ],
    },
    {
      heading: "Lacuna conhecida",
      paragraphs: [
        "Parcial — o caminho de deploy não está verificado em produção: falta ao token do R2 o escopo ListObjects, então o job de deploy falha em acesso negado enquanto todo portão de verificação passa. O bucket segue servindo o build anterior. Corrija o escopo do token e rode o workflow de novo.",
      ],
    },
  ],
};

export const roadmapPt: PageContent = {
  title: "Roteiro",
  summary:
    "O que está construído, o que vem a seguir e o que foi aposentado de propósito. Itens planejados são rotulados e nunca misturados às páginas de como-fazer.",
  sections: [
    {
      heading: "Status",
      paragraphs: ["Por specs/README.md. Implementado significa que o caminho de código existe e roda; Verificado significa suítes e2e passando em CI — nada está Verificado ainda."],
      table: {
        head: ["Funcionalidade", "Status", "Nota"],
        rows: [
          ["design-system", "Implementado", "Tokens, classes atlas, guardas i18n."],
          ["catalog-cli + data-cache", "Implementado", "starsky catalog e cache warm entregues."],
          ["viewer", "Implementado", "Landing, viewer #s=, codec de share, busca de lugar."],
          ["renderer-export", "Implementado", "Render do pôster e exportação PNG/SVG/PDF com fonte embutida."],
          ["site-delivery", "Parcial", "Deploy, orçamentos e portões ligados; prefixos versionados, smoke e drills em aberto."],
          ["Studio (#studio=)", "Planejado — ainda não implementado.", "Superfície de construção e ajuste; share recodifica para #s=."],
          ["Locale pt-BR do produto", "Planejado — ainda não implementado.", "Entrega como fatia própria após o catálogo existir."],
          ["App Gradio / renderer Python / HF Space", "Aposentado.", "Removidos por BCR-0001/0003/0005; não voltam."],
        ],
      },
    },
  ],
};
