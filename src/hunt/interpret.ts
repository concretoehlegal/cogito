/*
 * Intérprete das ações escritas no Bestiário (sem internet e sem IA externa).
 * O jogador descreve o que o personagem faz ("atiro no cultista 2", "tomo o remédio", "me protejo atrás do carro")
 * e o intérprete escolhe, entre as capacidades da ficha (ataques, armas, itens e habilidades), a ação que melhor
 * corresponde e o alvo. É uma primeira versão por palavras-chave, para ser aprimorada junto com o sistema.
 */
import { canUse, distribution, hitChances, type Combatant, type HuntAction, type HuntState } from './engine.ts';

export interface Reading {
  ok: boolean;
  action: HuntAction | null;
  target: Combatant | null;
  flee: boolean;
  message: string;            // explicação curta para o jogador
  alternatives: HuntAction[]; // outras leituras possíveis
}

export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (text: string, stems: string[]) => stems.some((w) => new RegExp(`(^|\\s)${w}`).test(text));

/** Palavras do jogador → famílias de ação. */
const FIRE = ['atir', 'dispar', 'tiro', 'bala', 'balea', 'mir', 'revolv', 'pistol', 'escopet', 'rifle', 'arma de fogo'];
const MELEE = ['soc', 'murr', 'chut', 'bat', 'golpe', 'esmurr', 'pancad', 'cabecad', 'cotovel', 'joelh'];
const BLADE = ['faca', 'facad', 'esfaque', 'cort', 'apunhal', 'lamin', 'navalh', 'estoc', 'machad', 'golpe de machado'];
const HEAL = ['cur', 'remed', 'bebo', 'beber', 'tom', 'engol', 'curativ', 'recuper', 'enfaix', 'pilul', 'seringa', 'injet', 'tratar', 'trato', 'respir'];
const GUARD = ['defend', 'defes', 'proteg', 'escud', 'colete', 'esquiv', 'bloque', 'abrig', 'cobert', 'me escond', 'recu', 'aguard', 'guarda'];
const OCCULT = ['feiti', 'ritual', 'sussurr', 'conjur', 'invoc', 'magia', 'ocult', 'encant', 'palavra', 'reza', 'prece', 'sigil', 'maldi'];
const ATTACK = ['atac', 'mat', 'acert', 'fer', 'destru', 'derrub', 'agred', 'avanc', 'invest', 'luto', 'lutar', 'cac'];
const FLEE = ['fug', 'corro', 'correr', 'escap', 'bater em retirada', 'desist'];
const FIRE_ICONS = ['revolver', 'escopeta'];
const BLADE_ICONS = ['faca', 'machado'];
const MELEE_ICONS = ['martelo', 'mao'];

const ORDINAL: [string, number][] = [['primeir', 1], ['segund', 2], ['terceir', 3], ['quart', 4], ['outro', 2]];

/** Alvo citado no texto: nome (o mais longo que aparece), "segundo cultista", "o chefe", "o mais ferido"… */
export function findTarget(text: string, s: HuntState, current: string | null): Combatant | null {
  const alive = s.enemies.filter((e) => e.hp > 0);
  if (!alive.length) return null;
  let best: Combatant | null = null; let len = 0;
  for (const e of alive) {
    const n = norm(e.name);
    if (text.includes(n) && n.length > len) { best = e; len = n.length; }
  }
  if (best) return best;
  for (const [w, k] of ORDINAL) {
    if (!has(text, [w])) continue;
    for (const e of alive) {
      const base = norm(e.name).replace(/\s\d+$/, '');
      if (text.includes(base) && norm(e.name).endsWith(` ${k}`)) return e;
    }
  }
  const byBase = alive.filter((e) => { const base = norm(e.name).replace(/\s\d+$/, ''); return base.length >= 3 && text.includes(base); });
  if (byBase.length) return byBase.find((e) => e.id === current) ?? byBase[0];
  if (has(text, ['chefe', 'lider', 'maior', 'grande'])) return alive.find((e) => e.boss) ?? alive.reduce((a, b) => (b.max > a.max ? b : a));
  if (has(text, ['ferid', 'fraco', 'mais fraco', 'quase morto', 'machucad'])) return alive.reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a));
  if (has(text, ['forte', 'perigos', 'inteir'])) return alive.reduce((a, b) => (b.hp > a.hp ? b : a));
  return alive.find((e) => e.id === current) ?? alive[0];
}

const expectedDamage = (a: HuntAction, foe: Combatant) => {
  const { normal, crit } = hitChances(a.hit, foe.defense + foe.guard);
  let m = 0; for (const [v, p] of distribution(a.value)) m += Math.max(0, v) * p;
  return normal * m + crit * m * 2;
};

