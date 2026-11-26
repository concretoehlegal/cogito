# 📰 Novidades do COGITO

Todas as mudanças de cada versão. A mais nova fica no topo.
Para baixar, use a página de [Releases](../../releases).

## [1.0.0] — em desenvolvimento · Foundation (projeto Genesis)

Primeira etapa da transformação do COGITO numa ferramenta geral, com quatro pilares: **Escrita**, **Quadro e
Memórias**, **Finanças** e **Editor de imagens**. O COGITO deixa de ser um app de RPG. Ainda não publicada.

### Removido
- **Bestiário**: o combate em turnos saiu do app, junto com os botões "Enfrentar no Bestiário" e "Caçar com esta
  ficha", o campo "No Bestiário" das cartas e as opções de crítico e armadura do editor do sistema (a aba Combate
  virou **Rolagens**). Nada se perde: a pasta `Bestiario` continua em `Documentos\COGITO` e as fichas guardam todos os
  valores. O Planejador de campanhas continua e vai virar uma extensão à parte.

### Visual
- **Design System**: cores, raios, tipografia e espaçamento vêm de um conjunto único de tokens, nos temas claro e escuro.
- A interface principal (início, Escritor, Configurações) ganhou um destaque azul-lavanda sóbrio; o verde-limão
  continua no Planejador.
- Botões com fundo liso e cantos menos arredondados; barra lateral do início sem degradês.
- **Enfeites de Natal** com três modos: **na época** (de 15 de novembro a 6 de janeiro, o padrão), **sempre** ou
  **desligados**. Quem tinha desligado continua com eles desligados.

### Desenvolvimento
- Documentação permanente do projeto: visão do produto, arquitetura, roadmap, decisões, modelo de dados, migração,
  design system, módulos, segurança, monetização e backlog (`CLAUDE.md` e `docs/`).
- Testes de interface (Playwright controlando o Electron) agora no repositório: 11 roteiros cobrindo Escritor,
  Planejador, sistema de regras e enfeites (`npm run test:e2e`), e um job próprio no CI.
- Linter (oxlint) sem nenhum aviso, também no CI; código sem uso removido.
- O teste de interface de fechar o app ficou estável: espera o campo do nome ganhar o foco antes de digitar.

## [0.17.0] — 2026-11-18 · Qualquer sistema

### Sistema de regras por campanha
- Cada campanha tem o **seu sistema de regras**, e tudo nele é editável: o nome, a sigla e o ícone de cada número,
  barra e texto da ficha; quem tem cada campo (personagem, NPC, criatura); se aparece na carta; o valor inicial (com
  um valor próprio para criaturas); as listas (Atributos, Perícias, Características, Salvamentos…) e os itens de cada
  uma, com ícone; os nomes dos tipos de ficha e de carta; e como o Bestiário resolve os ataques.
- **Modelos prontos** para começar: **COGITO**, **D&D 5ª edição**, **Call of Cthulhu 7ª edição**, **Ordem
  Paranormal**, **Daggerheart**, **Pathfinder 2ª edição** e **Em branco**. Escolha ao criar a campanha ou troque
  depois em **Editar sistema** (no painel da campanha ou de qualquer ficha). Dá para **copiar o sistema de outra
  campanha**.
- Trocar de sistema **não apaga nada**: valores já preenchidos continuam guardados, campos novos recebem o valor
  inicial e listas de mesmo nome levam os valores dos itens iguais.
- Em cada ficha, os itens das listas têm **nome, valor e ícone próprios**, e dá para somar ou tirar itens.
- Campanhas antigas abrem no sistema COGITO, com tudo no lugar.

### Bestiário em qualquer sistema
- Cada número tem uma **função**: Vida, Defesa (o alvo do ataque), Recurso (o que as cartas gastam: “2 PE”, “1 PM”),
  Armadura (desconta do dano), Ações por turno ou Movimento.
- **Três formas de acertar**: rolagem contra a defesa (D&D, Pathfinder, Ordem Paranormal, Daggerheart), **porcentagem**
  com 1d100 até a chance (Call of Cthulhu) ou acerto automático.
- **Críticos** à escolha: resultado máximo do dado, superar a defesa por 10 (Pathfinder), dados iguais (Daggerheart) ou
  extremo, até 1/5 da chance (Call of Cthulhu). A IA das criaturas calcula as chances com a mesma regra.
- A HUD, a carta, o registro e a tela de escolha usam os nomes e as siglas do sistema; cada lista da ficha vira uma
  seção do painel.

## [0.16.0] — 2026-11-18 · Edição “Pesadelos Antes do Natal” 🎄

