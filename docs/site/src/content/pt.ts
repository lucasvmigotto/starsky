import type { PageContent } from "./types.ts";

export const overviewPt: PageContent = {
  title: "Visão geral",
  summary:
    "starsky é um estúdio estático de pôsteres do céu noturno, só no navegador: o browser renderiza o pôster e exporta arquivos prontos para impressão, e uma pequena CLI em Python monta os dados do céu.",
  sections: [
    {
      heading: "O que é",
      paragraphs: [
        "starsky desenha o céu noturno de qualquer lugar e momento, no navegador. Busque um lugar ou digite coordenadas, escolha data e hora e abra o céu no Explorador: arraste para olhar em volta, aproxime, alterne camadas, selecione uma estrela ou uma constelação. Quando o céu estiver certo, faça um pôster dele no Estúdio de pôster e exporte em PNG, SVG ou PDF. Um link compartilhado carrega o céu inteiro no fragmento, então o mesmo link renderiza o mesmo pôster para todos.",
        "Não há servidor, banco de dados nem contas. O site são arquivos estáticos no Cloudflare R2; o único Python do produto monta os dados de estrelas que o navegador busca.",
      ],
    },
    {
      heading: "Como as peças se encaixam",
      paragraphs: [
        "A CLI baixa o catálogo Hipparcos, as linhas de constelação do Stellarium e os nomes das estrelas uma vez e exporta três arquivos JSON. O site busca esses arquivos e faz a própria astronomia e busca de lugares, então a CLI nunca renderiza nem serve nada.",
      ],
      code: [
        {
          lang: "text",
          text: "Catálogo Hipparcos ─┐\n                   ├─ starsky (CLI) ──► catalog.json, constellations.json, names.json ──┐\nIAU Stellarium ────┘                                                               │\n                                                                                   ▼\n                                          site/ (React + TS) ──► Explorador, pôster PNG / SVG / PDF",
        },
      ],
    },
    {
      heading: "Quatro superfícies",
      paragraphs: [
        "O fluxo é página inicial, depois Explorador, depois exportação. A página inicial faz uma pergunta, de onde você quer explorar o céu, e sua única ação, Explorar este céu, abre o Explorador. O Explorador (#e=) é a superfície principal. O Estúdio de pôster (#studio=) compõe e exporta um pôster. A página do pôster (#s=) mostra um pôster compartilhado exatamente como foi feito. Cada uma tem sua própria página nesta documentação.",
        "Privacidade: o starsky não guarda nada e não tem contas. Os links carregam o conteúdo no fragmento da URL, que o navegador nunca envia ao servidor. A exceção a conhecer é o OpenStreetMap: a busca de lugares (Nominatim) e os blocos do mapa da página inicial são pedidos pelo seu navegador, então o OpenStreetMap vê o seu endereço IP.",
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
        "A imagem é um trabalho de dados de execução única, não um serviço: escreve catalog.json, constellations.json e names.json num diretório montado e sai. Roda como UID/GID 65532.",
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
          ["cache warm", "Baixa o catálogo Hipparcos, as linhas de constelação e os nomes de estrelas para o cache local em parquet."],
          ["catalog", "Escreve catalog.json, constellations.json e names.json para o navegador."],
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
          ["--output-dir PATH", "site/public/data", "Diretório onde os três JSON são escritos (criado se faltar)."],
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
  title: "Página do pôster",
  summary:
    "Abra um pôster compartilhado, compartilhe, exporte em PNG, SVG ou PDF, entre no céu por trás dele e entenda cada estado de erro.",
  sections: [
    {
      heading: "Abra um pôster compartilhado",
      paragraphs: [
        "Um link compartilhado termina em #s= seguido do conteúdo. Abri-lo renderiza o pôster exato: a imagem e o seu título, nada mais. Não há mapa para mover nem formulário pela frente; o pôster é a página. O id de rota desta página continua viewer, para que links existentes sigam funcionando.",
        "Fragmento corrompido, conteúdo ausente ou versão não suportada rendem cada um seu estado nomeado com um próximo passo, nunca uma página em branco.",
      ],
    },
    {
      heading: "O que dá para fazer nela",
      paragraphs: [
        "Quatro ações: compartilhar (copiar o link), exportar, Explorar este céu e Faça o seu. Explorar este céu abre o Explorador no lugar e momento do pôster; o link #s= em si nunca é reescrito. Faça o seu abre o Estúdio de pôster partindo do pôster compartilhado.",
      ],
    },
    {
      heading: "Guarde o pôster",
      paragraphs: [
        "A exportação oferece PNG, SVG e PDF verdadeiramente vetorial com a tipografia do pôster embutida, no layout padrão ou no layout de story 9:16 (1080 × 1920). A conclusão é anunciada no lugar, junto ao botão que iniciou; o foco nunca se move. Uma exportação que falha nomeia o formato e deixa todos os controles ativos.",
      ],
    },
    {
      heading: "Títulos que a tipografia não desenha",
      paragraphs: [
        "A fonte empacotada cobre acentos latinos e pontuação, mas não tem glifos de emoji ou CJK. Digitar tal caractere num formulário recusa nomeando o caractere. Abrir um link compartilhado que o contenha ainda renderiza: o caractere é deixado de fora e o ajuste é declarado, porque um link morto é pior que um título ajustado.",
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
    "O vocabulário compartilhado: pôster, lugar, coordenadas, cena, os quatro fragmentos de link, aparência e os arquivos de contrato que ligam a CLI ao navegador.",
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
          ["Place", "Local escolhido por busca (Nominatim), resolvido para coordenadas e um nome. Um pino solto ou coordenadas digitadas deixam o lugar vazio.", "coordinates, search"],
          ["Coordinates", "Latitude validada [-90,90] / longitude [-180,180]; rejeitadas, nunca ajustadas, em links compartilhados.", "lat/lon em prosa"],
          ["Landing", "A porta de entrada: de onde você quer explorar o céu? Sua única ação, Explorar este céu, abre o Explorador. Espelhada em #c=.", "—"],
          ["Explorer", "A superfície principal: um céu navegável para um lugar e momento, em #e=.", "app de planetário"],
          ["Studio", "O Estúdio de pôster em #studio=: componha o pôster e depois exporte ou copie um link #s=. Distinto da página do pôster, para que um rascunho nunca sobrescreva o artefato canônico.", "—"],
          ["Viewer", "A página do pôster: renderiza um link #s= como a imagem e o seu título. Na interface chama-se página do pôster.", "—"],
          ["Scene", "O lugar, o momento e o título compartilhados entre o Explorador e o pôster. Composição e câmera não fazem parte dela.", "—"],
          ["Camera", "Uma rotação câmera-para-mundo em quaternion mais um campo de visão de 5–120° (padrão 100), no referencial equatorial.", "—"],
          ["Figure", "Um desenho de constelação: estrelas, segmentos, nome. Uma estrela pertence a uma constelação só pelas linhas da sua figura.", "—"],
          ["Abaixo do horizonte", "Altitude igual ou menor que 0. Esses objetos nunca são apresentados como observáveis.", "—"],
          ["SharePayload", "JSON plano versionado (v=1) de lat/lon/place/when/tz/options, levado por #s= e #studio=.", "payload, fragment"],
          ["Appearance", "O nome na interface das opções de render: projeção, olho de peixe, separação, magnitude, brilho, constelações, formato, título.", "render options"],
          ["Projection", "stereographic ou fisheye.", "mercator"],
          ["Shape", "circle ou square. Um pôster quadrado preenche o quadrado, inscrito no horizonte.", "round, box"],
          ["Magnitude limite", "A estrela mais fraca desenhada.", "—"],
          ["Formato story", "O layout de exportação 1080 × 1920 (9:16), escolhido na hora de exportar e nunca guardado em um link.", "—"],
          ["Caption", "[Título] mais coordenadas — lugar · hora local com fuso.", "—"],
        ],
      },
    },
    {
      heading: "Os quatro fragmentos de link",
      paragraphs: [
        "Todo estado compartilhável é um fragmento de URL versionado: #c= (formulário inicial), #e= (Explorador), #studio= (rascunho do Estúdio) e #s= (o pôster). Veja Página inicial e links para o que cada um guarda. Todos usam a mesma codificação: JSON canônico, zlib nível 9, base64 seguro para URL sem preenchimento. Valores fora de faixa num link de pôster são rejeitados em vez de ajustados, então um link nunca passa a significar outra coisa em silêncio.",
      ],
    },
    {
      heading: "O contrato de render",
      paragraphs: [
        "site/render-spec.json é dono de todo token visual — cores, tamanho de estrelas, brilho, linhas, rótulos, anel, layout da legenda e a seção do link de compartilhamento. O navegador é o único renderizador, então o arquivo é um contrato normativo para uma única implementação, com um teste de conformidade que falha diante de desvio.",
      ],
    },
  ],
};

export const architecturePt: PageContent = {
  title: "Arquitetura",
  summary:
    "Estático primeiro, sem servidor de runtime: um cliente React + TypeScript no R2, uma CLI de dados em Python e render-spec.json como contrato entre eles. O OpenStreetMap é a única dependência externa e o maior risco.",
  sections: [
    {
      heading: "Topologia",
      paragraphs: [
        "Um cliente estático servido do Cloudflare R2. Uma CLI em Python que roda em build e em CI para produzir os dados. Sem API, sem banco, sem processo servidor em lugar nenhum — então não há nada para autenticar, escalar ou manter acordado.",
      ],
      code: [
        {
          lang: "text",
          text: "Hipparcos + Stellarium ──► starsky catalog ──► catalog / constellations / names .json ──┐\n                                                                                    ├─► R2 ──► navegador\n                                                           build do site ──► dist/ ────┘",
        },
      ],
    },
    {
      heading: "Decisões",
      paragraphs: ["Oito registros de decisão de arquitetura em docs/product/adr/."],
      table: {
        head: ["ADR", "Decisão"],
        rows: [
          ["0001", "Estático primeiro, sem servidor de runtime."],
          ["0002", "Hospedagem só em R2; dados servidos mesma-origem."],
          ["0003", "render-spec.json é o contrato normativo de render."],
          ["0004", "Postura de resiliência e observabilidade estática."],
          ["0005", "Stack cliente TypeScript 7 + Bun + React."],
          ["0006", "Contrato da câmera do Explorador: um quaternion no referencial equatorial."],
          ["0007", "O Explorador renderiza em Canvas 2D; WebGL só se os limites forem atingidos."],
          ["0008", "Blocos do OpenStreetMap para o mapa de localização, sob demanda."],
        ],
      },
    },
    {
      heading: "Fluxo de dados",
      paragraphs: [
        "Fontes Hipparcos e Stellarium baixam para caches locais em parquet (cache warm). catalog exporta o JSON do navegador com filtro de magnitude. O site busca o JSON mesma-origem, calcula alt/az sozinho e renderiza o céu em canvas, com exportações geradas no cliente. A busca de lugares vai ao Nominatim a partir do navegador.",
        "O código do cliente é organizado por contexto em site/src/lib: sky (vetores, observador, câmera, cena), explorer, landing, scene (a tradução do Explorador para o pôster), studio e render.",
      ],
    },
    {
      heading: "OpenStreetMap: o maior risco",
      paragraphs: [
        "O risco que o dono põe em primeiro lugar é ser bloqueado pelo OpenStreetMap. Dois serviços dele são usados, ambos a partir do navegador do visitante: o Nominatim para buscar lugares e o servidor de blocos para o mapa da página inicial. Nenhum dos dois usa credencial.",
        "Mitigações: a busca só roda com Enter, com o botão de busca ou ao sair do campo, nunca enquanto se digita; os resultados ficam em cache na sessão e as requisições têm pelo menos um segundo de intervalo; os blocos do mapa são carregados só para a vista visível, com o Referer mantido e a atribuição sempre visível; os testes automatizados nunca tocam nenhum dos hosts e falham com qualquer requisição sem stub. As coordenadas sempre funcionam sem nenhum dos serviços.",
        "O mapa existe só na página inicial. O Explorador, o Estúdio e a página do pôster não fazem nenhuma requisição ao OpenStreetMap. Em caso de bloqueio, o plano B é um geocodificador com chave ou blocos hospedados por nós.",
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
          ["site_e2e.yml", "Jornadas Playwright em Chromium e Firefox, incluindo exportação offline, integridade da fonte e uma guarda de rede que falha com qualquer requisição ao OpenStreetMap sem stub."],
          ["site_docs.yml", "Verifica esta documentação e a publica no bucket de docs sob /starsky/."],
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
    "O que está construído, o que vem a seguir e o que foi aposentado de propósito. Itens planejados são rotulados e nunca misturados com as páginas de como-fazer.",
  sections: [
    {
      heading: "Situação",
      paragraphs: ["Conforme specs/README.md. Implementado significa que o caminho de código existe e roda na branch dev; Verificado significa que as suítes e2e passam no CI — nada está Verificado ainda. A promoção de dev para main está pendente, então o site em produção ainda pode servir um build anterior."],
      table: {
        head: ["Funcionalidade", "Situação", "Nota"],
        rows: [
          ["design-system", "Implementado", "Tokens, classes atlas, guardas de i18n."],
          ["catalog-cli + data-cache", "Implementado", "starsky catalog e cache warm estão entregues."],
          ["viewer (006), renderer-export (007)", "Implementado", "A página do pôster #s=, codec de compartilhamento, exportação PNG/SVG/PDF com fonte embutida."],
          ["sky-domain (009)", "Implementado", "Câmera, observador, cena, #e=, nomes de estrelas."],
          ["explorer-canvas, explorer-ui (010, 011)", "Implementado", "Explorador em Canvas 2D, inspetor, busca, camadas, barra de ferramentas."],
          ["poster-studio (012)", "Implementado", "O Estúdio em #studio=, exportação story."],
          ["explorer-polish, visual-identity (014, 015)", "Implementado", "Recolhimento por inatividade, lista por horizonte, dicas, fonte de interface empacotada, página do pôster só com imagem."],
          ["location-first (013)", "Implementado", "Página inicial com mapa, link #c=."],
          ["square-fill (016)", "Implementado", "O pôster quadrado preenche o quadrado."],
          ["site-delivery (008)", "Parcial", "Deploy, orçamentos e portões ligados; prefixos versionados, smoke test e simulações em aberto."],
          ["hardening (017)", "Parcial", "Em andamento: passes de acessibilidade, falhas, desempenho e estabilidade, indexação estrita, docs."],
          ["Promoção de dev para main", "Planejado — ainda não implementado.", "Aguardando o aval do dono."],
          ["Prefixos versionados no R2, manifesto, simulação de rollback", "Planejado — ainda não implementado.", "008 T003, T018, T021."],
          ["Locale pt-BR do produto", "Planejado — ainda não implementado.", "Entrega como fatia própria após o catálogo existir."],
          ["Renderizador WebGL", "Planejado — ainda não implementado.", "Depois, e só se os limites do Canvas 2D forem atingidos (ADR-0007)."],
          ["App Gradio / renderizador Python / HF Space", "Aposentado.", "Removidos por BCR-0001/0003/0005; não voltam."],
        ],
      },
    },
  ],
};


export const explorerPt: PageContent = {
  title: "Explorador",
  summary:
    "A superfície principal: um céu navegável para o seu lugar e momento. Olhe em volta, aproxime, alterne camadas, inspecione estrelas e constelações e depois faça um pôster.",
  sections: [
    {
      heading: "Abra o Explorador",
      paragraphs: [
        "Aperte Explorar este céu na página inicial ou abra um link #e=. O céu ocupa a janela, desenhado em Canvas 2D para o lugar e momento que você escolheu. O mesmo link sempre mostra o mesmo céu e a mesma vista.",
        "Objetos abaixo do horizonte nunca são apresentados como observáveis: ficam ocultos ou esmaecidos, e o céu diz isso.",
      ],
    },
    {
      heading: "Olhe em volta",
      paragraphs: [
        "Arraste para olhar em volta, role ou faça pinça para aproximar, dê duplo clique para centralizar num ponto. Com o céu em foco, as setas giram a vista, mais e menos aproximam, 0 volta ao início e Esc limpa a seleção. O campo de visão vai de 5° a 120°. Reenquadrar desliza de volta à vista inicial e termina exatamente nela.",
      ],
    },
    {
      heading: "Camadas, busca e lista",
      paragraphs: [
        "A barra de ferramentas liga e desliga as linhas de constelação, os rótulos, o horizonte, os pontos cardeais e a grade, e define se os objetos abaixo do horizonte ficam ocultos ou esmaecidos. A busca encontra estrelas e constelações pelo nome.",
        "A lista de constelações é agrupada pelo horizonte: o que está no alto agora vem antes do que está abaixo. Uma estrela pertence a uma constelação só pelas linhas da sua figura. Selecionar uma figura, na lista ou no céu, a ilumina.",
      ],
    },
    {
      heading: "Estrelas, dicas e o inspetor",
      paragraphs: [
        "Pousar o cursor numa estrela por cerca de um segundo e meio mostra uma dica. Selecionar uma estrela ou uma constelação abre o inspetor: um painel à direita com uma aba em telas grandes, uma folha inferior em celulares. Uma linha-resumo do lugar e do momento fica sempre visível; ela se expande durante a atividade.",
      ],
    },
    {
      heading: "Controles que saem da frente",
      paragraphs: [
        "Os controles se recolhem após quatro segundos de inatividade, a menos que algo os mantenha abertos: um popover, o foco, o ponteiro, um pino ou um arraste. Eles começam recolhidos ao carregar, para que o céu seja a primeira coisa que você vê.",
      ],
    },
    {
      heading: "Em seguida: um pôster",
      paragraphs: [
        "Criar pôster na barra de ferramentas abre o Estúdio de pôster com o mesmo lugar, momento e título. Voltar ao Explorador no Estúdio retorna à câmera que você deixou, se a aba ainda se lembrar dela. Essa memória vive só no armazenamento de sessão desta aba e nunca aparece em um link.",
      ],
    },
  ],
};

export const linksPt: PageContent = {
  title: "Página inicial e links",
  summary:
    "O formulário da página inicial, os quatro fragmentos de link (#c=, #e=, #studio=, #s=), o que cada um guarda e com que rigor cada um é lido.",
  sections: [
    {
      heading: "A página inicial",
      paragraphs: [
        "A página inicial faz uma pergunta: de onde você quer explorar o céu? Busque um lugar ou troque para coordenadas. Um mapa do OpenStreetMap sempre visível mostra o lugar e aceita um clique ou um pino arrastado. Acrescente um título opcional, data, hora e fuso, e defina a magnitude limite em Avançado. A única ação, Explorar este céu, abre o Explorador.",
        "A busca de lugares roda com Enter, com o botão de busca ou ao sair do campo com texto novo. Nunca roda enquanto você digita: a política do Nominatim, do OpenStreetMap, proíbe autocompletar. Os resultados ficam em cache na sessão e as requisições têm pelo menos um segundo de intervalo. Se a busca ou o mapa falharem, a mensagem aparece no próprio lugar e as coordenadas continuam funcionando.",
      ],
    },
    {
      heading: "Privacidade",
      paragraphs: [
        "O starsky não guarda nada e não tem contas. Um link leva o conteúdo no fragmento da URL, que o navegador nunca envia ao servidor. A busca de lugares (Nominatim) e o mapa da página inicial (blocos do OpenStreetMap) rodam a partir do seu navegador, então o OpenStreetMap vê o seu endereço IP; a página inicial avisa isso em uma linha. O starsky não tem credenciais de nenhum dos dois serviços.",
      ],
    },
    {
      heading: "Os quatro fragmentos",
      paragraphs: [
        "Todo fragmento leva v: 1 e usa a mesma codificação: JSON canônico, zlib nível 9, base64 seguro para URL sem preenchimento. Nenhum pode passar de 4096 caracteres.",
      ],
      table: {
        head: ["Fragmento", "Guarda", "Abre", "Regra de leitura"],
        rows: [
          ["#c=", "Um formulário inicial preenchido: lugar, coordenadas, data e hora local, fuso, título, magnitude limite.", "A página inicial", "Tolerante por campo"],
          ["#e=", "Uma cena (lugar, momento, título, magnitude limite) mais uma vista durável: câmera, campo de visão, camadas, seleção.", "O Explorador", "Estrito, no conteúdo todo"],
          ["#studio=", "Um pôster em composição: o mesmo conteúdo de #s=.", "O Estúdio de pôster", "Estrito"],
          ["#s=", "O pôster pronto: coordenadas, momento, fuso, opções de aparência.", "A página do pôster", "Estrito, com migração de versão"],
        ],
      },
    },
    {
      heading: "Regras de tolerância",
      paragraphs: [
        "O #c= é indulgente de propósito. Um campo que falha na regra do próprio formulário é descartado e o resto ainda preenche. Um link que não dá para ler, ou de outra versão, resulta em formulário em branco e um aviso curto. Ele nunca dispara uma busca e nunca cria entrada no histórico; a página o reescreve no lugar conforme você edita, então a barra de endereço é sempre o link para compartilhar.",
        "#e=, #studio= e #s= são estritos. Um valor fora de faixa é rejeitado, nunca ajustado. No #e= a câmera precisa ser uma rotação válida, o campo de visão fica entre 5° e 120° e a seleção precisa nomear uma estrela (HIP) ou uma constelação (CON). Uma versão desconhecida nunca é adivinhada: é informada como não suportada.",
        "Um link #e= nunca leva estado de ponteiro, de passar o cursor, de animação ou de painel.",
      ],
    },
    {
      heading: "Por que o #s= é separado e estável",
      paragraphs: [
        "O #s= é o artefato canônico: o céu que alguém lhe enviou. O Estúdio usa um fragmento próprio para que um rascunho ajustado nunca o substitua. Copiar o link no Estúdio gera um link #s=, não um #studio=, então o que você compartilha é o pôster pronto, não uma sessão de edição.",
        "O #s= permanece compatível byte a byte com todo link emitido desde a versão 1. O layout de exportação (padrão ou story) nunca é guardado em nenhum link.",
      ],
    },
  ],
};

export const studioPt: PageContent = {
  title: "Estúdio de pôster",
  summary:
    "Componha o pôster com pré-visualização ao vivo e exporte em PNG, SVG ou PDF no layout padrão ou story, ou copie um link do pôster pronto.",
  sections: [
    {
      heading: "Abra o Estúdio",
      paragraphs: [
        "Escolha Criar pôster no Explorador, ou Faça o seu numa página de pôster. O Estúdio abre em #studio= com o mesmo lugar, momento, fuso e título. Abrir a partir de uma página de pôster parte desse pôster. Mudar o lugar ou o momento é feito na página inicial; o Estúdio avisa isso e leva até lá.",
      ],
    },
    {
      heading: "Aparência",
      paragraphs: [
        "A pré-visualização acompanha as mudanças após uma breve pausa, e o fragmento acompanha a pré-visualização. Os controles são projeção (estereográfica ou olho de peixe), formato (quadrado ou círculo), intensidade do olho de peixe, separação mínima entre estrelas, brilho e o título.",
        "Um título que a tipografia do pôster não desenha é recusado no Estúdio. Um que chega por um link perde os caracteres que não dá para desenhar, e o Estúdio avisa.",
      ],
    },
    {
      heading: "O quadrado preenche o quadrado",
      paragraphs: [
        "Um pôster quadrado é só céu: a vista é ampliada para que o quadrado fique inscrito no horizonte, com os cantos sobre o horizonte, e recortada no quadrado. O círculo mantém o disco inteiro do horizonte com seu anel.",
      ],
    },
    {
      heading: "Exportação",
      paragraphs: [
        "A exportação oferece PNG, SVG e PDF verdadeiramente vetorial com a tipografia do pôster embutida. Escolha o layout na hora de exportar: padrão, ou story, um layout 9:16 de 1080 × 1920 para celulares. O layout nunca faz parte de um link. Os arquivos mantêm a faixa da legenda e a conclusão é anunciada junto ao botão que a iniciou.",
      ],
    },
    {
      heading: "Compartilhar e voltar",
      paragraphs: [
        "Copiar link gera um link #s= do pôster pronto. Voltar ao Explorador reabre a mesma cena na câmera que você deixou, ou na vista inicial se esta aba não se lembrar mais dela. A pré-visualização é estática; aproximar e explorar acontecem no Explorador.",
      ],
    },
    {
      heading: "Se o pôster for retido",
      paragraphs: [
        "Como na página do pôster, a falta da fonte do pôster ou dos dados de estrelas impede o desenho do pôster em vez de substituir qualquer coisa, e a página diz o motivo.",
      ],
    },
  ],
};
