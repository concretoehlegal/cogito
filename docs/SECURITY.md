# Segurança e privacidade

Segurança desde a arquitetura. Este documento não declara conformidade com a LGPD: isso exige avaliação jurídica
especializada; ele registra como o app trata dados e o que falta.

## O que já existe (0.17)
- **Janela:** `contextIsolation`, `sandbox`, `nodeIntegration: false`; a interface só fala com o sistema por
  `window.cogito` (preload), via `ipcRenderer.invoke`.
- **Rede:** todo pedido que não seja `cogito://` (ou o servidor de desenvolvimento) é cancelado no processo principal.
  O dicionário ortográfico nunca é baixado da internet.
- **Conteúdo:** CSP restritiva no `index.html` (`default-src 'self'`, sem `unsafe-eval`, `object-src 'none'`);
  janelas novas negadas; navegação para fora da origem do app bloqueada; permissões (câmera, microfone…) negadas.
- **Arquivos:** ids validados por expressão regular; nomes reduzidos a `basename`; caminhos do protocolo conferidos
  contra a pasta de origem; exportação só para caminhos escolhidos num diálogo nativo; gravação atômica com `.bak`,
  backups e cópia de recuperação.

## Riscos conhecidos (auditoria 2026-11-25)
| Risco | Gravidade | Plano |
| --- | --- | --- |
| `@tiptap/core` ≤ 3.30.3 (`mergeAttributes` e `__proto__`) | moderada; relevante ao importar documentos de terceiros | TipTap 3 na 1.1, antes de importar DOCX/Markdown (ADR-006) |
| `minimatch` (DoS) via electron-builder | baixa; só na ferramenta de empacotamento | atualizar quando o electron-builder corrigir |
| SVG de livros servido na mesma origem do app | baixa (só imagens do próprio usuário; navegação direta não ocorre pela interface) | servir SVG com CSP própria ou convertido; bloquear navegação para `__img`/`__ref` |
| Anexos de "todos os arquivos" abertos pelo programa padrão | baixa (ação do usuário) | aviso antes de abrir executáveis e scripts |
| Preferências em `localStorage` | baixa | arquivo de configurações (1.0-f) |

## Regras para o que vem
- **Credenciais (1.4):** tokens só no armazenamento seguro do sistema (`safeStorage` do Electron: DPAPI no Windows);
  nunca senha nem token em texto puro; nada sensível em logs.
- **Serviços pagos:** toda autorização validada também no servidor; o plano Free não dispara chamadas pagas em segundo plano.
- **Importação:** documentos importados (DOCX, Markdown, CSV, OFX) passam por validação e sanitização antes de entrar no editor.
- **Finanças:** dados privados, isolados de ambientes compartilhados, fora da página Início sem consentimento.
- **Dados pessoais:** mínimo necessário no servidor; exportação e exclusão de dados pessoais previstas na 1.4.
- **Dependências:** `npm audit` antes de cada versão; licença verificada antes de adicionar qualquer pacote.
- **Atualizações do app:** quando houver atualização automática, só pacotes assinados e verificados.
