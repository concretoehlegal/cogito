/* Tipos das peças de jogo (cartas e fichas) e do Planejador de campanhas. Tudo fica neste computador. */
import type { ListValue, RuleSystem, StatKind, StatRole } from './system.ts';

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

/** Um campo da ficha já com o valor, como as cartas e o Bestiário mostram. */
export interface ActorStat { id: string; name: string; short: string; icon: string; kind: StatKind; role: StatRole; card: boolean; value: string }
export interface ActorList { id: string; name: string; icon: string; card: boolean; items: ListValue[] }
/** Recurso gasto pelas cartas (ex.: "2 Alma", "1 PE"). */
export interface ActorResource { id: string; name: string; short: string; max: number }

/** Ficha de jogo usada pelas cartas de personagem e pelo Bestiário, já lida pelo sistema de regras da campanha. */
export interface Actor {
  id: string; kind: 'pc' | 'npc' | 'enemy'; name: string; subtitle: string; color: string; image: string | null;
  emblem: string; boss: boolean; ai?: string; actions: CombatAction[]; cards: Card[];
  /** Nome do tipo no sistema (Personagem, Agente, Investigador, Monstro, Chefe…). */
  kindLabel: string;
  /** Vida máxima, defesa (alvo dos ataques) e armadura (desconta do dano). */
  hp: number; defense: number; armor: number;
  resources: ActorResource[];
  combatActions: number; moveActions: number;
  stats: ActorStat[]; lists: ActorList[];
}

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

/* ───────────── Planejador de campanhas ───────────── */

export type NodeType = 'personagem' | 'npc' | 'inimigo' | 'local' | 'item' | 'faccao' | 'sessao' | 'nota' | 'imagem' | 'moldura' | 'texto' | 'caixa';
/** Aparência do texto (fichas Texto e Caixa de texto). */
export interface NodeFont { size?: number; align?: 'left' | 'center' | 'right'; bold?: boolean; italic?: boolean }
export const CHAR_TYPES: NodeType[] = ['personagem', 'npc', 'inimigo'];

/** Ficha de jogo de um personagem, NPC ou inimigo do quadro. Os campos vêm do sistema de regras da campanha. */
export interface Sheet {
  boss: boolean; actions: CombatAction[]; cards: Card[]; ai?: string;
  /** Valor de cada campo do sistema (pelo id do campo). */
  vals?: Record<string, string>;
  /** Itens de cada lista do sistema (Atributos, Perícias…), com nome, valor e ícone próprios. */
  lists?: Record<string, ListValue[]>;
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
  /** Sistema de regras da campanha (campanhas antigas: COGITO). */
  system?: RuleSystem;
}
export interface PlanMeta {
  id: string; name: string; description: string; icon: string; color: string; cover: string | null;
  createdAt: number; updatedAt: number; nodes: number; characters: number; enemies: number;
  links?: number; counts?: Partial<Record<NodeType, number>>;
  faces?: { name: string; image: string | null; color: string; icon: string; type: NodeType }[];
}
