# Decisões arquiteturais (ADRs)

Cada decisão tem contexto, decisão, alternativas e estado. **Aprovada** = o dono do produto aprovou; não reverter sem nova aprovação.

---

## ADR-001 — Manter a pilha atual
- **Estado:** aprovada (2026-11-25).
- **Contexto:** o app já usa Electron 45, React 18, TypeScript 7, Vite 8, zustand + immer e TipTap 2, com 43 testes de
  unidade, build e publicação funcionando.
- **Decisão:** manter. Reorganizar em camadas (Core, módulos), sem trocar framework por preferência.
- **Alternativas consideradas:** Tauri (menor, mas reescreveria o processo principal e as integrações de PDF/impressão);
  reescrever a interface em outro framework (sem ganho que pague o risco).

## ADR-002 — Numeração de versões: o Genesis começa na 1.0
- **Estado:** aprovada (2026-11-25).
- **Contexto:** o app publicado está na 0.17.0; o plano Genesis previa marcos 0.1 a 0.5 e 1.0. Voltar para 0.1 quebraria
  a ordem das versões e os links de download.
- **Decisão:** a ordem continua e o Genesis começa na **1.0**: Foundation **1.0**, Knowledge **1.1**, Life **1.2**,
  Create **1.3**, Connect **1.4**; o lançamento comercial (antes "Genesis 1.0") passa a ser o marco seguinte
  (provisoriamente **2.0**). Correções viram 1.0.1, 1.0.2…
- **Alternativas:** seguir 0.18, 0.19… até a 1.0 comercial (preterida pelo dono do produto).

## ADR-003 — Arquivos como fonte da verdade, índice reconstruível
- **Estado:** aprovada (2026-11-25).
- **Decisão:** cada documento continua sendo um arquivo legível na pasta do usuário. Um **registro de objetos** (índice)
  guarda id, tipo, módulo, título, datas, etiquetas, favorito, arquivado e caminho; ele pode ser apagado e reconstruído
  varrendo a pasta. Começa em JSON; SQLite só depois de uma verificação técnica (ex.: `node:sqlite` no Node do Electron)
  e quando a busca universal precisar.
- **Alternativas:** banco SQLite como fonte da verdade (arquivos deixariam de ser do usuário de forma legível; migração
  arriscada); IndexedDB na interface (preso ao navegador, fora da pasta do usuário).

## ADR-004 — Migração sem mover arquivos na 1.0
- **Estado:** aprovada (2026-11-25).
- **Decisão:** na 1.0 nenhum arquivo do usuário muda de lugar ou de formato. Os formatos `livro.json` e `plano.json`
  continuam iguais; o registro de objetos aponta para as pastas atuais. Antes da primeira abertura da 1.0, cópia de
  segurança completa de `Documentos/COGITO` (cópia, nunca mover), com verificação. Ver `MIGRATION.md`.

## ADR-005 — Testes de interface e linter no repositório
- **Estado:** aprovada (2026-11-25), com ajuste no linter (ADR-005b).
- **Decisão:** os roteiros de teste de interface (Playwright controlando o Electron) passam a viver em `tests/e2e` e a
  rodar no CI. Dependência de desenvolvimento: `playwright` (Apache-2.0), na mesma versão usada no ambiente de testes,
  só com `_electron` (não baixa navegadores).

## ADR-005b — Linter: oxlint no lugar do ESLint
- **Estado:** em vigor (2026-11-25); aprovada como "ESLint (MIT)", trocado por incompatibilidade técnica.
- **Contexto:** o TypeScript 7 do projeto é o compilador nativo, sem a API em JavaScript (`require('typescript')` não
  expõe `createSourceFile`). O `typescript-eslint`, necessário para o ESLint ler TypeScript, depende dessa API.
- **Decisão:** usar o **oxlint** (MIT, dependência só de desenvolvimento), que lê TypeScript/JSX sozinho e implementa as
  regras do ESLint, inclusive `react-hooks`, respeitando os comentários `eslint-disable` existentes.
- **Alternativas:** instalar um TypeScript 5 paralelo só para o ESLint (duas versões do compilador, frágil); Biome (MIT,
  também viável; o oxlint mantém os nomes e comentários de regra do ESLint já usados no código).

## ADR-006 — TipTap 2 → 3 antes de importar documentos de terceiros
- **Estado:** aprovada (2026-11-25), agendada para a 1.1 (Knowledge).
- **Contexto:** `npm audit` aponta aviso moderado no `@tiptap/core` ≤ 3.30.3 (`mergeAttributes` e `__proto__`). Pouco
  relevante enquanto só se editam documentos próprios; passa a importar com importação de DOCX/Markdown.
- **Decisão:** migrar para o TipTap 3 na 1.1, antes de qualquer importação de documentos de terceiros.

## ADR-007 — Somente Windows por enquanto
- **Estado:** aprovada (2026-11-25).
- **Decisão:** desenvolvimento, testes e publicação só para Windows. macOS e Linux ficam para depois (custos: Apple
  Developer Program, assinatura/notarização; empacotamento Linux). O código não deve impedir o porte.
- **Pendências registradas para o porte:** menu de aplicativo mínimo no macOS (hoje `Menu.setApplicationMenu(null)`
  desliga Cmd+C/V/Q); corretor ortográfico do sistema no Mac; build e testes em cada plataforma.

## ADR-008 — Custos futuros conhecidos
- **Estado:** aprovada (2026-11-25) como registro; nenhuma despesa autorizada.
- Nenhum custo na 1.0. Previstos a partir da 1.4: provedor de autenticação e banco, armazenamento em nuvem, IA por API,
  taxas de pagamento, certificado de assinatura de código Windows (para remover o aviso do SmartScreen) e, no porte, o
  Apple Developer Program. Valores a cotar na época; nenhuma contratação sem aprovação.

