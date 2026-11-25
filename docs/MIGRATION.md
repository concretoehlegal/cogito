# Migração

Objetivo: nenhum usuário perde dados ao atualizar. Vale para qualquer mudança de formato, pasta ou estrutura.

## Regras gerais
1. **Copiar antes de mudar.** Antes de qualquer migração que altere arquivos, cópia de segurança verificada.
2. **Nunca mover nem apagar arquivos do usuário sem aprovação** (ADR-004). Lixeira em vez de exclusão.
3. **Leitura tolerante, gravação no formato novo só ao salvar.** O `.bak` continua guardando a versão anterior.
4. **Volta atrás:** enquanto possível, a versão anterior do app deve continuar abrindo os dados.
5. **Testes:** toda migração tem teste de unidade com um arquivo no formato antigo (ex.: `tests/system.test.ts` para o
   formato de ficha da 0.16 → 0.17).

## 0.17 → 1.0 (Foundation)
| Item | O que muda | Risco | Como |
| --- | --- | --- | --- |
| `livro.json`, `plano.json` | **nada** | nenhum | formatos e pastas iguais (ADR-004) |
| Registro de objetos | arquivo novo `.cogito/indice.json` | baixo | criado varrendo as pastas; pode ser apagado e refeito |
| Favoritos e recentes | arquivo novo `.cogito/estado.json` | baixo | começa vazio |
| Preferências | `localStorage` → arquivo de configurações | baixo | na primeira abertura, lê o `localStorage` e grava o arquivo; o `localStorage` não é apagado |
| Cópia de segurança | `Documentos/COGITO-copia-antes-da-1.0-<data>/` | espaço em disco | cópia completa na primeira abertura da 1.0, com conferência de tamanho e quantidade de arquivos e aviso se faltar espaço; o usuário pode apagá-la depois |
| Tela inicial | substituída pela shell nova | nenhum para dados | só interface |

Volta atrás: como os formatos não mudam, a 0.17 continua abrindo os mesmos livros e campanhas; os arquivos novos
(`.cogito/`) são ignorados por ela.

## Mudanças futuras previstas
- **1.1:** TipTap 2 → 3 (ADR-006). O JSON dos documentos é ProseMirror nos dois; validar com testes de ida e volta
  sobre livros reais antes de liberar.
- **1.1+:** documentos do Writer fora do formato "livro" (documento simples) — novo tipo, sem converter os livros.
- **Mudança de pasta** (espaço de trabalho): só com ferramenta própria, cópia de segurança e aprovação.
