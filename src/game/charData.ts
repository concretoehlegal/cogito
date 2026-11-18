/* Dados da carta de personagem a partir da ficha (separado do desenho para os testes). */
import type { Actor } from './types.ts';

export type CardVariant = 'pc' | 'npc' | 'boss' | 'enemy';
/** Um número no canto da carta (ícone, valor e nome do campo). */
export interface Chip { icon: string; value: string; title: string; big?: boolean }
export interface CharData {
  name: string; color: string; image: string | null; emblem: string; variant: CardVariant; kindLabel: string;
  /** Cantos de cima: esquerda (a vida primeiro) e direita. */
  tl: Chip[]; tr: Chip[];
  attrs: { k: string; v: string }[]; instrument: { name: string; dmg: string; reload: number } | null;
  abilities: { name: string; dmg: string }[]; dead: boolean; hidden?: boolean;
}

/** Tipo de carta de um token ou ficha (nome antigo mantido: personagem, NPC, inimigo ou chefe). */
export type CryptKind = 'pc' | 'npc' | 'enemy' | 'boss';
export const cryptKind = (t: { kind?: string; boss?: boolean }): CryptKind => (t.kind === 'enemy' ? (t.boss ? 'boss' : 'enemy') : t.kind === 'npc' ? 'npc' : 'pc');
export const variantOf = (kind: string | undefined, boss?: boolean): CardVariant => (kind === 'enemy' ? (boss ? 'boss' : 'enemy') : kind === 'npc' ? 'npc' : 'pc');
const reloadOf = (txt: string) => { const m = String(txt || '').match(/(\d+)/); return m ? Math.min(99, Number(m[1])) : 0; };

/**
 * Carta a partir da ficha, seguindo o sistema da campanha: os campos marcados "na carta" ocupam os cantos (a vida em
 * destaque), a primeira lista marcada vai no corpo e o instrumento (arma equipada) no rodapé. Criaturas mostram o dano e as habilidades.
 */
export function dataFromActor(actor: Actor, hp?: { cur: number; max: number } | null, dead = false): CharData {
  const enemy = actor.kind === 'enemy';
  const shown = actor.stats.filter((s) => s.card && s.kind !== 'texto');
  const life = shown.find((s) => s.role === 'vida');
  const rest = shown.filter((s) => s !== life).map((s) => ({ icon: s.icon, value: s.value || '—', title: s.name }));
  const lifeChip = { icon: life?.icon ?? 'sangue', value: String(hp ? hp.cur : life ? life.value : actor.hp), title: life?.name ?? 'Vida', big: true };
  const card = actor.cards.find((k) => k.equipped && k.roll && k.type === 'item') ?? actor.cards.find((k) => k.type === 'item' && k.roll);
  const act = actor.actions.find((x) => x.dmg);
  const firstList = actor.lists.find((l) => l.card);
  return {
    name: actor.name, color: actor.color, image: actor.image, emblem: actor.emblem, variant: variantOf(actor.kind, actor.boss), kindLabel: actor.kindLabel,
    tl: [lifeChip, ...rest.slice(0, 1)],
    tr: enemy ? [{ icon: 'faca', value: act?.dmg || '—', title: 'Dano' }] : rest.slice(1, 3),
    attrs: enemy || !firstList ? [] : firstList.items.filter((x) => x.k).slice(0, 6),
    instrument: enemy ? null : card ? { name: card.name, dmg: card.roll, reload: reloadOf(card.cooldown) } : act ? { name: act.name, dmg: act.dmg, reload: 0 } : null,
    abilities: enemy ? actor.actions.slice(0, actor.boss ? 4 : 2).map((x) => ({ name: x.name, dmg: x.dmg })) : [],
    dead,
  };
}

