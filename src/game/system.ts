/*
 * Sistema de regras de uma campanha: tudo o que a ficha tem (números, barras, textos, listas), o nome e o ícone de
 * cada coisa e como o Bestiário resolve um ataque. Cada campanha guarda o seu, começando de um modelo pronto
 * (COGITO, D&D 5e, Call of Cthulhu, Ordem Paranormal, Daggerheart, Pathfinder 2e ou em branco) que pode ser
 * mudado à vontade. As fichas guardam só os valores, ligados pelo id de cada campo.
 */
import type { CardType, NodeType, Plan, Sheet } from './types.ts';

export type StatKind = 'barra' | 'numero' | 'texto';
/** O que o número significa para o Bestiário. */
export type StatRole = '' | 'vida' | 'defesa' | 'recurso' | 'armadura' | 'acoes' | 'movimento';
export type Who = 'personagem' | 'npc' | 'inimigo';
export const WHO: Who[] = ['personagem', 'npc', 'inimigo'];

export interface StatDef {
  id: string; name: string; short: string; icon: string; kind: StatKind; role: StatRole;
  /** Fichas que têm este campo. */
  who: Who[];
  /** Aparece na carta do quadro e do Bestiário. */
  card: boolean;
  /** Valor inicial nas fichas novas (para criaturas, defEnemy quando houver). */
  def: string; defEnemy?: string;
}
export interface ListItemDef { k: string; icon: string }
export interface ListDef { id: string; name: string; icon: string; who: Who[]; card: boolean; items: ListItemDef[] }
export interface ListValue { k: string; v: string; icon?: string }

export type HitMode = 'contra-defesa' | 'percentual' | 'automatico';
export type CritMode = 'max' | 'dez' | 'iguais' | 'extremo' | 'nenhum';
export interface CombatRules {
  /** contra-defesa: a rolagem de acerto precisa alcançar a defesa; percentual: d100 até o valor de acerto; automatico: sempre acerta. */
  hit: HitMode;
  /** max: resultado máximo do primeiro dado; dez: superar a defesa por 10 (ou 20 natural); iguais: os dois primeiros dados iguais; extremo: até 1/5 do valor (percentual). */
  crit: CritMode;
  /** A armadura do alvo desconta do dano. */
  armor: boolean;
  /** Rolagem de acerto das ações novas. */
  defaultHit: string;
}
export interface Labels {
  personagem: string; npc: string; inimigo: string; chefe: string;
  ataques: string; habilidades: string; acerto: string; dano: string; origem: string;
}
export interface CardTypeLabel { label: string; plural: string; icon: string }

export interface RuleSystem {
  /** Modelo de origem (o nome pode mudar). */
  base: string;
  name: string; icon: string;
  stats: StatDef[];
  lists: ListDef[];
  labels: Labels;
  cardTypes: Record<CardType, CardTypeLabel>;
  combat: CombatRules;
}

/* ───────────── construção dos modelos ───────────── */

const ALL: Who[] = ['personagem', 'npc', 'inimigo'];
const PEOPLE: Who[] = ['personagem', 'npc'];
const ENEMY: Who[] = ['inimigo'];
const st = (id: string, name: string, short: string, icon: string, kind: StatKind, role: StatRole, who: Who[], card: boolean, def: string, defEnemy?: string): StatDef =>
  ({ id, name, short, icon, kind, role, who, card, def, ...(defEnemy !== undefined ? { defEnemy } : {}) });
const txt = (id: string, name: string, icon = 'pergaminho', who: Who[] = PEOPLE, def = ''): StatDef => st(id, name, name, icon, 'texto', '', who, false, def);
const list = (id: string, name: string, icon: string, who: Who[], card: boolean, items: string[], icons: Record<string, string> = {}): ListDef =>
  ({ id, name, icon, who, card, items: items.map((k) => ({ k, icon: icons[k] ?? '' })) });