## ADR-009 — CHANGELOG continua na raiz
- **Estado:** aprovada (2026-11-25).
- **Decisão:** `CHANGELOG.md` fica na raiz (o fluxo de publicação e `scripts/release-notes.cjs` o leem). Não existe
  `docs/CHANGELOG.md`.

## ADR-010 — Enfeites sazonais opcionais
- **Estado:** aprovada (2026-11-25).
- **Decisão:** o tema de Natal vira um tema sazonal opcional, isolado do núcleo, desligado por padrão fora de época.

## ADR-011 — Shell nova no lugar da tela inicial atual
- **Estado:** aprovada (2026-11-25).
- **Decisão:** a tela inicial com abas Escritor / Planejador (o Bestiário saiu — ADR-015) dá lugar à shell do Genesis (barra superior com
  abas, barra lateral, painel direito, barra de status). O visual verde-limão/noir sai da interface principal e fica só
  no módulo RPG.

## ADR-013 — Cor de destaque da interface principal
- **Estado:** em vigor (2026-11-25), proposta na 1.0-b; aguarda confirmação do dono do produto.
- **Contexto:** com o verde-limão restrito ao RPG (ADR-011), a interface principal precisava de um destaque próprio.
- **Decisão:** destaque azul-lavanda sóbrio — `#8f98f5` no tema escuro e `#4a55c9` no claro —, usado só em seleção,
  foco e ação principal. Trocar é mudar os tokens `--accent*` em `src/design/tokens.css`.
- **Alternativas:** destaque monocromático (branco/preto, mais austero, menos legível em seleção e foco); manter o
  verde-limão (contraria o ADR-011).

## ADR-012 — Cadastro e provedor de autenticação: adiado
- **Estado:** pendente de decisão (prazo: antes da 1.4).
- **Decisão até lá:** nenhuma tela de login simulada. Na 1.0 entram só as interfaces locais `AccountService` e
  `Entitlements` (plano Free definido em configuração, sem rede).

## ADR-014 — COGITO generalista, com quatro pilares
- **Estado:** aprovada (2026-11-26), exceto o item marcado como proposta.
- **Contexto:** o plano Genesis listava oito módulos (Writer, Sheets, Studio, Canvas, Vault, Projects, Suas Finanças,
  RPG) e ainda dava ao RPG um lugar central. O dono do produto definiu o foco: uma ferramenta generalista.
- **Decisão:** quatro pilares — **Escrita** (`writer`), **Quadro e Memórias** (`board`: quadro negro no espírito do Miro
  e banco de memórias no espírito do Obsidian, na mesma base), **Finanças** (`finance`) e **Editor de imagens e criação**
  (`studio`, no espírito do Affinity). A ordem das versões continua: 1.1 Escrita + Quadro e Memórias, 1.2 Finanças,
  1.3 Editor de imagens.
- **Proposta (aguarda confirmação):** Planilhas (Sheets) e Projetos/tarefas saem das versões planejadas e ficam como
  ideias para depois dos quatro pilares.

## ADR-015 — Bestiário removido
- **Estado:** aprovada (2026-11-26).
- **Decisão:** o Bestiário (combate em turnos, IA das criaturas, intérprete de ações, fundos de mesa) sai do app na 1.0.
  Código removido: `src/hunt`, a aba da tela inicial, o pedido `hunt:pickBackground` e a rota `__huntbg` do processo
  principal, os botões "Enfrentar no Bestiário" e "Caçar com esta ficha", a parte de crítico e armadura do editor do
  sistema e o campo "No Bestiário" das cartas.
- **Dados preservados:** a pasta `Documentos/COGITO/Bestiario` fica no disco, intocada. Os campos que só o Bestiário
  usava (`system.combat.crit`, `system.combat.armor`, `card.hunt`, `sheet.ai`) continuam no `plano.json` e são
  mantidos pela normalização; nenhum arquivo muda de formato. As preferências do Bestiário (fundo, círculo de runas,
  escurecer) saem das preferências do app (eram só do `localStorage`).
- **Volta atrás:** o código está no histórico do git (até a 0.17.0).

## ADR-016 — RPG como extensão à parte
- **Estado:** proposta (2026-11-26), sugerida pelo dono do produto ("uma extensão à parte, que fica em uma loja de
  extensões"); detalhes aguardam confirmação.
- **Decisão proposta:**
  1. Na 1.0-d, o registro de módulos ganha um contrato de **extensão** (manifesto com id, nome, versão, permissões e o
     que a extensão oferece), carregada sob demanda e sem acesso direto a outros módulos — só pelo Core.
  2. O RPG (Planejador de campanhas, sistema de regras, fichas e cartas) é a primeira extensão. Enquanto não houver
     loja, vem junto com o instalador, **desligada** para quem não tem campanhas e **ligada** para quem já tem (ninguém
     perde acesso ao que criou). Liga e desliga nas Configurações.
  3. O quadro genérico vai para o pilar Quadro e Memórias; a extensão RPG passa a usá-lo em vez de ter o seu.
  4. A **loja de extensões** precisa de rede e entra com a camada Connect (1.4): pacotes assinados e verificados,
     instalação também a partir de um arquivo local (sem rede) e remoção que não apaga os dados do usuário.
- **Alternativas:** manter o RPG como módulo embutido (contraria o foco generalista); separar num app próprio (dois
  produtos para manter).
