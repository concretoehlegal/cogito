# COGITO — instruções permanentes de desenvolvimento

COGITO é um aplicativo desktop **local first**, em português brasileiro, que está deixando de ser um app de RPG para se
tornar uma ferramenta generalista (projeto **Genesis**) com quatro pilares: **Escrita**, **Quadro e Memórias**,
**Finanças** e **Editor de imagens**. O RPG vira extensão à parte; o Bestiário foi removido. Leia antes de mudar qualquer coisa:

| Documento | Para quê |
| --- | --- |
| `docs/PRODUCT_VISION.md` | Filosofia, princípios e planos (Free, PRO, Teams) |
| `docs/ARCHITECTURE.md` | Arquitetura atual (auditoria) e arquitetura-alvo (Core, módulos, motores) |
| `docs/ROADMAP.md` | Versões e o que entra em cada uma |
| `docs/DECISIONS.md` | Decisões aprovadas (ADRs) — não reverter sem nova aprovação |
| `docs/BACKLOG.md` | O que está planejado, em andamento, implementado, testado e concluído |
| `docs/DATA_MODEL.md` | Formatos dos arquivos no disco e o registro de objetos |
| `docs/MIGRATION.md` | Como mudar formatos e pastas sem perder dados |
| `docs/DESIGN_SYSTEM.md` | Tokens, componentes e regras visuais |
| `docs/MODULES.md` | Pilares (Escrita, Quadro e Memórias, Finanças, Editor de imagens) e extensões (RPG) |
| `docs/SECURITY.md` | Modelo de segurança e privacidade |
| `docs/MONETIZATION.md` | Planos, permissões (entitlements) e regras de cancelamento |
| `docs/MANUAL.md` | Manual do usuário (o que o app faz hoje) |
| `CHANGELOG.md` (raiz) | Novidades por versão — o fluxo de publicação lê este arquivo |

## Pilha (ADR-001: manter)
Electron 45 · React 18 · TypeScript 7 (estrito, `tsc` nativo, sem API JS) · Vite 8 · zustand + immer · TipTap 2 ·
`docx` · pdf.js · lucide-react · electron-builder. Processo principal em CommonJS (`electron/*.cjs`).

## Comandos
```bash
npm install            # dependências (CI usa npm ci)
npm run dev            # app em modo de desenvolvimento (Vite + Electron)
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint (src, electron, scripts, tests)
npm test               # testes de unidade (node:test, tests/*.test.ts)
npm run build          # assets do pdf.js + tsc + vite build
npm run test:e2e       # testes de interface (Playwright + Electron); pede build antes e, no Linux, xvfb-run
npm run dist           # instalador e .zip para Windows
```
Antes de entregar qualquer mudança: `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e`.

## Regras
1. **Preserve o trabalho e os dados do usuário.** Nunca mova, apague ou reescreva arquivos do usuário em formato novo sem
   uma migração descrita em `docs/MIGRATION.md`, com cópia de segurança e volta atrás. Arquivos ficam em
   `Documentos/COGITO` (ou `COGITO_DATA_DIR`).
2. **Local first e offline.** Nada sai para a rede: o processo principal bloqueia qualquer pedido que não seja `cogito://`.
   Serviços remotos só entram pela camada Cloud (versão 1.4) e só para planos que os financiem.
3. **Sem funcionalidade simulada.** Nada de botões que não fazem nada nem dados fictícios apresentados como reais: o que
   não existe fica oculto ou com estado claro de indisponível.
4. **Módulos não importam uns aos outros.** Falam pelo Core (registro de objetos, eventos, configurações). Sem dependência circular.
5. **Plataforma-alvo atual: Windows** (ADR-007). Não gaste esforço com macOS/Linux por enquanto, mas não use nada que
   impeça o porte (caminhos com `path`, atalhos com `ctrlKey || metaKey`).
6. **Dependências**: verificar licença antes; nada comercial ou pago sem aprovação; registrar em `docs/DECISIONS.md`.
7. **Interface em português brasileiro**, texto direto, sem emojis como ícones estruturais.
8. **Trabalhe em passos pequenos e verificáveis**; atualize `docs/BACKLOG.md` (estado real: planejado → em andamento →
   implementado → testado → concluído) e `CHANGELOG.md`.
9. **Publicação**: um push no `main` que muda a versão do `package.json` publica uma Release automaticamente
   (`.github/workflows/release.yml`). Trabalhe em ramos; só leve ao `main` com aprovação.
10. Mudança arquitetural irreversível, operação destrutiva ou troca de dependência crítica: **peça aprovação antes**.

## Mapa rápido do código
- `electron/main.cjs` — janela, protocolo `cogito://`, livros, backups, biblioteca, exportação, IPC.
- `electron/planner.cjs` — campanhas do Planejador (RPG).
- `electron/preload.cjs` — a única ponte para a interface (`window.cogito`).
- `src/store.ts` — estado do Escritor e preferências · `src/model.ts` — formato do livro.
- `src/components`, `src/editor`, `src/export` — Escritor (futuro módulo Writer).
- `src/planner`, `src/game` — Planejador de campanhas e sistema de regras (futura extensão RPG; o quadro vira a base de Quadro e Memórias).
- `tests/*.test.ts` — unidade · `tests/e2e/*.cjs` — interface (Playwright + Electron).

## Convenções
- Comentários e textos da interface em português. Nomes de código podem misturar português (domínio) e inglês (técnica),
  seguindo o arquivo ao redor.
- Gravação de arquivos sempre atômica (temporário + rename + `.bak`).
- Formatos com campo de versão e função de normalização tolerante (ex.: `normalizePlan` em `src/game/system.ts`).
