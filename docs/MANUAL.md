# Manual do COGITO

> Guia completo de uso. Para baixar o aplicativo, veja a [página principal](../README.md) ou as [Releases](../../../releases/latest).

Aplicativo para **Windows** com três áreas separadas, escolhidas na barra lateral da tela inicial:

- **Escritor (local, offline)**: escrever, diagramar e exportar livros de RPG, com biblioteca de PDFs de consulta.
  Nada disso sai do seu computador.
- **Planejador de campanhas**: um quadro livre para cada campanha (no espírito do Miro e do Obsidian), com
  personagens, NPCs, inimigos, locais, itens, facções, sessões, notas, imagens e molduras ligados entre si.
- **Bestiário**: combate em turnos com visual de RPG de computador, usando os personagens e os inimigos dos quadros
  do Planejador. Você escreve o que o personagem faz e o Bestiário interpreta.

Tudo fica neste computador: não há contas, internet nem servidor.

## Como usar no Windows

**Opção A — instalador**
1. Baixe `COGITO-Instalador-<versão>.exe` na página de [Releases](../../../releases/latest) e abra.
2. Escolha a pasta e conclua. O COGITO aparece no menu Iniciar e na área de trabalho.

**Opção B — pacote pronto (sem instalar nada)**
1. Baixe `COGITO-<versão>-windows-x64.zip` nas [Releases](../../../releases/latest) e extraia em uma pasta (por exemplo `C:\COGITO`).
2. Abra `COGITO.exe`. Se quiser, crie um atalho na área de trabalho (botão direito › Enviar para › Área de trabalho).

Na primeira abertura o Windows pode mostrar o aviso "O Windows protegeu o computador", porque o programa não é
assinado digitalmente. Clique em **Mais informações › Executar assim mesmo**.

**Opção C — gerar o instalador no seu PC**
1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova).
2. Na pasta do projeto, rode:
   ```
   npm install
   npm run dist
   ```
3. O instalador aparece em `release\COGITO-Instalador-<versão>.exe` (e o `.zip` ao lado).

## Onde ficam os seus dados

Tudo fica em `Documentos\COGITO`:

```
Documentos\COGITO
├─ Livros\<livro>\
│   ├─ livro.json        o livro (capítulos, seções, páginas, sumário)
│   ├─ livro.json.bak    a versão gravada imediatamente antes
│   ├─ imagens\          imagens inseridas nas páginas (entram na exportação)
│   ├─ anexos\           arquivos só de consulta (NÃO entram na exportação)
│   └─ backups\          cópias automáticas com data e hora
├─ Planejador\           campanhas do Planejador (quadro, imagens e cópias automáticas)
├─ Biblioteca\           PDFs de consulta, independentes dos livros (NÃO entram na exportação)
└─ Fontes\               fontes suas (ex.: Bree Serif Bold para os capítulos)
```

Para copiar seus livros para outro computador ou fazer um backup externo, basta copiar a pasta `Documentos\COGITO`.

### Salvamento e proteção contra perda

- Cada alteração é gravada sozinha em cerca de um segundo; o indicador no topo mostra **Salvo**, **Salvando…** ou o erro.
- A gravação é feita em arquivo temporário e só depois substitui o original — uma queda de energia não deixa o livro pela metade.
- Backups automáticos: ao abrir o livro e a cada 5 minutos de trabalho (ficam os 40 mais recentes). Restaure em ⚙ › Backups.
- Se o arquivo principal estiver ilegível, o COGITO abre a cópia mais recente e avisa.
- Se não for possível gravar na pasta do livro, uma cópia de recuperação é guardada em `%APPDATA%\COGITO\recuperacao`.
- Livros, anexos e PDFs excluídos vão para a Lixeira do Windows.

## Visual e fontes

**Edição de Natal**: luzinhas no alto da janela e gorro no logo. As luzes fazem o **pisca-pisca clássico** (sequência,
alternado, todas piscam, ondas, acende devagar, cintilante, combinação e acesas, em ciclo). Em ⚙ Configurações →
**Enfeites de Natal** escolha **Pisca-pisca** (o programa clássico), **Suave** (cintilar devagar) ou **Sempre acesas**, ou desligue os enfeites.

Paleta cinza (escuro: `#0A0A0A` `#171717` `#262626` `#373737` … `#FAFAFA`; claro: o inverso) com um único destaque
**verde-limão fluorescente** `#B8FF2C` nos botões principais, itens ativos e links. A tela inicial tem uma **barra
lateral** com as três áreas (Escritor, Planejador de Campanhas, Bestiário), Configurações e a pasta dos dados; o logo
**brilha em verde** ao passar o mouse.