const cards = (item: [string, string, string], hab: [string, string, string], fei: [string, string, string]): Record<CardType, CardTypeLabel> => ({
  item: { label: item[0], plural: item[1], icon: item[2] }, habilidade: { label: hab[0], plural: hab[1], icon: hab[2] }, feitico: { label: fei[0], plural: fei[1], icon: fei[2] },
});
const LABELS: Labels = { personagem: 'Personagem', npc: 'NPC', inimigo: 'Inimigo', chefe: 'Chefe', ataques: 'Ataques', habilidades: 'Habilidades', acerto: 'Acerto', dano: 'Dano', origem: 'Habilidades de Origem' };

export const PRESETS: { id: string; name: string; hint: string; make: () => RuleSystem }[] = [
  {
    id: 'cogito', name: 'COGITO', hint: 'Vitalidade, Resiliência, Defesa, Alma, Atributos e Capacidades',
    make: () => ({
      base: 'cogito', name: 'COGITO', icon: 'olho',
      stats: [
        st('vida', 'Vitalidade', 'PV', 'sangue', 'barra', 'vida', ALL, true, '20', '12'),
        st('resiliencia', 'Resiliência', 'RES', 'resiliencia', 'numero', '', ALL, true, '0'),
        st('defesa', 'Defesa', 'DEF', 'alvo', 'numero', 'defesa', ALL, true, '12', '11'),
        st('alma', 'Alma', 'PA', 'fantasma', 'barra', 'recurso', PEOPLE, true, '3'),
        st('acoes', 'Ações de combate', 'AC', 'raio', 'numero', 'acoes', PEOPLE, false, '1'),
        st('movimento', 'Ações de movimento', 'MOV', 'relogio', 'numero', 'movimento', PEOPLE, false, '0'),
        txt('origem', 'Origem', 'sigilo'), txt('nivel', 'Nível', 'estrela'), txt('filiacao', 'Filiação', 'distintivo'), txt('cliche', 'Clichê', 'balao'),
      ],
      lists: [
        list('atributos', 'Atributos', 'estrela', PEOPLE, true, ['Agilidade', 'Bravura', 'Potência', 'Inteligência']),
        list('capacidades', 'Capacidades', 'olho', PEOPLE, true, ['Briga', 'Cabeça', 'Cardio', 'Espírito', 'Músculo', 'Papo']),
      ],
      labels: { ...LABELS },
      cardTypes: cards(['Equipamento', 'Equipamentos', 'revolver'], ['Habilidade', 'Habilidades', 'raio'], ['Oculto', 'Ocultos', 'vela']),
      combat: { hit: 'contra-defesa', crit: 'max', armor: false, defaultHit: '1d20+2' },
    }),
  },
  {
    id: 'dnd5e', name: 'D&D 5ª edição', hint: 'PV, CA, seis atributos, perícias, espaços de magia',
    make: () => ({
      base: 'dnd5e', name: 'D&D 5ª edição', icon: 'chifres',
      stats: [
        st('pv', 'Pontos de Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '12', '15'),
        st('ca', 'Classe de Armadura', 'CA', 'escudo', 'numero', 'defesa', ALL, true, '14', '13'),
        st('magia', 'Espaços de Magia', 'EM', 'brilho', 'barra', 'recurso', PEOPLE, true, '2'),
        st('proficiencia', 'Bônus de Proficiência', 'BP', 'estrela', 'numero', '', PEOPLE, false, '+2'),
        st('iniciativa', 'Iniciativa', 'INI', 'raio', 'numero', '', ALL, false, '+2', '+1'),
        st('deslocamento', 'Deslocamento', 'DES', 'relogio', 'numero', '', ALL, false, '9 m'),
        txt('especie', 'Espécie', 'pessoa'), txt('classe', 'Classe', 'escudo'), txt('nivel', 'Nível', 'estrela', PEOPLE, '1'),
        txt('antecedente', 'Antecedente', 'livro'), txt('alinhamento', 'Alinhamento', 'balao'),
        txt('nd', 'Nível de Desafio', 'caveira', ENEMY, '1'), txt('tipo', 'Tipo e tamanho', 'garra', ENEMY, 'Monstruosidade média'),
      ],
      lists: [
        list('atributos', 'Atributos', 'estrela', ALL, true, ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']),
        list('salvaguardas', 'Testes de Resistência', 'escudo', PEOPLE, false, ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']),
        list('pericias', 'Perícias', 'olho', PEOPLE, false, ['Acrobacia', 'Arcanismo', 'Atletismo', 'Atuação', 'Enganação', 'Furtividade', 'História', 'Intimidação', 'Intuição', 'Investigação', 'Lidar com Animais', 'Medicina', 'Natureza', 'Percepção', 'Persuasão', 'Prestidigitação', 'Religião', 'Sobrevivência']),
      ],
      labels: { personagem: 'Personagem', npc: 'NPC', inimigo: 'Monstro', chefe: 'Lendário', ataques: 'Ataques', habilidades: 'Ações', acerto: 'Ataque', dano: 'Dano', origem: 'Traços' },
      cardTypes: cards(['Equipamento', 'Equipamentos', 'faca'], ['Característica', 'Características', 'estrela'], ['Magia', 'Magias', 'brilho']),
      combat: { hit: 'contra-defesa', crit: 'max', armor: false, defaultHit: '1d20+5' },
    }),
  },
  {
    id: 'coc7', name: 'Call of Cthulhu 7ª ed.', hint: 'PV, Sanidade, Pontos de Magia, características e perícias em porcentagem',
    make: () => ({
      base: 'coc7', name: 'Call of Cthulhu 7ª edição', icon: 'tentaculo',
      stats: [
        st('pv', 'Pontos de Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '11', '15'),
        st('sanidade', 'Sanidade', 'SAN', 'cerebro', 'barra', '', PEOPLE, true, '55'),
        st('pm', 'Pontos de Magia', 'PM', 'brilho', 'barra', 'recurso', ALL, true, '11', '10'),
        st('armadura', 'Armadura', 'ARM', 'armadura', 'numero', 'armadura', ALL, true, '0'),
        st('sorte', 'Sorte', 'SOR', 'dado', 'numero', '', PEOPLE, false, '50'),
        st('movimento', 'Movimento', 'MOV', 'relogio', 'numero', '', ALL, false, '8'),
        txt('ocupacao', 'Ocupação', 'maleta'), txt('idade', 'Idade', 'relogio'), txt('residencia', 'Residência', 'mapa'),
      ],
      lists: [
        list('caracteristicas', 'Características', 'estrela', ALL, true, ['Força', 'Constituição', 'Tamanho', 'Destreza', 'Aparência', 'Inteligência', 'Poder', 'Educação']),
        list('pericias', 'Perícias', 'olho', PEOPLE, false, ['Armas de Fogo (Revólveres)', 'Biblioteca', 'Charme', 'Encontrar', 'Escutar', 'Esquivar', 'Furtividade', 'Intimidação', 'Lábia', 'Lutar (Briga)', 'Mitos de Cthulhu', 'Ocultismo', 'Persuasão', 'Primeiros Socorros', 'Psicologia', 'Rastrear']),
      ],
      labels: { personagem: 'Investigador', npc: 'NPC', inimigo: 'Criatura', chefe: 'Horror', ataques: 'Ataques', habilidades: 'Ataques', acerto: 'Chance (%)', dano: 'Dano', origem: 'Talentos da Ocupação' },
      cardTypes: cards(['Equipamento', 'Equipamentos', 'lanterna'], ['Talento', 'Talentos', 'estrela'], ['Feitiço', 'Feitiços', 'vela']),
      combat: { hit: 'percentual', crit: 'extremo', armor: true, defaultHit: '50' },
    }),
  },
  {
    id: 'ordem', name: 'Ordem Paranormal', hint: 'PV, PE, Sanidade, Defesa, NEX, atributos e perícias',
    make: () => ({
      base: 'ordem', name: 'Ordem Paranormal', icon: 'sigilo',
      stats: [
        st('pv', 'Pontos de Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '20', '30'),
        st('pe', 'Pontos de Esforço', 'PE', 'brilho', 'barra', 'recurso', PEOPLE, true, '3'),
        st('sanidade', 'Sanidade', 'SAN', 'cerebro', 'barra', '', PEOPLE, true, '12'),
        st('defesa', 'Defesa', 'DEF', 'escudo', 'numero', 'defesa', ALL, true, '12', '14'),
        st('rd', 'Resistência a Dano', 'RD', 'armadura', 'numero', 'armadura', ALL, false, '0'),
        st('nex', 'NEX', 'NEX', 'olho', 'numero', '', PEOPLE, false, '5%'),
        st('deslocamento', 'Deslocamento', 'DES', 'relogio', 'numero', '', ALL, false, '9 m'),
        txt('origem', 'Origem', 'sigilo'), txt('classe', 'Classe', 'distintivo'), txt('trilha', 'Trilha', 'mapa'), txt('patente', 'Patente', 'estrela'),
        txt('vd', 'Valor de Desafio', 'caveira', ENEMY, '20'), txt('elemento', 'Elemento', 'fogo', ENEMY, 'Sangue'),
      ],
      lists: [
        list('atributos', 'Atributos', 'estrela', ALL, true, ['Agilidade', 'Força', 'Intelecto', 'Presença', 'Vigor']),
        list('pericias', 'Perícias', 'olho', PEOPLE, false, ['Acrobacia', 'Atletismo', 'Ciências', 'Crime', 'Diplomacia', 'Enganação', 'Fortitude', 'Furtividade', 'Intimidação', 'Intuição', 'Investigação', 'Luta', 'Medicina', 'Ocultismo', 'Percepção', 'Pontaria', 'Reflexos', 'Sobrevivência', 'Tática', 'Vontade']),
      ],
      labels: { personagem: 'Agente', npc: 'NPC', inimigo: 'Ameaça', chefe: 'Ameaça maior', ataques: 'Ataques', habilidades: 'Ações', acerto: 'Teste de ataque', dano: 'Dano', origem: 'Poder de Origem' },
      cardTypes: cards(['Item', 'Itens', 'maleta'], ['Poder', 'Poderes', 'raio'], ['Ritual', 'Rituais', 'sigilo']),
      combat: { hit: 'contra-defesa', crit: 'max', armor: true, defaultHit: '1d20+5' },
    }),
  },
  {
    id: 'daggerheart', name: 'Daggerheart', hint: 'PV, Estresse, Esperança, Evasão, seis atributos e experiências',
    make: () => ({
      base: 'daggerheart', name: 'Daggerheart', icon: 'coracao',
      stats: [
        st('pv', 'Pontos de Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '6', '5'),
        st('estresse', 'Estresse', 'EST', 'panico', 'barra', '', ALL, true, '6', '3'),
        st('esperanca', 'Esperança', 'ESP', 'brilho', 'barra', 'recurso', PEOPLE, true, '2'),
        st('evasao', 'Evasão', 'EVA', 'escudo', 'numero', 'defesa', PEOPLE, true, '10'),
        st('dificuldade', 'Dificuldade', 'DIF', 'alvo', 'numero', 'defesa', ENEMY, true, '12'),
        st('armadura', 'Armadura', 'ARM', 'armadura', 'numero', '', PEOPLE, false, '3'),
        st('limiares', 'Limiares de Dano', 'LIM', 'sangue', 'numero', '', ALL, false, '7 / 14', '8 / 15'),
        txt('ancestralidade', 'Ancestralidade', 'pessoa'), txt('comunidade', 'Comunidade', 'mapa'), txt('classe', 'Classe', 'escudo'),
        txt('subclasse', 'Subclasse', 'estrela'), txt('nivel', 'Nível', 'estrela', PEOPLE, '1'),
        txt('tier', 'Patamar', 'caveira', ENEMY, '1'),
      ],
      lists: [
        list('atributos', 'Atributos', 'estrela', PEOPLE, true, ['Agilidade', 'Força', 'Acuidade', 'Instinto', 'Presença', 'Conhecimento']),
        list('experiencias', 'Experiências', 'livro', ALL, false, []),
      ],
      labels: { personagem: 'Personagem', npc: 'NPC', inimigo: 'Adversário', chefe: 'Solo', ataques: 'Ataques', habilidades: 'Ações', acerto: 'Ataque', dano: 'Dano', origem: 'Recursos de Herança' },
      cardTypes: cards(['Equipamento', 'Equipamentos', 'faca'], ['Habilidade', 'Habilidades', 'raio'], ['Carta de Domínio', 'Cartas de Domínio', 'brilho']),
      combat: { hit: 'contra-defesa', crit: 'iguais', armor: false, defaultHit: '2d12+2' },
    }),
  },
  {
    id: 'pf2e', name: 'Pathfinder 2ª edição', hint: 'PV, CA, Percepção, salvamentos, perícias e pontos de foco',
    make: () => ({
      base: 'pf2e', name: 'Pathfinder 2ª edição', icon: 'coroa',
      stats: [
        st('pv', 'Pontos de Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '20', '20'),
        st('ca', 'Classe de Armadura', 'CA', 'escudo', 'numero', 'defesa', ALL, true, '17', '16'),
        st('foco', 'Pontos de Foco', 'PF', 'brilho', 'barra', 'recurso', PEOPLE, true, '1'),
        st('heroismo', 'Pontos de Heroísmo', 'PH', 'estrela', 'numero', '', PEOPLE, false, '1'),
        st('percepcao', 'Percepção', 'PER', 'olho', 'numero', '', ALL, false, '+5', '+6'),
        st('deslocamento', 'Deslocamento', 'DES', 'relogio', 'numero', '', ALL, false, '7,5 m'),
        txt('ancestralidade', 'Ancestralidade', 'pessoa'), txt('heranca', 'Herança', 'sangue'), txt('antecedente', 'Antecedente', 'livro'),
        txt('classe', 'Classe', 'escudo'), txt('nivel', 'Nível', 'estrela', PEOPLE, '1'), txt('nivelcriatura', 'Nível', 'caveira', ENEMY, '1'),
      ],
      lists: [
        list('atributos', 'Atributos', 'estrela', ALL, true, ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']),
        list('salvamentos', 'Salvamentos', 'escudo', ALL, false, ['Fortitude', 'Reflexos', 'Vontade']),
        list('pericias', 'Perícias', 'olho', PEOPLE, false, ['Acrobatismo', 'Arcanismo', 'Atletismo', 'Diplomacia', 'Dissimulação', 'Furtividade', 'Intimidação', 'Ladroagem', 'Manufatura', 'Medicina', 'Natureza', 'Ocultismo', 'Performance', 'Religião', 'Sociedade', 'Sobrevivência']),
      ],
      labels: { personagem: 'Personagem', npc: 'NPC', inimigo: 'Criatura', chefe: 'Chefe', ataques: 'Golpes', habilidades: 'Golpes', acerto: 'Ataque', dano: 'Dano', origem: 'Talentos de Ancestralidade' },
      cardTypes: cards(['Item', 'Itens', 'maleta'], ['Talento', 'Talentos', 'estrela'], ['Magia', 'Magias', 'brilho']),
      combat: { hit: 'contra-defesa', crit: 'dez', armor: false, defaultHit: '1d20+7' },
    }),
  },
  {
    id: 'generico', name: 'Em branco', hint: 'Só Vida e Defesa, para montar o seu do zero',
    make: () => ({
      base: 'generico', name: 'Meu sistema', icon: 'dado',
      stats: [
        st('vida', 'Vida', 'PV', 'coracao', 'barra', 'vida', ALL, true, '10'),
        st('defesa', 'Defesa', 'DEF', 'escudo', 'numero', 'defesa', ALL, true, '10'),
      ],
      lists: [list('atributos', 'Atributos', 'estrela', ALL, true, [])],
      labels: { ...LABELS, origem: 'Habilidades de origem' },
      cardTypes: cards(['Item', 'Itens', 'maleta'], ['Habilidade', 'Habilidades', 'raio'], ['Magia', 'Magias', 'brilho']),
      combat: { hit: 'contra-defesa', crit: 'max', armor: false, defaultHit: '1d20' },
    }),
  },
];
export const presetById = (id: string) => (PRESETS.find((p) => p.id === id) ?? PRESETS[0]).make();
export const DEFAULT_SYSTEM = () => presetById('cogito');

export const ROLES: { id: StatRole; label: string; hint: string }[] = [
  { id: '', label: 'Só mostrar', hint: 'Aparece na ficha e na carta, sem efeito no Bestiário.' },
  { id: 'vida', label: 'Vida', hint: 'Quando chega a zero, a ficha cai no Bestiário.' },
  { id: 'defesa', label: 'Defesa (alvo do ataque)', hint: 'O número que a rolagem de acerto precisa alcançar.' },
  { id: 'recurso', label: 'Recurso (custo de cartas)', hint: 'Cartas com custo “2 <nome>” gastam deste número.' },
  { id: 'armadura', label: 'Armadura (reduz o dano)', hint: 'Desconta do dano recebido quando o sistema usa armadura.' },
  { id: 'acoes', label: 'Ações por turno', hint: 'Quantas ações de combate o caçador faz por turno.' },
  { id: 'movimento', label: 'Movimento', hint: 'Mostrado no Bestiário ao lado das ações.' },
];
export const KINDS: { id: StatKind; label: string }[] = [{ id: 'barra', label: 'Barra (atual/máx.)' }, { id: 'numero', label: 'Número' }, { id: 'texto', label: 'Texto' }];
export const HIT_MODES: { id: HitMode; label: string; hint: string }[] = [
  { id: 'contra-defesa', label: 'Rolagem contra a defesa', hint: 'Ex.: 1d20+5 contra a CA ou a Defesa do alvo (D&D, Pathfinder, Ordem Paranormal, Daggerheart).' },
  { id: 'percentual', label: 'Porcentagem (d100)', hint: 'O campo de acerto é a chance: rola 1d100 e acerta com resultado igual ou menor (Call of Cthulhu).' },
  { id: 'automatico', label: 'Acerto automático', hint: 'Todo ataque acerta; só o dano é rolado.' },
];
export const CRIT_MODES: { id: CritMode; label: string }[] = [
  { id: 'max', label: 'Resultado máximo do dado (ex.: 20 natural) dobra o dano' },
  { id: 'dez', label: 'Superar a defesa por 10 ou mais (ou 20 natural) dobra o dano' },
  { id: 'iguais', label: 'Os dois primeiros dados iguais dobram o dano' },
  { id: 'extremo', label: 'Até 1/5 da chance (porcentagem) dobra o dano' },
  { id: 'nenhum', label: 'Sem crítico' },
];

/* ───────────── leitura ───────────── */

export const whoOf = (t: NodeType | 'pc' | 'npc' | 'enemy'): Who => (t === 'inimigo' || t === 'enemy' ? 'inimigo' : t === 'npc' ? 'npc' : 'personagem');
export const statsFor = (sys: RuleSystem, t: NodeType | Who) => sys.stats.filter((s) => s.who.includes(whoOf(t as NodeType)));
export const listsFor = (sys: RuleSystem, t: NodeType | Who) => sys.lists.filter((l) => l.who.includes(whoOf(t as NodeType)));
export const roleStat = (sys: RuleSystem, role: StatRole, t: NodeType | Who) => statsFor(sys, t).find((s) => s.role === role) ?? null;
export const defaultOf = (s: StatDef, t: NodeType | Who) => (whoOf(t as NodeType) === 'inimigo' && s.defEnemy !== undefined ? s.defEnemy : s.def);
/** Valor do campo na ficha (ou o inicial do sistema). */
export const valOf = (sheet: Sheet | undefined, s: StatDef, t: NodeType | Who) => sheet?.vals?.[s.id] ?? defaultOf(s, t);
/** Primeiro número de um texto ("16 (+3)" → 16, "CA 15" → 15, "+2" → 2). */
export function numOf(v: string | number | undefined, d = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : d;
  const m = String(v ?? '').replace(',', '.').match(/[-+]?\d+(\.\d+)?/);
  return m ? Math.round(Number(m[0])) : d;
}
export const listOf = (sheet: Sheet | undefined, l: ListDef): ListValue[] => sheet?.lists?.[l.id] ?? l.items.map((i) => ({ k: i.k, v: '', ...(i.icon ? { icon: i.icon } : {}) }));
export const kindLabel = (sys: RuleSystem, t: NodeType, boss?: boolean) => (t === 'inimigo' ? (boss ? sys.labels.chefe : sys.labels.inimigo) : t === 'npc' ? sys.labels.npc : sys.labels.personagem);

/** Ficha nova com os campos e listas do sistema. */
export function blankSheet(sys: RuleSystem, t: NodeType): Sheet {
  const vals: Record<string, string> = {};
  for (const s of statsFor(sys, t)) vals[s.id] = defaultOf(s, t);
  const lists: Record<string, ListValue[]> = {};
  for (const l of listsFor(sys, t)) lists[l.id] = l.items.map((i) => ({ k: i.k, v: '', ...(i.icon ? { icon: i.icon } : {}) }));
  const enemy = t === 'inimigo';
  return { boss: false, vals, lists, actions: [{ name: enemy ? 'Garra' : 'Ataque', hit: sys.combat.defaultHit, dmg: '1d6' }], cards: [], ai: 'agressiva' };
}

/* ───────────── arquivos antigos ───────────── */

/** Completa um sistema vindo de arquivo (campos que faltem voltam ao padrão do modelo). */
export function fixSystem(raw: Partial<RuleSystem> | undefined | null): RuleSystem {
  const base = presetById(raw?.base ?? 'cogito');
  if (!raw) return base;
  const stats = Array.isArray(raw.stats) ? raw.stats.filter((s) => s && s.id).map((s) => ({ ...st(s.id, s.name ?? s.id, s.short ?? '', s.icon ?? 'estrela', s.kind ?? 'numero', s.role ?? '', Array.isArray(s.who) ? s.who : ALL, !!s.card, String(s.def ?? '')), ...(s.defEnemy !== undefined ? { defEnemy: String(s.defEnemy) } : {}) })) : base.stats;
  const lists = Array.isArray(raw.lists) ? raw.lists.filter((l) => l && l.id).map((l) => ({ id: l.id, name: l.name ?? l.id, icon: l.icon ?? 'estrela', who: Array.isArray(l.who) ? l.who : ALL, card: !!l.card, items: Array.isArray(l.items) ? l.items.map((i) => ({ k: String(i?.k ?? ''), icon: String(i?.icon ?? '') })) : [] })) : base.lists;
  return {
    base: raw.base ?? base.base, name: raw.name ?? base.name, icon: raw.icon ?? base.icon, stats, lists,
    labels: { ...base.labels, ...(raw.labels ?? {}) },
    cardTypes: { item: { ...base.cardTypes.item, ...(raw.cardTypes?.item ?? {}) }, habilidade: { ...base.cardTypes.habilidade, ...(raw.cardTypes?.habilidade ?? {}) }, feitico: { ...base.cardTypes.feitico, ...(raw.cardTypes?.feitico ?? {}) } },
    combat: { ...base.combat, ...(raw.combat ?? {}) },
  };
}

type LegacySheet = Sheet & {
  life?: number; defense?: number; resilience?: number; soul?: number; attrs?: { k: string; v: string }[]; caps?: { k: string; v: string }[];
  origin?: string; level?: number; affiliation?: string; cliche?: string; combatActions?: number; moveActions?: number;
};
/** Ficha das versões até a 0.16 (campos fixos do COGITO) → valores ligados aos campos do sistema COGITO. */
export function migrateSheet(sheet: LegacySheet): Sheet {
  if (sheet.vals && sheet.lists) return sheet;
  const vals: Record<string, string> = { ...(sheet.vals ?? {}) };
  const put = (id: string, v: unknown) => { if (v !== undefined && v !== null && v !== '' && vals[id] === undefined) vals[id] = String(v); };
  put('vida', sheet.life); put('defesa', sheet.defense); put('resiliencia', sheet.resilience); put('alma', sheet.soul);
  put('acoes', sheet.combatActions); put('movimento', sheet.moveActions);
  put('origem', sheet.origin); put('nivel', sheet.level); put('filiacao', sheet.affiliation); put('cliche', sheet.cliche);
  const lists: Record<string, ListValue[]> = { ...(sheet.lists ?? {}) };
  if (sheet.attrs && !lists.atributos) lists.atributos = sheet.attrs.map((a) => ({ k: a.k, v: a.v }));
  if (sheet.caps && !lists.capacidades) lists.capacidades = sheet.caps.map((a) => ({ k: a.k, v: a.v }));
  const out: LegacySheet = { ...sheet, vals, lists };
  for (const k of ['life', 'defense', 'resilience', 'soul', 'attrs', 'caps', 'origin', 'level', 'affiliation', 'cliche', 'combatActions', 'moveActions'] as const) delete out[k];
  return out;
}

/** Garante sistema e fichas no formato atual (campanhas antigas viram o sistema COGITO). */
export function normalizePlan(plan: Plan): Plan {
  plan.system = fixSystem(plan.system);
  for (const n of plan.nodes) if (n.sheet) n.sheet = migrateSheet(n.sheet as LegacySheet);
  return plan;
}

/**
 * Troca o sistema de uma campanha (ou grava o sistema editado). Valores com o mesmo id continuam; campos novos recebem
 * o valor inicial nas fichas que ainda não os têm. Listas:
 * - vindo de outro modelo: a lista passa a ter os itens do sistema novo, levando o valor dos itens de mesmo nome;
 *   itens antigos que tinham valor continuam no fim (nada preenchido se perde);
 * - no mesmo sistema: itens acrescentados à definição entram nas fichas que ainda não os têm.
 */
export function applySystem(plan: Plan, sys: RuleSystem) {
  const old = plan.system;
  const switching = !old || old.base !== sys.base;
  const key = (k: string) => k.trim().toLowerCase();
  plan.system = sys;
  for (const n of plan.nodes) {
    if (!n.sheet) continue;
    const vals = n.sheet.vals ?? (n.sheet.vals = {});
    for (const s of statsFor(sys, n.type)) if (vals[s.id] === undefined) vals[s.id] = defaultOf(s, n.type);
    const lists = n.sheet.lists ?? (n.sheet.lists = {});
    for (const l of listsFor(sys, n.type)) {
      const fresh = () => l.items.map((i) => ({ k: i.k, v: '', ...(i.icon ? { icon: i.icon } : {}) }));
      const cur = lists[l.id];
      if (!cur) { lists[l.id] = fresh(); continue; }
      if (switching) {
        const byName = new Map(cur.map((x) => [key(x.k), x]));
        const next = l.items.map((i) => { const was = byName.get(key(i.k)); return { k: i.k, v: was?.v ?? '', ...((was?.icon || i.icon) ? { icon: was?.icon || i.icon } : {}) }; });
        const names = new Set(l.items.map((i) => key(i.k)));
        for (const x of cur) if (x.k && x.v && !names.has(key(x.k))) next.push(x);
        lists[l.id] = next;
      } else {
        const before = new Set((old?.lists.find((x) => x.id === l.id)?.items ?? []).map((i) => key(i.k)));
        const has = new Set(cur.map((x) => key(x.k)));
        for (const i of l.items) if (i.k && !before.has(key(i.k)) && !has.has(key(i.k))) cur.push({ k: i.k, v: '', ...(i.icon ? { icon: i.icon } : {}) });
      }
    }
  }
}

/** Id curto e único para um campo novo. */
export function newId(name: string, taken: string[]): string {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'campo';
  let id = base; let i = 2;
  while (taken.includes(id)) id = `${base}${i++}`;
  return id;
}

/** Linha de apoio sob o nome (quando não há subtítulo): o primeiro texto preenchido; número sozinho leva o nome do campo ("Nível de Desafio 1"). */
export function tagline(stats: { name: string; kind: StatKind; value: string }[]): string {
  const t = stats.find((x) => x.kind === 'texto' && x.value.trim());
  if (!t) return '';
  return /^[\d\s.,/%+-]+$/.test(t.value.trim()) ? `${t.name} ${t.value.trim()}` : t.value.trim();
}
