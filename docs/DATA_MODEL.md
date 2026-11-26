# Modelo de dados

## 1. Onde os dados ficam (0.17.0)
Pasta de dados: `Documentos/COGITO` (Windows), ou o caminho em `COGITO_DATA_DIR` (usado nos testes).

```
Documentos/COGITO/
  Livros/<livro-id>/
    livro.json              documento do livro (fonte da verdade)
    livro.json.bak          versão anterior íntegra (gravação atômica)
    livro.corrompido-*.json cópia de um arquivo ilegível, guardada ao recuperar
    imagens/                imagens do livro
    anexos/                 arquivos de consulta (nunca exportados)
    backups/livro-AAAAMMDD-HHMMSS.json   até 40 cópias, a cada 5 min de trabalho
  Planejador/<plano-id>/
    plano.json (+ .bak)     campanha (quadro, fichas, ligações, sistema de regras)
    arquivos/               imagens e capa da campanha
    backups/                cópias periódicas
  Biblioteca/               PDFs de consulta + biblioteca.json (títulos)
  Fontes/                   fontes do usuário
  Bestiario/fundos/         imagens de fundo do Bestiário (sem uso desde a 1.0; fica intocada — ADR-015)
  Lixeira/                  itens apagados (movidos, com data no nome)
<userData do Electron>/
  recuperacao/<livro-id>.json   cópia de emergência quando a gravação normal falha
  Dictionaries/                 dicionário pt-BR do corretor
localStorage (interface)       preferências: cogito.prefs, cogito.theme, cogito.homeTab, cogito.viewMode,
                               cogito.zoom, cogito.rightTab, cogito.dados, cogito.planLinkStyle, cogito.planTextLinks
```

## 2. Formatos atuais

### Livro (`livro.json`, `version: 1`) — `src/model.ts`
`Book { version, id, title, author, format ('A4'|'A3'), pageStyle, showPageNumbers, pageNumberStyle?, createdAt,
updatedAt, chapters: Chapter[], toc }` · `Chapter { id, title, pages: Page[], sections: Section[] }` ·
`Section { id, title, pages }` · `Page { id, content: DocNode (JSON TipTap/ProseMirror), format?, columns? }`.
Validação mínima no processo principal (`isBook`: `id`, `title`, `chapters`).

### Campanha (`plano.json`, `version: 1`) — `src/game/types.ts`
`Plan { version, id, name, description, icon, color, cover, createdAt, updatedAt, view, nodes: PlanNode[],
links: PlanLink[], system?: RuleSystem }`. `PlanNode` tem tipo (personagem, npc, inimigo, local, item, facção, sessão,
nota, imagem, moldura, texto, caixa), posição, tamanho, título, texto Markdown com `[[links]]`, etiquetas e, nas fichas
de jogo, `sheet { boss, vals, lists, actions, cards, ai }`. Campanhas sem `system` são normalizadas para o sistema
COGITO na abertura (`normalizePlan`, `src/game/system.ts`), sem perder valores.

### Ids
Gerados no processo principal: prefixo + aleatório (`livro-<12 hex>`, `plano-<…>`); validados por `^[A-Za-z0-9_-]{4,60}$`.
Já são estáveis e independentes do nome — a base do registro de objetos.

## 3. Registro universal de objetos (alvo da 1.0-e)
Índice reconstruível (ADR-003) que **aponta** para os arquivos acima, sem movê-los (ADR-004).

```ts
interface ObjectEntry {
  id: string;              // persistente; o mesmo id do arquivo (livro-…, plano-…)
  kind: string;            // 'livro' | 'campanha' | (futuro) 'documento' | 'quadro' | 'nota' | 'planilha' | ...
  module: string;          // 'writer' | 'rpg' | ...
  title: string;
  path: string;            // relativo à pasta de dados (ex.: 'Livros/livro-…/livro.json')
  createdAt: number; updatedAt: number;
  tags: string[]; favorite: boolean; archived: boolean; trashedAt?: number;
  formatVersion: number;
  refs?: string[];         // ids citados (para "citado por")
  sync?: { state: 'local' } // a partir da 1.4
}
```
- Guardado em `Documentos/COGITO/.cogito/indice.json` (arquivo novo, nunca substitui dados do usuário). Pode ser apagado:
  é reconstruído varrendo `Livros/` e `Planejador/`.
- Estado do usuário que não está nos arquivos (favorito, último acesso) fica em `Documentos/COGITO/.cogito/estado.json`
  para acompanhar a pasta em backups.
- Referências internas: `cogito://obj/<id>`; renomear ou mover não quebra.

## 4. Regras
- Todo formato tem `version` e uma normalização tolerante na leitura.
- Gravação sempre atômica, com `.bak`; nunca apagar o arquivo antigo antes do novo estar gravado.
- Campos novos opcionais; campos removidos continuam sendo lidos (migração), não descartados em silêncio.
