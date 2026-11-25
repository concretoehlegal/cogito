# Design System

Objetivo: aparência minimalista, madura e profissional, com o conteúdo em primeiro plano. Referências conceituais: a
sobriedade de editores de conhecimento e a consistência de apps desktop profissionais — sem copiar interfaces.

## Situação atual (auditoria 0.17)
- Já existem tokens CSS em `src/styles/app.css` (`--bg`, `--card`, `--card-2`, `--raised`, `--field`, `--border`,
  `--border-strong`, `--text`, `--muted`, `--faint`, `--brand*`, `--accent*`, `--lime*`, `--danger*`, `--ok`, `--warn`,
  `--shadow`, `--lift`, `--radius`, famílias `--f-*`), com tema claro e escuro.
- Problemas: cores escritas direto no CSS (≈ 51 em `app.css`, 155 em `planner.css`, 169 em `hunt.css`, 67 em
  `game.css`); raios variados (6 a 12 px sem escala); a cor de destaque verde-limão e a estética noir/RPG e de Natal
  estão no CSS principal.

## Princípios
- Cores neutras predominam; **um** destaque, usado com moderação (seleção, foco, ação principal).
- Temas claro e escuro com contraste adequado (meta: WCAG AA para texto).
- Tipografia legível: **Inter** na interface; fontes de conteúdo escolhidas pelo usuário no documento.
- Ícones de linha consistentes (lucide) na interface; ícones ilustrados só dentro dos módulos que precisam (RPG).
- Bordas discretas, raios pequenos e uniformes, sombras leves, animações curtas e funcionais.
- Estados sempre previstos: foco visível, desabilitado, carregando, erro, vazio.
- Evitar: gradientes e vidro exagerados, excesso de cartões, raios grandes, emojis como ícones, estética gamer/medieval
  na interface principal, menus complexos.

## Implementado na 1.0-b
- `src/design/tokens.css`: superfícies, linhas, texto, destaque (`--accent`, `--accent-fill` para a ação principal),
  estados, espaçamento, raios, tipografia, elevação e movimento, nos temas claro e escuro.
- Os nomes antigos (`--bg`, `--card`, `--brand`…) viraram apelidos dos tokens novos em `src/styles/app.css`.
- Escopo de módulo: `:root[data-module='rpg']` redefine só o destaque (verde-limão e brilho); o atributo é ligado pela
  interface quando o Planejador ou o Bestiário estão abertos (`src/App.tsx`).
- `src/design/components.css`: botões, botões de ícone, links, caixas de marcação e seletores, com raios da escala e
  fundo liso (sem degradê).
- `src/design/seasonal.css`: enfeites de Natal fora do CSS principal; modo automático pela época (15/11 a 6/1),
  sempre ou desligados (`src/lib/season.ts`).
- Destaque da interface principal: azul-lavanda (ADR-013).

## Tokens (`src/design/tokens.css`)
| Grupo | Tokens |
| --- | --- |
| Superfícies | `--surface-0` (fundo da janela), `--surface-1` (painéis), `--surface-2` (elevado), `--surface-field` |
| Texto | `--text-1` (principal), `--text-2` (secundário), `--text-3` (apagado), `--text-on-accent` |
| Linhas | `--line-1` (discreta), `--line-2` (forte) |
| Destaque | `--accent`, `--accent-hover`, `--accent-soft`, `--focus-ring` |
| Estados | `--ok`, `--warn`, `--danger` (+ `-soft`) |
| Espaçamento | escala de 4 px: `--space-1` (4) … `--space-8` (32) |
| Raios | `--radius-s` (4), `--radius-m` (6), `--radius-l` (8) |
| Tipografia | `--font-ui`, `--font-mono`; tamanhos `--text-xs` (11) … `--text-xl` (20) |
| Elevação | `--shadow-1`, `--shadow-2` |
| Movimento | `--ease`, `--dur-fast` (120 ms), `--dur` (180 ms); `prefers-reduced-motion` respeitado |

Os tokens atuais (`--bg`, `--card`…) continuam existindo como apelidos durante a transição, para não quebrar telas.
Cores próprias de módulo (RPG, Suas Finanças) ficam em tokens com prefixo do módulo, no CSS do módulo.

## Componentes base (consolidar os existentes em `src/design`)
Botão (primário, padrão, fantasma, perigo), botão de ícone, campo, seleção, caixa de marcação, controle segmentado,
abas, menu, diálogo (`Modal` atual), aviso (toast atual), dica, painel redimensionável (`ResizeHandle` atual), lista,
estado vazio, indicador de carregamento, seletor de ícones (`IconPicker`).

## Estrutura da janela (1.0-c)
Barra superior (marca, abas abertas, navegação, busca universal, ações, controles da janela) · barra lateral esquerda
(Início, Arquivos, Recentes, Favoritos, Lixeira; ferramentas; Configurações, Perfil, Plano, Ajuda) · área central ·
painel direito contextual recolhível · barra de status (salvamento, offline/online, informações do módulo).
