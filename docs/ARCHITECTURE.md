# Arquitetura

Duas partes: **como o código está hoje** (auditoria de 2026-11-25, versão 0.17.0) e **para onde ele vai** (Genesis).

## 1. Arquitetura atual (0.17.0)

```
electron/
  main.cjs      processo principal: janela, protocolo cogito://, livros (books:*), backups, recuperação,
                biblioteca de PDFs, anexos, fontes do usuário, exportação (PDF/DOCX), corretor ortográfico
  planner.cjs   campanhas do Planejador (plan:*), arquivos das campanhas
  preload.cjs   ponte única para a interface: window.cogito (só ipcRenderer.invoke)
src/
  main.tsx, App.tsx   entrada; troca de tela por um único estado `screen` (home | editor | plano | bestiario)
  store.ts            estado global (zustand) do Escritor, preferências (localStorage), salvamento
  model.ts            formato do livro (capítulos → seções → páginas com documento TipTap)
  api.ts              tipos da ponte window.cogito
  components/         Home, Escritor (editor, painéis, barra de ferramentas, sumário, leitor de PDF), Configurações
  editor/             extensões TipTap (imagens, formas, tabelas com fórmulas, blocos de RPG)
  export/             pdf.ts (impressão do Chromium), docx.ts (biblioteca docx)
  planner/            Planejador: quadro infinito, painéis, ficha completa, editor do sistema de regras
  hunt/               Bestiário: motor de turnos, IA, intérprete de ações, telas
  game/               cartas, ícones próprios, sistema de regras (system.ts)
  lib/ dice/ styles/  utilidades, dados, fórmulas, guias, sons, temas
tests/                43 testes de unidade (node:test)
tests/e2e/            testes de interface (Playwright + Electron) — desde a 1.0-a
```

**Fluxo de dados:** a interface (sandbox, sem Node) chama `window.cogito.*` → `ipcMain.handle` no processo principal →
arquivos JSON em `Documentos/COGITO`. Imagens e arquivos são servidos pelo protocolo `cogito://app/...` com caminhos
validados. Gravação atômica (temporário + rename + `.bak`), fila por documento, backups e cópia de recuperação.

**Pontos fortes:** isolamento de contexto, sandbox, CSP restritiva, rede bloqueada, permissões negadas, validação de ids
e nomes, exportação só para caminhos aprovados, gravação à prova de queda.

**Limites (motivam o Genesis):** sem núcleo compartilhado (cada área grava, lista e apaga do seu jeito); referências
entre fichas por título; tudo carregado de uma vez (um JS de ~1,6 MB); estado do Escritor concentrado em `store.ts`;
estética de RPG e sazonal espalhada no CSS principal; preferências em `localStorage`.

## 2. Arquitetura-alvo (Genesis)

Quatro camadas conceituais:

| Camada | Onde | Responsabilidade |
| --- | --- | --- |
| **Core** | `electron/core/*`, `src/core/*` | Registro de objetos e arquivos, configurações, navegação, abas, eventos, segurança, busca, versões, integração entre módulos, registro de módulos, permissões de plano |
| **Local Engine** | processo principal + workers | Gravação, índice, exportação, cálculos (planilhas), imagens, backups locais — tudo no dispositivo |
| **Cloud Engine** | a partir da 1.4 | Autenticação, assinatura, sincronização, nuvem, IA, compartilhamento, colaboração — sempre opcional e validado no servidor |
| **Module System** | `src/core/modules.ts` + `src/modules/*` | Registro, ativação/desativação e carregamento sob demanda dos módulos |

```
electron/
  core/      storage.cjs (gravação atômica, .bak, backups, lixeira), workspace.cjs (registro de objetos e índice),
             settings.cjs, protocol.cjs, ipc.cjs
  modules/   writer.cjs (livros), rpg.cjs (campanhas)
  main.cjs   só inicialização, janela e segurança da sessão
src/
  core/      shell (barra superior com abas, barra lateral, painel direito, barra de status), modules.ts, tabs.ts,
             events.ts, settings.ts, files.ts, entitlements.ts, account.ts
  design/    tokens.css e componentes base (ver DESIGN_SYSTEM.md)
  modules/   writer/, rpg/ (existentes) · canvas/, vault/, projects/, finance/, sheets/, studio/ (versões seguintes)
```

### Contrato de módulo
```ts
interface ModuleDef {
  id: string; name: string; icon: string;
  kinds: string[];                     // tipos de objeto que o módulo cria e abre
  load: () => Promise<ModuleView>;     // tela carregada sob demanda (React.lazy)
  defaultEnabled: boolean;             // o RPG pode vir desligado e ser ligado nas Configurações
  requires?: string[];                 // permissões de plano (entitlements), quando houver
}
```
Regras: módulos não importam uns aos outros; usam o Core (registro de objetos, eventos, configurações, arquivos).
Um módulo desligado não é carregado.

### Referências entre objetos
Cada objeto tem um id persistente (ex.: `livro-…`, `plano-…`). Referências internas usam `cogito://obj/<id>`, que não
quebram ao renomear ou mover. Os links `[[Título]]` do Planejador continuam funcionando e podem ser resolvidos para ids.

## 3. Desempenho (metas iniciais da 1.0)
- JS inicial menor que o atual (~1,6 MB), com cada módulo carregado só ao abrir.
- Nenhum motor de edição carregado na inicialização.
- Listas extensas virtualizadas (recentes, arquivos, quadros grandes) — a partir de quando passarem de algumas centenas de itens.
Métricas finas (tempo de abertura, memória) serão definidas medindo o app no computador de referência.