**Interface**: Inter (embutida). **Fichas e cartas de personagem**: IBM Plex Mono (embutida).

**Interface**: Inter (embutida).

**Páginas do livro** (o que vai para o PDF):

| Uso | Fonte |
| --- | --- |
| Título do capítulo (estilo "Título") | Bree Serif Bold |
| Cabeçalhos (estilo "Subtítulo") | Archivo Black |
| Tópicos (estilo "Título menor") | Roboto Slab Bold |
| Texto | Literata |
| Números | Rajdhani Semibold |

A versão gratuita da **Bree Serif** só tem o peso Regular: ela vem embutida e o app aplica o negrito por cima. Se você
tiver o arquivo da Bree Serif Bold, instale-o no Windows ou copie-o para `Documentos\COGITO\Fontes` (nome com "Bree" e
"Bold"). No DOCX exportado, o Word só mostra essas fontes se estiverem instaladas; o PDF já as leva embutidas.

Sons de clique e de dados são gerados pelo próprio app (sem arquivos de áudio) e podem ser desligados em ⚙.

## Recursos

- **Livros**: criar, abrir, renomear e excluir; páginas A4 e A3 (formato do livro e também por página); 1 ou 2 colunas;
  papel cinza, branco ou pergaminho.
- **Estrutura**: capítulos › seções › páginas, reordenáveis arrastando ou pelo menu "⋯".
- **Editor**: títulos, negrito/itálico/sublinhado/tachado, alinhamento, listas, citações, tabelas, imagens
  (inserir, colar ou arrastar) e blocos de RPG — ficha de personagem, bloco de criatura, item ou magia,
  nota do mestre, texto para leitura e tabela de rolagem.
- **Formas**: retângulo, círculo, triângulo, losango, hexágono, estrela, faixa, seta e linha, com cor, contorno e
  texto. Clique e arraste as alças para redimensionar (`Shift` mantém a proporção); o texto pode contornar a forma.
- **Tabelas com fórmulas**: comece uma célula com `=` (`=A1+B2`, `=SOMA(A1:A5)`, `MÉDIA`, `MÍN`, `MÁX`, `CONT`,
  `ARRED`, `ABS`). Arraste a borda das colunas para mudar a largura. PDF e DOCX levam o resultado calculado.
- **Contorno de PNG**: numa imagem PNG com fundo transparente, escolha "Contorno" e o texto acompanha o desenho.
- **Ferramenta Mover** (botão "Mover" na barra ou `Ctrl+M`): arraste imagens e formas para qualquer ponto da página,
  por cima do texto. Segure **Shift** enquanto arrasta para encaixar nas guias (bordas e centro da página, margens e os
  outros elementos soltos). `Esc` sai da ferramenta. Um elemento solto mostra **Livre ✥** na barra; clique para
  devolvê-lo ao texto. A posição é a mesma no PDF e no DOCX.
- **Número da página**: no centro, embaixo. Em ⚙ escolha só o número ("3"), o contador ("3 / 12", padrão) ou por
  extenso ("Página 3 de 12").
- **Visualização**: uma página ou duas lado a lado (pares 1–2, 3–4…), com zoom pelos botões ou por `Ctrl` + rolagem
  do mouse. Quando o texto passa do fim da página, o app avisa e oferece mover o excedente para novas páginas.
- **Corretor ortográfico**: português do Brasil, sem internet (o dicionário vem no app). Palavras erradas
  ficam sublinhadas; o botão direito mostra sugestões e "Adicionar ao dicionário". É ortografia, não gramática.
- **Painéis ajustáveis**: arraste a borda do cartão da estrutura, do painel de ferramentas ou da consulta para mudar a
  largura (duplo clique restaura). Em ⚙ há também o tamanho geral da interface (80% a 150%).
- **Busca**: procura no texto do livro aberto e leva à página (`Ctrl+F`).
- **Sumário**: gerado a partir de capítulos e seções, clicável, com edição manual (renomear, ocultar, itens extras)
  preservada quando a estrutura muda.
- **Dados**: d4, d6, d8, d10, d12, d20, d100 e fórmulas como `2d6+3`, com animação e som de rolagem;
  histórico com as 6 últimas rolagens.
