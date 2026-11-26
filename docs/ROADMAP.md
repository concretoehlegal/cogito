# Roadmap

Numeração (ADR-002): o Genesis começa na **1.0**. Desenvolvimento só para **Windows** por enquanto (ADR-007).
O estado detalhado de cada item fica em `BACKLOG.md`.

| Versão | Marco | Objetivo |
| --- | --- | --- |
| 0.17.0 | (publicada) | Último app "de RPG": Escritor, Planejador, Bestiário, sistema de regras editável |
| **1.0** | **Foundation** | Infraestrutura do novo COGITO |
| 1.1 | Knowledge | Escrita (editor geral de documentos), Quadro e Memórias, referências internas, busca universal |
| 1.2 | Life | Finanças (após especificação própria) |
| 1.3 | Create | Editor de imagens e criação (após especificação e prova técnica), integração entre os pilares |
| 1.4 | Connect | Conta em produção, assinatura PRO, pagamentos, nuvem, sincronização, backups remotos, franquias, loja de extensões |
| 2.0 (provisório) | Lançamento comercial | Estabilidade, desempenho, segurança, documentação, instaladores, atualizações |
| depois | Expansão | Teams, colaboração em tempo real, administração, IA avançada, extensões, macOS/Linux, mobile |

## 1.0 — Foundation (em andamento)
Entregas pequenas e verificáveis, nesta ordem:

| Etapa | Entrega |
| --- | --- |
| 1.0-a | Documentação permanente; testes de interface no repositório e no CI; linter |
| 1.0-b | Design System: tokens neutros (claro/escuro), componentes base; RPG e Natal isolados nos seus módulos |
| 1.0-c | Shell nova: barra superior com abas, barra lateral, painel direito recolhível, barra de status |
| 1.0-d | Registro de módulos e extensões: Escrita como módulo, RPG como primeira extensão (sob demanda, liga/desliga) |
| 1.0-e | Registro de objetos e serviço de arquivos (recentes, favoritos, renomear, duplicar, lixeira, `cogito://obj/<id>`) |
| 1.0-f | Configurações no Core (arquivo próprio, migradas do localStorage); interfaces de Conta e Planos, só locais |
| 1.0-g | Página Início; regressão completa; versão 1.0.0 |

### Critérios de conclusão da 1.0
- Documentação permanente e `CLAUDE.md` em dia.
- Testes de interface versionados e rodando no CI, além dos de unidade.
- Shell nova operável pelo teclado, nos temas claro e escuro.
- Escrita como módulo e RPG como extensão; o RPG pode ser desligado sem afetar o resto.
- Bestiário removido sem perder dados (ADR-015).
- Todas as funções da 0.17 preservadas, exceto o Bestiário (regressão completa passando).
- Registro de objetos com ids estáveis cobrindo livros e campanhas, com recentes, favoritos, lixeira e restauração.
- Nenhum arquivo do usuário movido ou com formato alterado; cópia de segurança feita e verificada antes da primeira abertura.
- JS inicial menor que o da 0.17, com módulos carregados ao abrir.
- App abrindo e funcionando offline no Windows.
- Nenhuma função indisponível aparece como botão ativo.
