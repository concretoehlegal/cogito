# Módulos

O COGITO é uma ferramenta **generalista** (ADR-014). Quatro pilares formam o app; o RPG vira uma **extensão à parte**
(ADR-016). Estado: **existente** (já no app), **planejado** (com versão prevista). Nada planejado aparece como botão
ativo no app.

## Os quatro pilares
| Pilar | Nome no código | Estado | Versão | Base no código atual |
| --- | --- | --- | --- | --- |
| Escrita | `writer` | existente (Escritor) | 1.0 como módulo; evolui na 1.1 | `src/components`, `src/editor`, `src/export`, `store.ts`, `model.ts` |
| Quadro e Memórias | `board` | planejado | 1.1 | quadro infinito do Planejador (`src/planner/Canvas.tsx`, `links.ts`, `lib/guides.ts`), links `[[…]]` e "citado por" |
| Finanças | `finance` | planejado | 1.2, após especificação própria | — |
| Editor de imagens e criação | `studio` | planejado | 1.3, após especificação própria | — |

## Extensões
| Extensão | Estado | Versão | Base no código atual |
| --- | --- | --- | --- |
| RPG (Planejador de campanhas) | existente | 1.0-d vira extensão desligável | `src/planner`, `src/game`, `electron/planner.cjs` |

O **Bestiário** (combate em turnos) foi removido na 1.0 (ADR-015).

## Escrita
Hoje: livros paginados (A4/A3, 1–2 colunas, papel), capítulos/seções/páginas, sumário editável, tabelas com fórmulas,
formas, imagens com contorno e posição livre, blocos de RPG, corretor pt-BR offline, busca no livro, biblioteca de PDFs,
anexos, exportação PDF e DOCX, backups. Alvo: editor geral de documentos (estilos, cabeçalhos e rodapés, notas de
rodapé, contagem de palavras, busca e substituição, modo sem distrações, modelos, histórico, DOCX ida e volta, Markdown,
EPUB, referências a objetos). Os blocos de RPG passam a ser oferecidos pela extensão RPG.

## Quadro e Memórias
Um só pilar com duas vistas sobre a mesma base: o **quadro negro** (quadro infinito com cartões, setas, molduras,
textos e imagens, no espírito do Miro) e o **banco de memórias** (notas em Markdown com links `[[…]]`, "citado por",
etiquetas e busca, no espírito do Obsidian). Uma nota pode virar cartão no quadro, e o que está no quadro é nota com
links. Cada nota é um arquivo legível na pasta do usuário. Base: o quadro do Planejador, generalizado (sem fichas de RPG).

## Finanças
Controle de finanças pessoais: contas, lançamentos, categorias, orçamento e relatórios, tudo local. Dados privados,
isolados de ambientes compartilhados por padrão; sem Open Finance, conexões bancárias, operações reais, recomendações
de ativos ou cotações pagas; nada aparece na página Início sem consentimento explícito. Escopo fechado numa
especificação própria antes de começar.

## Editor de imagens e criação
Edição de fotos e criação gráfica no espírito do Affinity: camadas, ajustes (exposição, curvas, cor), seleção e
máscara, recorte, formas e texto, exportação PNG/JPG/WEBP, arquivo próprio com as camadas. É o pilar maior e mais
arriscado (desempenho com imagens grandes, memória, GPU), e começa por uma especificação e uma prova técnica
(Canvas 2D × WebGL) antes de qualquer tela.

## RPG (extensão)
Hoje: campanhas com quadro infinito, fichas e cartas, sistema de regras editável com 7 modelos (COGITO, D&D 5e, Call
of Cthulhu, Ordem Paranormal, Daggerheart, Pathfinder 2e, em branco). Alvo: extensão separada do app (ADR-016), que
usa o quadro do pilar Quadro e Memórias e o registro de objetos do Core em vez de duplicá-los. Quem já tem campanhas
continua com acesso a elas.

## Fora dos pilares
Planilhas (Sheets) e Projetos/tarefas saíram das versões planejadas; ficam como ideias para depois dos quatro pilares,
sem versão (ADR-014). Utilitários (anotações rápidas, calculadora, calendário, cronômetro, conversor de unidades,
seletor de cores) idem.

## Regras comuns
Tudo local, arquivos do usuário, referências por id, sem dependência entre módulos ou extensões (só pelo Core).