- **Biblioteca**: PDFs de consulta abertos dentro do app, ao lado do editor, com busca no texto.
- **Exportação**: PDF (idêntico ao que aparece na tela, com sumário clicável) e DOCX (títulos, tabelas, imagens e
  sumário; ao abrir no Word, aceite "atualizar campos" para preencher os números de página).

Atalhos: `Ctrl+S` grava na hora · `Ctrl+M` liga a ferramenta Mover · `Ctrl+Home/End` vai ao começo/fim do texto · `Ctrl+F` busca (na barra lateral) · `Ctrl` + rolagem dá zoom · `Ctrl+PageUp/PageDown` troca de página · `Ctrl+B/I/U` formatação · `Ctrl+Z/Y` desfazer/refazer.

## Planejador de campanhas

Na tela inicial, área **Planejador de Campanhas**, em forma de painel: números do total (campanhas, fichas,
personagens e inimigos), as campanhas abertas por último, pílulas para ordenar (Recentes, Nome, Mais fichas) e a
busca. Embaixo, a **lista** das campanhas e o **detalhe** da escolhida: nome, ícone, **foto** de capa, descrição, quantas
fichas de cada tipo, os rostos dos personagens e os botões Editar capa (nome, descrição, ícone, cor e foto), Abrir
pasta, Excluir (vai para a lixeira) e **Abrir quadro** (ou dois cliques na campanha).

**O quadro** (abre ao clicar na campanha):
- **Tela infinita**: rolagem move, **Ctrl + rolagem** aproxima, **arrastar no fundo** seleciona vários, **Espaço**,
  botão do meio ou direito + arrastar move a visão. "Enquadrar tudo" na barra da esquerda.
- **Fichas** (barra da esquerda): **Personagem**, **NPC** e **Inimigo** aparecem como cartas de personagem (com a
  ficha de jogo: Vida, Resiliência, Defesa, Alma, atributos, ataques ou habilidades e cartas); **Local**, **Item**,
  **Facção**, **Sessão** e **Nota** como cartões de texto no estilo do Obsidian Canvas (nome acima, borda na cor da
  ficha, título, imagem à direita com legenda, texto com **Markdown**: `#` títulos, `**negrito**`, `*itálico*`, listas
  `-` e `1.`, `>` citação, `---` linha, e `[[links]]`), com etiquetas;
  **Imagem**; e **Moldura** para agrupar (pegue a moldura pelo rótulo; ela leva junto o que está dentro).
  Dois cliques no fundo criam uma nota rápida. Fichas novas procuram um espaço livre perto do centro.
- **Ligações (setas e linhas estilo Miro)**: passe o mouse sobre uma ficha e arraste uma das **4 bolinhas** (em cima,
  à direita, embaixo, à esquerda) até outra ficha. Clique na ligação para editar: legenda ("traiu", "mora em"),
  **formato** (reta, curva ou cotovelo), **traço** (sólido, tracejado ou pontilhado), **ponta** no início e no fim
  (nenhuma, seta, triângulo, círculo, losango ou barra), **espessura**, cor, os **lados** de saída e chegada (ou
  automático), inverter e apagar. Os **estilos prontos** (Linha, Seta, Curva, Fluxo, Mão dupla, Pista, Segredo,
  Rompido) aplicam tudo de uma vez; o último estilo usado vale para as próximas ligações.
- **Ferramentas** (barra da esquerda): **Mover** (`V`), **Texto** (`T`, clique e escreva um texto solto) e **Caixa de
  texto** (`B`, texto dentro de uma caixa). Dois cliques num texto editam; o painel da direita muda tamanho,
  alinhamento, negrito, itálico e cor. `Esc` volta ao Mover.
- **Guias de alinhamento**: arraste fichas segurando **Shift** para encaixar nas bordas e no centro das outras.
  Shift + clique (sem arrastar) soma à seleção; as setas do teclado empurram a seleção (Shift: 10 de cada vez).
- **Barras ajustáveis**: arraste a borda da barra da esquerda ou da direita para mudar a largura (duplo clique restaura).
- **Links no texto (Obsidian)**: escreva `[[Nome]]` no texto de uma ficha. Ao digitar `[[`, aparecem sugestões
  (Enter completa). No quadro o link vira uma etiqueta clicável que leva até a ficha; um link para algo que ainda não
  existe fica marcado e pode criar a ficha. O painel mostra as ligações, quem a ficha cita e **quem cita a ficha**.
  O botão `[[ ]]` mostra essas citações como linhas tracejadas no quadro.
