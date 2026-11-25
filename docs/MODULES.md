# Módulos

Estado: **existente** (já no app), **planejado** (com versão prevista). Nada planejado aparece como botão ativo no app.

| Módulo | Estado | Versão | Base no código atual |
| --- | --- | --- | --- |
| Writer | existente (Escritor) | 1.0 como módulo; evolui na 1.1 | `src/components`, `src/editor`, `src/export`, `store.ts`, `model.ts` |
| RPG (opcional) | existente (Planejador + Bestiário) | 1.0 como módulo | `src/planner`, `src/hunt`, `src/game`, `electron/planner.cjs` |
| Canvas | planejado | 1.1 | quadro infinito do Planejador (`src/planner/Canvas.tsx`, `links.ts`, `lib/guides.ts`) |
| Vault | planejado | 1.1 | notas Markdown, `[[links]]`, "citado por", campos tipados do sistema de regras |
| Projects | planejado | 1.2 | — (avaliar estrutura das campanhas) |
| Suas Finanças | planejado | 1.2, após especificação própria | — |
| Sheets | planejado | 1.3 | fórmulas de tabela (`src/lib/formula.ts`) |
| Studio | planejado | 1.3 | — |

## Writer
Hoje: livros paginados (A4/A3, 1–2 colunas, papel), capítulos/seções/páginas, sumário editável, tabelas com fórmulas,
formas, imagens com contorno e posição livre, blocos de RPG, corretor pt-BR offline, busca no livro, biblioteca de PDFs,
anexos, exportação PDF e DOCX, backups. Alvo: editor universal de documentos (estilos, cabeçalhos e rodapés, notas de
rodapé, contagem de palavras, busca e substituição, modo sem distrações, modelos, histórico, DOCX ida e volta, Markdown,
EPUB, referências a objetos). Os blocos de RPG passam a ser oferecidos pelo módulo RPG.

## RPG
Hoje: campanhas com quadro infinito, fichas e cartas, sistema de regras editável com 7 modelos, Bestiário com combate em
turnos e IA. Alvo: módulo opcional (liga/desliga nas Configurações), sem dominar a identidade visual; o quadro genérico
vira o Canvas e as notas viram registros do Vault, com o RPG usando esses serviços em vez de duplicá-los.

## Canvas · Vault · Projects · Suas Finanças · Sheets · Studio
Escopos detalhados na diretriz do projeto Genesis e em `ROADMAP.md`. Regras comuns: tudo local, arquivos do usuário,
referências por id, sem dependência entre módulos (só pelo Core). Suas Finanças: dados privados, isolados de
ambientes compartilhados por padrão; sem Open Finance, conexões bancárias, operações reais, recomendações de ativos ou
cotações pagas; nada aparece na página Início sem consentimento explícito.

## Utilitários (espaço reservado, versões futuras)
Anotações rápidas, calculadora, calendário, leitor de PDF (já existe no Writer), cronômetro, temporizador de foco,
conversor de unidades, seletor de cores, biblioteca de modelos.
