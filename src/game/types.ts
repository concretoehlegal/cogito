/* Tipos das peças de jogo (cartas e fichas) e do Planejador de campanhas. Tudo fica neste computador. */

export interface BarDef { id: string; name: string; color: string }
export interface BarValue { cur: number; max: number }
export type Bars = Record<string, BarValue>;

export interface CombatAction { name: string; hit: string; dmg: string }

export type CardType = 'item' | 'habilidade' | 'feitico';
export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export interface Card {
  id: string; type: CardType; name: string; icon: string; image: string | null; color: string; rarity: Rarity;
  cost: string; roll: string; tags: string; description: string; qty: number; consumable: boolean; equipped: boolean;
  mode: '' | 'ativo' | 'passivo'; cooldown: string; stats: { v: string; l: string }[];
  /** Efeito no Bestiário: '' = nenhum. */
  hunt?: '' | 'dano' | 'cura' | 'defesa';
  /** Habilidade de origem (vem da origem do personagem). */
  origin?: boolean;
}

/** Ficha de jogo usada pelas cartas de personagem e pelo Bestiário. */
export interface Actor {
  id: string; kind: 'pc' | 'npc' | 'enemy'; name: string; subtitle: string; color: string; image: string | null;
  bars: Bars; attrs: { k: string; v: string }[]; defense: number; actions: CombatAction[]; cards: Card[];
  emblem: string; boss: boolean; ai?: string; resilience?: number; soul?: number;
  /** Capacidades (perícias e saberes), com valor. */
  caps?: { k: string; v: string }[];
  /** Identidade e ações por turno (personagens e NPCs). */
  origin?: string; level?: number; affiliation?: string; cliche?: string; combatActions?: number; moveActions?: number;
}

export interface CardSummary {
  resilience: number; soul: number; defense: number; attrs: { k: string; v: string }[];
  instrument: { name: string; dmg: string; reload: number } | null; abilities: { name: string; dmg: string }[];
}

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

/* ───────────── Planejador de campanhas ───────────── */

export type NodeType = 'personagem' | 'npc' | 'inimigo' | 'local' | 'item' | 'faccao' | 'sessao' | 'nota' | 'imagem' | 'moldura' | 'texto' | 'caixa';
/** Aparência do texto (fichas Texto e Caixa de texto). */
export interface NodeFont { size?: number; align?: 'left' | 'center' | 'right'; bold?: boolean; italic?: boolean }
export const CHAR_TYPES: NodeType[] = ['personagem', 'npc', 'inimigo'];

/** Ficha de jogo de um personagem, NPC ou inimigo do quadro. */
export interface Sheet {
  life: number; defense: number; resilience: number; soul: number; boss: boolean;
  attrs: { k: string; v: string }[]; actions: CombatAction[]; cards: Card[]; ai?: string;
  caps?: { k: string; v: string }[];
  /** Origem, nível, filiação e clichê do personagem. */
  origin?: string; level?: number; affiliation?: string; cliche?: string;
  /** Ações por turno: de combate (o Bestiário respeita) e de movimento. */
  combatActions?: number; moveActions?: number;
}

export interface PlanNode {
  id: string; type: NodeType; x: number; y: number; w: number; h: number;
  title: string; subtitle: string; color: string; icon: string; image: string | null;
  body: string; tags: string[]; sheet?: Sheet; font?: NodeFont;
}
export type LinkSide = 'auto' | 'top' | 'right' | 'bottom' | 'left';
export type LinkKind = 'reta' | 'curva' | 'cotovelo';
export type LinkDash = 'solido' | 'tracejado' | 'pontilhado';
export type LinkCap = 'nenhuma' | 'seta' | 'triangulo' | 'circulo' | 'losango' | 'barra';
export interface PlanLink {
  id: string; from: string; to: string; label: string; color: string;
  /** Lado de saída e de chegada (auto: o lado virado para a outra ficha). */
  fromSide?: LinkSide; toSide?: LinkSide;
  /** Formato da linha, traço, pontas e espessura. Ausentes: reta contínua com seta no fim (ligações antigas). */
  kind?: LinkKind; dash?: LinkDash; startCap?: LinkCap; endCap?: LinkCap; width?: number;
}

export interface Plan {
  version: 1; id: string; name: string; description: string; icon: string; color: string; cover: string | null;
  createdAt: number; updatedAt: number;
  view: { x: number; y: number; zoom: number };
  nodes: PlanNode[]; links: PlanLink[];
}
export interface PlanMeta {
  id: string; name: string; description: string; icon: string; color: string; cover: string | null;
  createdAt: number; updatedAt: number; nodes: number; characters: number; enemies: number;
  links?: number; counts?: Partial<Record<NodeType, number>>;
  faces?: { name: string; image: string | null; color: string; icon: string; type: NodeType }[];
}