- **Imagens**: arraste do computador para o quadro, cole (Ctrl+V) ou use o botão Imagem. Ficam na pasta da campanha.
- **Busca** (Ctrl+F): apaga o que não combina; Enter vai de um resultado ao outro.
- **Desfazer e refazer** (Ctrl+Z / Ctrl+Y), **Delete** apaga, **Ctrl+D** duplica, **Ctrl+A** seleciona tudo.
- **Painel da direita**: edita a ficha selecionada (tipo, nome, subtítulo, cor, ícone, imagem, etiquetas, texto e,
  nos personagens e inimigos, a ficha de jogo — Vida, Resiliência, Defesa, Alma, atributos, **capacidades**, ataques e cartas); sem seleção, mostra a campanha e os atalhos.
- **Enfrentar no Bestiário**: no painel de um inimigo (ou "Caçar com esta ficha" num personagem) leva direto para o
  Bestiário com essa ficha escolhida.
- **Salvamento automático** a cada alteração, com cópia da versão anterior e cópias periódicas na pasta `backups`.

**Cartas no quadro**: tons cinza sóbrios, com um filete de cor discreto por tipo e ícones em todos os números, atributos
e capacidades. O **chefe** vira uma carta larga, do tamanho de duas cartas lado a lado, com a arte maior à esquerda.

**Cartas de personagem no Bestiário** (bordas grossas, sombra dura e blocos de cor chapada, em pares de cor: um tom escuro no corpo e
um vivo no destaque): jogadores azul-marinho e amarelo-ouro, NPCs verde-floresta e sálvia, criaturas meia-noite e pink,
chefes bordô e bege. As cartas de equipamento, habilidade e poder oculto usam a mesma paleta de 10 pares (escolha o par
no editor da carta). A arte é o retrato (sem retrato, o ícone).
**Dois cliques na carta** (ou "Abrir ficha" no painel) abrem a **ficha completa**: retrato, Vida, Resiliência, Defesa e
Alma (nas criaturas, o Dano), a história, os atributos, as ações e a lista de cartas, nos cinzas do sistema, com os botões para levar ao
Bestiário ou editar.
- Canto superior esquerdo: **Vida** (gota) e **Resiliência** (escudo); direito: **Defesa** (alvo) e **Alma** (espírito).
- Nome no centro, **atributos** abaixo (3 letras e o valor, até 6) e o **instrumento** no rodapé: a arma equipada com
  rolagem, com o dano e as ações para recarregar.
- **Criaturas** mostram Vida, Resiliência, Dano e as **habilidades**: 2 para criaturas comuns, 4 para chefes.

## Sistema de regras (qualquer RPG)

Cada campanha do Planejador tem o seu **sistema de regras**. Ele define o que existe nas fichas e como o Bestiário
resolve os ataques, para você testar o seu sistema próprio ou jogar com D&D, Call of Cthulhu, Ordem Paranormal,
Daggerheart, Pathfinder ou qualquer outro.

**Escolher**: ao criar a campanha, em **Sistema de regras**. Depois, em **Editar sistema** (painel da campanha, sem
nada selecionado, ou no topo da ficha de jogo de um personagem ou criatura).

| Modelo | O que vem pronto |
| --- | --- |
| COGITO | Vitalidade, Resiliência, Defesa, Alma, ações de combate e de movimento; Origem, Nível, Filiação, Clichê; Atributos e Capacidades |
| D&D 5ª edição | PV, CA, Espaços de Magia, Bônus de Proficiência, Iniciativa, Deslocamento; Espécie, Classe, Nível, Antecedente, Alinhamento; seis atributos, testes de resistência e 18 perícias; ND para monstros |
| Call of Cthulhu 7ª ed. | PV, Sanidade, Pontos de Magia, Armadura, Sorte, Movimento; Ocupação, Idade, Residência; oito características e perícias; acerto em porcentagem |
| Ordem Paranormal | PV, PE, Sanidade, Defesa, Resistência a Dano, NEX, Deslocamento; Origem, Classe, Trilha, Patente; cinco atributos e 20 perícias; VD e Elemento para ameaças |
| Daggerheart | PV, Estresse, Esperança, Evasão (Dificuldade para adversários), Armadura, Limiares; Ancestralidade, Comunidade, Classe, Subclasse, Nível; seis atributos e Experiências; crítico com dados iguais |
| Pathfinder 2ª edição | PV, CA, Pontos de Foco e de Heroísmo, Percepção, Deslocamento; Ancestralidade, Herança, Antecedente, Classe, Nível; atributos, salvamentos e perícias; crítico por 10 acima da CA |
| Em branco | Só Vida e Defesa e uma lista de Atributos vazia |