/** Pontua o quanto cada capacidade da ficha combina com o texto. */
function score(text: string, a: HuntAction): number {
  let pts = 0;
  const name = norm(a.name);
  if (name && text.includes(name)) pts += 12;
  for (const w of name.split(' ')) if (w.length >= 4 && has(text, [w.slice(0, Math.max(4, w.length - 2))])) pts += 4;
  const extra = a.card ? norm(`${a.card.tags} ${a.card.description}`) : '';
  for (const w of new Set(extra.split(' '))) if (w.length >= 6 && has(text, [w.slice(0, w.length - 2)])) pts += 1;
  const fire = FIRE_ICONS.includes(a.icon) || /revolver|pistola|escopeta|rifle|arma/.test(name);
  const blade = BLADE_ICONS.includes(a.icon) || /faca|lamina|navalha|machado|punhal/.test(name);
  const melee = MELEE_ICONS.includes(a.icon) || /soco|chute|golpe|punho|ataque/.test(name) || a.source === 'ataque';
  const occult = a.card?.type === 'feitico';
  if (has(text, FIRE) && fire) pts += 7;
  if (has(text, BLADE) && blade) pts += 7;
  if (has(text, MELEE) && melee && !fire) pts += 5;
  if (has(text, OCCULT) && occult) pts += 7;
  if (has(text, ['habilidade']) && a.card?.type === 'habilidade') pts += 3;
  if (has(text, HEAL) && a.effect === 'cura') pts += 6;
  if (has(text, GUARD) && a.effect === 'defesa') pts += 6;
  if (has(text, ATTACK) && a.effect === 'dano') pts += 1;
  return pts;
}

/** Interpreta o texto e devolve a ação, o alvo e uma explicação. */
export function interpret(raw: string, s: HuntState, current: string | null): Reading {
  const text = norm(raw);
  const empty: Reading = { ok: false, action: null, target: null, flee: false, message: '', alternatives: [] };
  if (!text) return { ...empty, message: 'Descreva o que seu personagem faz.' };
  if (has(text, FLEE)) return { ...empty, ok: true, flee: true, message: 'Entendi: recuar e encerrar o confronto.' };
  const target = findTarget(text, s, current);
  const all = s.hero.actionsList;
  // Pontos só pelo verbo genérico ("ataco") não escolhem arma: isso fica para a melhor opção de dano, abaixo.
  const ranked = all.map((a) => ({ a, pts: score(text, a), usable: canUse(s, a).ok })).filter((x) => x.pts > 1).sort((x, y) => y.pts - x.pts);
  const usable = ranked.filter((x) => x.usable);
  let pick: HuntAction | null = usable[0]?.a ?? null;
  let note = '';
  if (ranked.length && !ranked[0].usable && pick) note = ` (${ranked[0].a.name} não está disponível: ${canUse(s, ranked[0].a).why?.toLowerCase()})`;
  if (ranked.length && !usable.length) {
    return { ...empty, target, message: `${ranked[0].a.name} não está disponível agora: ${canUse(s, ranked[0].a).why}`, alternatives: all.filter((a) => canUse(s, a).ok).slice(0, 4) };
  }
  // Texto genérico ("ataco o cultista"): a melhor arma disponível contra esse alvo, conforme as capacidades da ficha.
  if (!pick && (has(text, ATTACK) || target && text.includes(norm(target.name).replace(/\s\d+$/, '')))) {
    const options = all.filter((a) => a.effect === 'dano' && canUse(s, a).ok);
    if (target && options.length) pick = options.reduce((x, y) => (expectedDamage(y, target) > expectedDamage(x, target) ? y : x));
    if (pick) note = ' — a melhor opção de dano que você tem agora';
  }
  if (!pick) return { ...empty, target, message: 'Não reconheci uma ação da ficha. Cite uma arma, item ou habilidade, ou diga “ataco”, “me curo”, “me defendo”.', alternatives: all.filter((a) => canUse(s, a).ok).slice(0, 4) };
  const alternatives = usable.filter((x) => x.a.id !== pick!.id).map((x) => x.a).slice(0, 3);
  const what = pick.effect === 'dano' ? `${pick.name} em ${target?.name ?? '—'}` : pick.effect === 'cura' ? `${pick.name} para se curar` : `${pick.name} para se defender`;
  return { ok: true, action: pick, target: pick.effect === 'dano' ? target : null, flee: false, message: `Entendi: ${what}${note}.`, alternatives };
}