### Natal
- **Luzinhas de Natal** no alto da janela e no cartão lateral da tela inicial, com **pisca-pisca clássico**: como os
  controladores de luz de Natal, o programa passa sozinho por **sequência** (uma luz corre pelo fio), **alternado**,
  **todas piscam**, **ondas**, **acende e apaga devagar**, **cintilante**, **combinação** e **acesas**, e recomeça.
  Em ⚙ dá para trocar por **Suave** (cintilar devagar) ou **Sempre acesas**.
- **Gorro de Papai Noel** no logo do COGITO, inclusive no ícone do aplicativo.
- Os enfeites podem ser desligados em ⚙ Configurações → **Enfeites de Natal**.

### Escritor
- **Ferramenta Mover** (botão "Mover" na barra ou `Ctrl+M`): arraste imagens e formas para **qualquer lugar da página**,
  por cima do texto, como no Photoshop. Segure **Shift** para encaixar nas **guias** (bordas e centro da página, margens
  e os outros elementos soltos); `Esc` sai da ferramenta. O botão **Livre** devolve o elemento ao texto.
- A posição livre vai igual para o **PDF** e para o **DOCX** (no Word, como imagem flutuante).
- **Contador de páginas** no centro, embaixo da página: "3 / 12". Em ⚙ escolha o formato: só o número, contador
  (padrão) ou por extenso ("Página 3 de 12"). Vale também no PDF e no DOCX.
- `Ctrl+Home` e `Ctrl+End` levam ao começo e ao fim do texto mesmo com uma forma ou imagem selecionada.

### Planejador de Campanhas
- **Setas e linhas estilo Miro**: puxe uma ligação de **qualquer um dos 4 lados** da ficha. Escolha o formato (**reta**,
  **curva** ou **cotovelo**), o traço (**sólido**, **tracejado** ou **pontilhado**), a **ponta** de cada lado (nenhuma,
  seta, triângulo, círculo, losango ou barra), a espessura e os lados de saída e chegada. Há **8 estilos prontos**
  (Linha, Seta, Curva, Fluxo, Mão dupla, Pista, Segredo, Rompido) e o último estilo usado vale para as próximas.
- **Ferramenta Texto** (`T`): clique no quadro e escreva um texto solto, sem caixa.
- **Ferramenta Caixa de texto** (`B`): clique e escreva dentro de uma caixa. Tamanho, alinhamento, negrito, itálico e cor
  no painel da direita.
- **Ferramenta Mover** (`V`): arrastar com **Shift** encaixa nas **guias** de alinhamento das outras fichas;
  Shift + clique sem arrastar soma à seleção. As setas do teclado empurram a seleção (com Shift, de 10 em 10).
- **Barras laterais ajustáveis**: arraste a borda das barras da esquerda e da direita (duplo clique restaura).
- **Cartas mais sóbrias** no quadro: tons cinza, um filete discreto de cor por tipo e **ícones em tudo** (Vida,
  Resiliência, Defesa, Alma, Dano, cada atributo e cada capacidade).
- **Carta de chefe larga**: o chefe ocupa o espaço de duas cartas lado a lado, com a arte maior à esquerda e os números e
  habilidades à direita.

### Outros
- Novos ícones para texto, caixa de texto e conversa.
- Página do projeto no GitHub refeita para a edição de Natal, com botões que baixam direto o instalador ou a
  versão portátil mais recente.
- As luzinhas são leves: só a opacidade de 4 camadas muda, sem pesar no editor. Com "reduzir movimento" do Windows ligado, ficam acesas.

## [0.15.0] — 2026-11-18

### Bestiário: HUD nova
- **Painel da ficha** à esquerda com seções de ícone verde: Habilidades de Origem, Habilidades, Itens, Atributos e Capacidades.
- **Inimigo na mira** no alto, com retrato, PV e PA (ou Defesa e Resiliência, quando a criatura não tem Alma).
- **Nome do caçador** com o subtítulo, **Defesa** e **Ações** no canto de cima.
- **Atalhos numerados** embaixo, uma caixa por ação, com recarga, usos e custo.
- **O que você faz?** em linha, com o **Histórico de Ações** logo abaixo.
- **PV, PA e o cartão do Instrumento** no canto de baixo, à direita; clique na arma para usá-la.
- Cartas das criaturas maiores sobre a mesa; tudo se ajusta a telas menores (como 1366 × 768).

### Fundos do Bestiário
- Escolha o fundo da mesa: **mesa do investigador**, **mesa de ritual**, **preto**, **cinza escuro**, **branco** ou
  **uma imagem sua** (copiada para `Documentos\COGITO\Bestiario\fundos`).
- Nos fundos lisos e na imagem, o **círculo de runas** pode ser ligado ou desligado; a imagem pode ser **escurecida**
  para a HUD ficar legível.
- O seletor fica no botão **Fundo**, no alto da tela de combate, e na preparação do confronto. A escolha fica salva.

### Fichas de personagem
- Campos novos: **Origem**, **Nível**, **Filiação** e **Clichê**, mostrados na ficha completa; o Clichê aparece sob o nome
  na HUD quando não há subtítulo.