**O editor tem quatro abas**:
- **Campos**: cada número, barra ou texto da ficha, com ícone, nome, sigla, tipo, **função no Bestiário**, quem tem
  (personagem, NPC, criatura), se aparece na carta e o valor inicial (e um valor próprio para criaturas). As setas
  mudam a ordem; o X remove. Os botões embaixo criam um número, uma barra ou um texto.
- **Listas**: grupos de nome e valor (Atributos, Perícias…), com ícone, quem tem, se aparecem na carta e os itens de
  partida das fichas novas (cada item com ícone).
- **Nomes**: como se chamam personagem, NPC, criatura e chefe; ataques, habilidades, acerto, dano e as habilidades de
  origem; e os três tipos de carta (ex.: Item, Poder e Ritual, ou Equipamento, Característica e Magia).
- **Combate**: como o ataque acerta (rolagem contra a defesa, porcentagem com 1d100 ou automático), o crítico, se a
  armadura desconta do dano e a rolagem de acerto das ações novas. Embaixo, o resumo do que o Bestiário está usando.

**Funções dos campos**: *Vida* (quando chega a zero, a ficha cai), *Defesa* (o número que o acerto precisa alcançar),
*Recurso* (o que as cartas gastam: uma carta com custo “2 PE” gasta 2 do recurso de sigla PE), *Armadura* (desconta
do dano), *Ações por turno* e *Movimento*. Campos sem função aparecem na ficha e na carta sem efeito no combate.

**Na ficha**: o painel mostra os textos (identidade), os números e as listas do sistema. Cada item de lista tem
ícone, nome e valor próprios, e dá para somar ou tirar itens só naquela ficha. Valores aceitam texto (“16 (+3)”,
“9 m”, “5%”); o Bestiário usa o primeiro número.

**Trocar de sistema não apaga nada**: os valores ficam guardados pelo nome interno de cada campo; campos novos
recebem o valor inicial; listas com o mesmo nome levam os valores dos itens iguais, e itens antigos preenchidos
continuam no fim da lista. **Copiar de outra campanha** traz o sistema inteiro de outra campanha.

## Bestiário

Na tela inicial, área **Bestiário**. Escolha a campanha do Planejador, o **caçador** (um personagem ou NPC) e até **4 criaturas**
(inimigos, inclusive repetidos) e comece. Tudo acontece só neste computador: as fichas da campanha não mudam.

- **Tela de jogo**: ao fundo, a **mesa de um investigador** vista de cima — tábuas de madeira com moldura, abajur verde,
  cinzeiro com fumaça, copo, caneca, telefone de disco, arquivo de fichas, fotos presas com clipe, caderno com caneta,
  pasta de caso e um papel com sigilo — e no meio um **círculo de runas** que brilha (laranja na sua vez, vermelho e mais
  rápido na vez das criaturas). As criaturas ficam sobre a mesa, como cartas, com a barra de vida; a que está na mira
  ganha contorno turquesa. Uma faixa repete o último acontecimento. Números de dano e cura saltam de quem foi atingido.
- **HUD do jogador**:
  - **No alto, à esquerda**: Sair, a rodada, de quem é a vez, Recuar e **Fundo** (escolhe o fundo da mesa: mesa do
    investigador, mesa de ritual, preto, cinza escuro, branco ou uma imagem sua, com o círculo de runas opcional e a
    opção de escurecer a imagem; a escolha fica salva e também aparece na preparação do confronto).
  - **Painel da esquerda**: **Habilidades de Origem** (cartas de habilidade marcadas como "Habilidade de origem"),
    **Habilidades** (habilidades e poderes ocultos), **Itens**, **Atributos** e **Capacidades** (os ataques da ficha e as
    capacidades com valor), cada seção com seu ícone. O que pode ser usado mostra a tecla (1 a 9), fica clicável e mostra
    a recarga; passe o mouse para ver a carta inteira.
  - **No alto, no meio**: o **inimigo na mira**, com retrato, **PV** e **PA** (ou Defesa e Resiliência, se ele não tiver Alma).
  - **No alto, à direita**: o nome do caçador com o subtítulo, a **Defesa** e as **Ações** do turno.
  - **Embaixo**: os **atalhos numerados** (uma caixa por ação, com recarga, usos e custo); **O que você faz?** com o
    **Histórico de Ações** logo abaixo (suas falas em verde, as criaturas em rosa, o sistema no meio, separados por
    rodada); e, à direita, as barras de **PV** e **PA** e o cartão do **Instrumento** — a arma em mãos, com dano,
    recarga, alcance (um número chamado "Alcance" na carta, ou um bônus como "20 m") e melhorias. Clique na arma para usá-la.
