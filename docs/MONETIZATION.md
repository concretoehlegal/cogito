# Monetização e permissões por plano

Modelo freemium com três planos e nenhuma publicidade. **Preços e franquias são hipóteses preliminares** e devem viver
em configuração, nunca espalhados pelo código.

| Plano | Preço preliminar | Princípio |
| --- | --- | --- |
| Free | R$ 0 | Tudo que roda no dispositivo; sem consumo de infraestrutura remota paga (exceto autenticação essencial) |
| PRO | R$ 24,90/mês · R$ 249,90/ano | Free + nuvem (50 GB), sincronização, backups remotos, histórico ampliado, IA com franquia, automações, compartilhamento, publicação, suporte prioritário |
| Teams | R$ 39,90/usuário/mês · R$ 399,90/ano | PRO + ambientes compartilhados, colaboração em tempo real, administração, permissões, comentários, menções, biblioteca institucional, ~100 GB por licença — só após validar a infraestrutura colaborativa |

## Arquitetura de permissões (entitlements)
Um único serviço no Core decide o que cada conta pode usar; módulos perguntam ao serviço, nunca ao plano diretamente.

```ts
type Plan = 'free' | 'pro' | 'teams';
interface Entitlements {
  plan: Plan; status: 'ativa' | 'em-atraso' | 'cancelada' | 'local';
  features: Record<string, boolean>;          // ex.: 'cloud.sync', 'ai.assist', 'share.publish'
  limits: Record<string, number>;             // ex.: 'cloud.bytes', 'ai.requests.month'
  usage?: Record<string, number>;
}
can(feature: string): boolean; remaining(limit: string): number;
```
- Definição dos planos num arquivo de configuração (`src/core/plans.ts` ou JSON), não em condicionais pelo código.
- **Validação no servidor** para tudo que for pago; a interface só esconde ou mostra.
- Recursos locais nunca dependem de permissão de plano. Nenhum limite artificial de documentos locais.

## Cancelamento
- Todos os arquivos locais continuam abrindo e editando.
- Serviços remotos param ao fim do período pago; dados remotos ficam disponíveis para baixar por um prazo informado.
- Documentos que usam recurso PRO continuam abrindo; só a parte remota (ex.: sincronização) fica indisponível.

## Estado
1.0: só a interface `Entitlements` local, com o plano Free definido em configuração e nenhuma chamada de rede.
1.4 (Connect): conta, pagamentos, nuvem e validação no servidor (provedores a decidir — ADR-012).
