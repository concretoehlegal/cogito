# Visão do produto — COGITO (projeto Genesis)

## O que o COGITO quer ser
Um ecossistema desktop de criatividade, conhecimento, produtividade e organização da vida pessoal e profissional, em que
documentos, planilhas, quadros, bases de conhecimento, projetos e finanças **se relacionam**, em vez de serem editores
isolados. Nasceu como app de RPG (Escritor, Planejador de campanhas, Bestiário); o RPG continua como módulo opcional.

## Diretrizes oficiais
| Item | Definição |
| --- | --- |
| Nome | COGITO |
| Codinome | Genesis |
| Plataforma | Desktop. **Hoje: Windows** (macOS e Linux depois — ADR-007) |
| Idioma e mercado iniciais | Português brasileiro · Brasil |
| Identidade visual | Minimalista, moderna, sofisticada (ver `DESIGN_SYSTEM.md`) |
| Arquitetura | Modular, local first, incremental |
| Cadastro | Obrigatório (a partir da versão 1.4 — Connect) |
| Modelo comercial | Freemium: Free, PRO e Teams, sem publicidade |

## Princípios
1. Os arquivos pertencem ao usuário.
2. O app funciona offline depois da autenticação inicial.
3. A criatividade não depende de assinatura.
4. Serviços remotos só para os planos que os financiam (exceto a autenticação essencial).
5. Cancelar uma assinatura nunca faz perder arquivos locais.
6. Privacidade, segurança, desempenho e estabilidade vêm antes de novidades.
7. A interface favorece o conteúdo, não compete com ele.
8. Todas as ferramentas compartilham uma infraestrutura central (o Core).

## Planos (preços preliminares, configuráveis — ver `MONETIZATION.md`)
- **Free** (R$ 0): todas as ferramentas locais, sem limite artificial de documentos, importação/exportação, backups
  locais, offline. Sem nuvem, sincronização, IA por API, colaboração ou publicação hospedada.
- **PRO** (R$ 24,90/mês ou R$ 249,90/ano): tudo do Free + nuvem (50 GB), sincronização, backups remotos, histórico
  ampliado, IA com franquia, automações, compartilhamento e publicação, suporte prioritário.
- **Teams** (R$ 39,90/usuário/mês ou R$ 399,90/ano): tudo do PRO + ambientes compartilhados, colaboração em tempo real,
  administração, permissões, comentários e menções. Só depois de validar a infraestrutura colaborativa.

## Módulos (ver `MODULES.md`)
Writer · Sheets · Studio · Canvas · Vault · Projects · Suas Finanças · RPG (opcional).

## O que não fazer
Copiar interfaces, marcas ou implementações de outros produtos; prometer compatibilidade (Excel, Word) sem testes que a
comprovem; apresentar recurso simulado como pronto; mandar dados do usuário para fora sem necessidade e consentimento.