- **Ações de combate** e **Ações de movimento** por turno. O Bestiário respeita as ações de combate: com 2, o caçador age
  duas vezes antes das criaturas; a HUD mostra quantas restam (ex.: 1/2) e as de movimento.
- A Vida dos personagens passa a se chamar **Vitalidade (PV)**; a ficha completa mostra seis números (Vitalidade,
  Resiliência, Defesa, Alma e as duas ações).

### Outros
- A versão do COGITO aparece no rodapé das Configurações.
- Novos ícones: **Maleta**, **Presas** e o novo símbolo da **Resiliência** (escudo com aura), que substitui a armadura nas cartas e no Bestiário.
- O registro não repete mais "caiu" quando o caçador cai.

## [0.14.0] — 2026-11-18

### Bestiário: a Caçada ganhou cara nova
- **Mesa de investigador ao fundo**, vista de cima: madeira com moldura, abajur verde, cinzeiro com fumaça, copo,
  caneca, telefone de disco, arquivo de fichas, fotos presas com clipe, caderno, pasta de caso e um papel com sigilo.
  No meio, um **círculo de runas** que brilha em laranja na sua vez e em vermelho na vez das criaturas.
- **Nova HUD do jogador**:
  - painel à esquerda com **Habilidades de Origem, Habilidades, Itens, Atributos e Capacidades**, com a tecla de
    cada ação e a recarga;
  - retrato quadrado no alto e, ao lado, o nome com o subtítulo, barras grandes de **PV** e **PA**, Defesa,
    Resiliência, Ações do turno e quem está na mira;
  - **"O que você faz?"** no centro, embaixo, com o **Histórico de Ações** logo abaixo;
  - **Instrumento** (a arma em mãos) no canto, com melhorias, dano, ações para recarga e alcance; clique para usar.
- A tela se ajusta a janelas menores (por exemplo 1366 × 768).

### Fichas
- **Capacidades** (perícias com valor, como Investigação 60), editáveis no painel do quadro e mostradas na ficha completa.
- Cartas de habilidade podem ser marcadas como **Habilidade de origem**.

### Correções
- A faixa de narração não repete mais o nome de quem age.

## 0.13.0 — 2026-11-17

- **Cartas com nova paleta** de 10 pares de cor (tom escuro no corpo, tom vivo no destaque). Jogadores, NPCs,
  criaturas e chefes têm pares próprios; cartas de equipamento, habilidade e poder oculto também, e o par pode ser
  escolhido no editor da carta.
- **Ficha completa** nos cinzas do sistema, com verde-limão no destaque.
- Primeira versão do **Bestiário como mesa de ritual**: caixa de ação no centro e histórico em balões.
- Correção: os números de dano e cura voltaram a subir animados.

## 0.12.0 — 2026-11-17

- **Visual novo em todo o sistema**: paleta cinza com destaque **verde-limão fluorescente**; o logo brilha ao passar o mouse.
- Tela inicial com **barra lateral** (Escritor, Planejador de Campanhas, Bestiário, Configurações, pasta dos dados).
- **Painel de campanhas**: números do total, campanhas abertas por último, ordenar, buscar, lista e detalhe com foto.
- **Notas do quadro no estilo Obsidian Canvas**, com Markdown (títulos, negrito, itálico, listas, citação) e imagem com legenda.
- **Ficha completa** aberta com dois cliques numa carta de personagem.

## 0.11.1 — 2026-11-17

- Cartas de personagem com visual mais limpo e cores menos chamativas.

## 0.11.0 — 2026-11-17

- **Planejador de Campanhas**: campanhas locais com ícone, cor, nome, descrição e foto; quadro infinito com
  personagens, NPCs, inimigos, locais, itens, facções, sessões, notas, imagens e molduras; ligações com legenda;
  links `[[Nome]]`; busca; desfazer e refazer; salvamento automático com cópias.
- O **Bestiário** passa a usar as fichas dos quadros do Planejador.
- Removida toda a parte online (mesas, site dos jogadores, link público). O COGITO não acessa mais a internet.

## Versões anteriores (até 0.10)

- **Escritor**: livros em páginas A4 e A3, capítulos, sumário automático, tabelas com fórmulas, tabelas de rolagem,
  formas com contorno de texto, blocos de RPG, imagens, corretor ortográfico, biblioteca de PDFs, anexos, rolador
  de dados, exportação em PDF e DOCX, salvamento automático e backups.
- Primeiras versões do **Bestiário** (combate em turnos com IA agressiva e o quadro "O que você faz?") e das
  cartas de personagem.
- Mesas de jogo online (removidas na 0.11.0).

[0.15.0]: ../../releases/tag/v0.15.0
[0.14.0]: ../../releases/tag/v0.14.0