- **O que você faz?**: escreva a ação com suas palavras, por exemplo
  “atiro no segundo cultista”, “tomo o remédio”, “me protejo com o colete” ou “sussurro as palavras contra o chefe”.
  O Bestiário escolhe, entre os ataques, armas, itens e habilidades da ficha, o que combina com o texto e o alvo
  (pelo nome, “o segundo…”, “o chefe”, “o mais ferido”), mostra o que entendeu antes de agir e sugere outras opções.
  “Ataco o verme” usa a melhor opção de dano disponível; o que está em recarga ou acabou é explicado; “fujo” recua.
  Enter age. A frase vai para o registro. É uma leitura por palavras-chave, sem internet, para ser aprimorada depois.
- **Teclas 1 a 9**: usam, pela ordem, os ataques da ficha e as cartas com efeito no Bestiário (o número aparece no painel).
- **Cartas no Bestiário**: no editor de cartas, o campo **No Bestiário** escolhe **Dano**, **Cura**, **Defesa** ou Nenhum.
  A rolagem da carta é o valor (o acerto das cartas de dano usa o primeiro ataque da ficha). A **recarga** vem do texto
  ("3 turnos"; "1 cena" = uma vez por confronto), o **custo** em barra também ("2 Alma" gasta 2 de Alma), e os consumíveis
  acabam. Cartas passivas não viram ação. Cartas antigas com rolagem já vêm como Dano.
- **Turnos**: iniciativa com 1d20; você age, depois cada criatura. 20 natural acerta e dobra o dano; 1 natural erra.
- **IA das criaturas (Agressiva)**: cada criatura calcula, para cada golpe, a chance de acerto contra a sua Defesa e o dano
  médio, e escolhe o que tira mais vida **neste turno** (dano que passaria da vida restante não conta), dando um peso
  extra à chance de derrubar você agora. Com você inteiro, ela vai no maior dano esperado; com você quase caindo, no
  golpe mais certeiro. Outros comportamentos por criatura ficam para depois (o campo já existe nas fichas).
- **Histórico de Ações** (embaixo, no centro, logo abaixo de "O que você faz?"): narra cada decisão das criaturas ("vai de Mordida: 65% de acerto, ≈ 7,5 de dano
  esperado") e cada resultado, com as rolagens.
- **Fim**: vitória, derrota ou recuo, com rodadas, dano causado e sofrido, cura e críticos; **Enfrentar de novo** repete
  o mesmo confronto.

## Desenvolvimento

```
npm install
npm run dev        # abre o app em modo de desenvolvimento
npm test           # testes de dados e sumário
npm run build      # verificação de tipos + build da interface
npm start          # build + abre o app
npm run dist       # instalador e .zip para Windows (rodar no Windows)
npm run dist:zip   # só o .zip (funciona também em Linux/macOS)
```

Tecnologia: Electron + React + TypeScript (Vite). Editor TipTap/ProseMirror, leitor de PDF pdf.js, DOCX via `docx`.

- `electron/main.cjs` — janela, arquivos locais, backups, biblioteca, exportação. Bloqueia qualquer acesso à rede.
- `src/model.ts` — modelo do livro e geração do sumário. `src/store.ts` — estado e salvamento automático.
- `src/components/` — interface (`icons.tsx` tem os ícones). `src/editor/` — extensões e modelos de blocos. `src/export/` — PDF e DOCX.
- `src/lib/sound.ts` — sons sintetizados. `src/lib/fonts.ts` — carregamento da fonte de títulos.
- `src/styles/app.css` — paleta e interface.
- `electron/planner.cjs` — campanhas do Planejador no disco (gravação atômica, cópias, imagens).
- `src/planner/` — lista de campanhas, quadro infinito, painel e modelo (`model.ts`, testado em `tests/planner.test.ts`).
- `src/game/` — cartas, cartas de personagem, ícones do sistema e tipos.
- `src/hunt/` — Bestiário: motor em turnos e IA (`engine.ts`), intérprete das ações escritas (`interpret.ts`) a tela de jogo e a mesa de fundo (`Desk.tsx`)
  (testados em `tests/hunt.test.ts` e `tests/interpret.test.ts`).
- `src/styles/page.css` — aparência das páginas (a mesma no editor e no PDF).
