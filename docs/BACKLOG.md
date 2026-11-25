# Backlog

Estados: **planejado** → **em andamento** → **implementado** (código pronto) → **testado** (testes automatizados
passando) → **concluído** (testado, documentado e entregue). Atualize a cada passo.

## 1.0 — Foundation
| Item | Estado | Observações |
| --- | --- | --- |
| Auditoria técnica do repositório | concluído | 2026-11-25; resumo em `ARCHITECTURE.md`, riscos em `SECURITY.md` |
| Decisões aprovadas registradas | concluído | `DECISIONS.md` (ADR-001 a ADR-012) |
| Documentação permanente (`CLAUDE.md`, `docs/`) | concluído | 1.0-a |
| Testes de interface no repositório (`tests/e2e`) | testado | 1.0-a; 12 roteiros, 195 verificações; `npm run test:e2e` |
| Testes de interface no CI | implementado | 1.0-a; job `interface` (ubuntu + xvfb + poppler); confirmar na primeira execução no GitHub |
| Linter (oxlint, zero avisos) | concluído | 1.0-a (ADR-005b); 27 avisos iniciais corrigidos (código morto e estilo) |
| Design System: tokens e componentes base | testado | 1.0-b; tokens, apelidos dos nomes antigos, botões; campos/menus/diálogos migram com a shell (1.0-c) |
| RPG e Natal isolados do CSS principal | testado | 1.0-b; verde só em `data-module=rpg`; Natal em `seasonal.css` com modo automático (ADR-010, ADR-013) |
| Shell: barra superior com abas, lateral, painel direito, barra de status | planejado | 1.0-c |
| Registro de módulos e carregamento sob demanda | planejado | 1.0-d |
| RPG liga/desliga nas Configurações | planejado | 1.0-d |
| Registro de objetos (`.cogito/indice.json`) e serviço de arquivos | planejado | 1.0-e |
| Recentes, favoritos, renomear, duplicar, lixeira e restauração universais | planejado | 1.0-e |
| Referências `cogito://obj/<id>` | planejado | 1.0-e |
| Cópia de segurança antes da primeira abertura da 1.0 | planejado | 1.0-e (ADR-004) |
| Configurações em arquivo (migradas do localStorage) | planejado | 1.0-f |
| Interfaces locais de Conta e Planos (sem rede) | planejado | 1.0-f (ADR-012) |
| Página Início | planejado | 1.0-g |
| Versão 1.0.0 publicada | planejado | 1.0-g |

## Dívidas técnicas conhecidas
| Item | Estado | Quando |
| --- | --- | --- |
| TipTap 2 → 3 (aviso de segurança) | planejado | 1.1 (ADR-006) |
| `store.ts` concentra o estado do Escritor | planejado | 1.0-d/1.1 (dividir ao virar módulo Writer) |
| Links `[[Título]]` dependem do título | planejado | 1.0-e/1.1 (resolver para id) |
| SVG servido na origem do app | planejado | 1.1 |
| Aviso antes de abrir anexos executáveis | planejado | 1.1 |
| Menu de aplicativo no macOS | planejado | porte (ADR-007) |

## Depois da 1.0
Ver `ROADMAP.md`: Knowledge (1.1), Life (1.2), Create (1.3), Connect (1.4), lançamento comercial (2.0 provisório).
Pendências do produto: regra de acerto e Resiliência do sistema COGITO (perguntadas ao dono do produto); gerador de
personagens e criaturas a partir do sistema de regras (relatório entregue em 2026-11-18).
