/*
 * Motor do Bestiário: combate em turnos entre um caçador (personagem da campanha) e uma ou mais criaturas.
 * As cartas do personagem viram ações (dano, cura ou defesa), com recarga em turnos, custo em barra e consumíveis.
 * Os inimigos seguem um perfil de IA; o perfil "agressiva" escolhe sempre o golpe que tira mais vida no menor tempo
 * (dano esperado, somado a um bônus pela chance de derrubar o caçador já neste turno).
 */
import { roll } from '../lib/dice.ts';
import type { Actor, Card, CombatAction } from '../game/types.ts';

export type Effect = 'dano' | 'cura' | 'defesa';
export interface HuntBar { id: string; name: string; color: string; cur: number; max: number }
export interface Combatant {
  id: string; name: string; color: string; image: string | null; emblem: string; kind: 'pc' | 'npc' | 'enemy'; boss: boolean;
  hp: number; max: number; defense: number; guard: number; actions: CombatAction[]; ai: string;
  actorId: string; resilience: number; soul: number;
}
export interface HuntAction {
  id: string; source: 'ataque' | 'carta'; name: string; icon: string; effect: Effect; hit: string; value: string;
  cooldown: number; costBar: string | null; cost: number; consumable: boolean; card: Card | null; color: string;
}
export interface Hero extends Combatant { bars: HuntBar[]; hpBar: HuntBar | null; actionsList: HuntAction[]; equipped: Card[]; passives: Card[] }
export type LineKind = 'acerto' | 'critico' | 'erro' | 'cura' | 'defesa' | 'intencao' | 'info' | 'fim' | 'fala';
export interface LogLine { id: number; round: number; side: 'heroi' | 'inimigo' | 'sistema'; actor: string; text: string; detail?: string; kind: LineKind; dmg?: number; target?: string }
export type Phase = 'heroi' | 'inimigos' | 'vitoria' | 'derrota' | 'fuga';
export interface HuntState {
  round: number; phase: Phase; hero: Hero; enemies: Combatant[];
  cooldowns: Record<string, number>; uses: Record<string, number>; log: LogLine[]; seq: number;
  stats: { dealt: number; taken: number; healed: number; crits: number; turns: number };
}
export type Rng = () => number;

/* ───────────── utilidades ───────────── */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

/** Recarga em turnos a partir do texto da carta: "3 turnos" = 3; "1 cena", "sessão", "caçada" = uma vez por caçada. */
export function parseCooldown(text: string): number {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return 0;
  if (/cena|sess|ca[çc]ada|dia|combate|luta/.test(t)) return 999;
  const m = t.match(/(\d+)/);
  return m ? Math.min(99, Number(m[1])) : 0;
}
/** Custo em barra: "2 Alma" gasta 2 da barra Alma. Outros textos ($800, 1 ação) não gastam nada. */
export function parseCost(text: string, bars: { name: string }[]): { bar: string | null; n: number } {
  const m = String(text || '').trim().match(/^(\d+)\s+(.+)$/);
  if (!m) return { bar: null, n: 0 };
  const name = m[2].toLowerCase();
  const bar = bars.find((b) => b.name.toLowerCase() === name || b.name.toLowerCase().startsWith(name) || name.startsWith(b.name.toLowerCase()));
  return bar ? { bar: bar.name, n: Number(m[1]) } : { bar: null, n: 0 };
}

type Term = { sign: 1 | -1; count: number; sides: number } | { sign: 1 | -1; value: number };
/** Termos de uma fórmula (aceita só números, como o bônus "0+5"). */
function termsOf(formula: string): Term[] {
  const src = String(formula || '0').replace(/\s+/g, '').toLowerCase().replace(/d%/g, 'd100');
  const out: Term[] = []; const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g; let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3] !== undefined) out.push({ sign, count: Math.min(100, m[2] ? Number(m[2]) : 1), sides: Math.max(2, Number(m[3])) });
    else out.push({ sign, value: Number(m[4]) });
  }
  return out.length ? out : [{ sign: 1, value: 0 }];
}

/** Distribuição de probabilidade de uma fórmula (exata para poucos dados, por amostragem quando é grande). */
export function distribution(formula: string): Map<number, number> {
  const terms = termsOf(formula);
  let space = 1;
  for (const t of terms) if ('sides' in t) space *= t.sides ** Math.min(t.count, 6);
  if (space > 2e6) {
    const out = new Map<number, number>(); const N = 4000;
    for (let i = 0; i < N; i++) { const v = roll(formula, () => Math.floor(Math.random() * 0x100000000)).total; out.set(v, (out.get(v) ?? 0) + 1 / N); }
    return out;
  }
  let dist = new Map<number, number>([[0, 1]]);
  for (const t of terms) {
    if ('sides' in t) {
      for (let i = 0; i < t.count; i++) {
        const next = new Map<number, number>();
        for (const [v, p] of dist) for (let f = 1; f <= t.sides; f++) { const k = v + t.sign * f; next.set(k, (next.get(k) ?? 0) + p / t.sides); }
        dist = next;
      }
    } else {
      const next = new Map<number, number>();
      for (const [v, p] of dist) next.set(v + t.sign * t.value, p);
      dist = next;
    }
  }
  return dist;
}
const mean = (d: Map<number, number>) => { let m = 0; for (const [v, p] of d) m += Math.max(0, v) * p; return m; };
/** Média do dano que realmente conta: o que passa da vida restante é desperdício. */
const meanCapped = (d: Map<number, number>, cap: number, mult = 1) => { let m = 0; for (const [v, p] of d) m += Math.min(cap, Math.max(0, v) * mult) * p; return m; };
const atLeast = (d: Map<number, number>, x: number, mult = 1) => { let q = 0; for (const [v, p] of d) if (Math.max(0, v) * mult >= x) q += p; return q; };
const firstIsD20 = (formula: string) => { const t = termsOf(formula)[0]; return 'sides' in t && t.sides === 20 && t.count === 1 && t.sign > 0; };

/** Chance de acerto contra uma defesa, separando o 20 natural (crítico, dano dobrado) e o 1 natural (erro). */
export function hitChances(hit: string, defense: number): { normal: number; crit: number } {
  if (!hit) return { normal: 1, crit: 0 };
  const d20 = firstIsD20(hit);
  if (!d20) return { normal: atLeast(distribution(hit), defense), crit: 0 };
  // Com d20 na frente: 1 erra sempre, 20 acerta com crítico; do 2 ao 19 compara o total.
  const rest = hit.replace(/^\s*1?d20/i, '0');
  const bonus = distribution(rest);
  let normal = 0;
  for (let face = 2; face <= 19; face++) for (const [v, p] of bonus) if (face + v >= defense) normal += p / 20;
  return { normal, crit: 1 / 20 };
}

/* ───────────── IA dos inimigos ───────────── */

export interface AiChoice { index: number; expected: number; chance: number; kill: number; reason: string }
type AiProfile = (me: Combatant, hero: Hero) => AiChoice;

/**
 * Agressiva: escolhe o golpe que tira, em média, a maior parte da vida que resta ao caçador neste turno
 * (dano acima da vida restante não conta), com um pequeno peso extra para a chance de derrubá-lo agora.
 * Com o caçador inteiro isso é o maior dano esperado; quase caindo, é o golpe mais certeiro.
 */
const agressiva: AiProfile = (me, hero) => {
  const def = hero.defense + hero.guard;
  let best: AiChoice | null = null; let bestScore = -1; let bestMax = -1;
  me.actions.forEach((a, index) => {
    if (!a.dmg) return;
    const { normal, crit } = hitChances(a.hit, def);
    const dmg = distribution(a.dmg);
    const avg = mean(dmg);
    const expected = normal * avg + crit * avg * 2;
    const kill = normal * atLeast(dmg, hero.hp) + crit * atLeast(dmg, hero.hp, 2);
    const useful = normal * meanCapped(dmg, hero.hp) + crit * meanCapped(dmg, hero.hp, 2);
    const score = useful + kill * 0.5;
    let max = 0; for (const v of dmg.keys()) max = Math.max(max, v);
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && max > bestMax)) {
      bestScore = score; bestMax = max;
      best = { index, expected, chance: normal + crit, kill, reason: kill >= 0.35 ? 'para derrubar' : 'golpe mais letal' };
    }
  });
  return best ?? { index: 0, expected: 0, chance: 0, kill: 0, reason: 'sem ataques' };
};
export const AI: Record<string, { name: string; choose: AiProfile }> = {
  agressiva: { name: 'Agressiva: máximo de dano no menor tempo', choose: agressiva },
};
export const chooseAction = (me: Combatant, hero: Hero): AiChoice => (AI[me.ai] ?? AI.agressiva).choose(me, hero);

/* ───────────── montagem ───────────── */

const ICON_OF: Record<string, string> = { item: 'revolver', habilidade: 'raio', feitico: 'vela' };

/** Ações do caçador: ataques da ficha (combate) e cartas com efeito na caçada. */
export function heroActions(actor: Actor, bars: { name: string }[]): HuntAction[] {
  const baseHit = actor.actions.find((a) => a.hit)?.hit || '1d20';
  const list: HuntAction[] = actor.actions.filter((a) => a.dmg).map((a, i) => ({
    id: `atk-${i}`, source: 'ataque', name: a.name || 'Ataque', icon: 'faca', effect: 'dano', hit: a.hit, value: a.dmg,
    cooldown: 0, costBar: null, cost: 0, consumable: false, card: null, color: '#9a9a9a',
  }));
  for (const c of actor.cards) {
    const effect = c.hunt;
    if (!effect || !c.roll || c.mode === 'passivo') continue;
    const cost = parseCost(c.cost, bars);
    list.push({
      id: `card-${c.id}`, source: 'carta', name: c.name, icon: c.icon || ICON_OF[c.type] || 'estrela', effect,
      hit: effect === 'dano' ? baseHit : '', value: c.roll, cooldown: parseCooldown(c.cooldown),
      costBar: cost.bar, cost: cost.n, consumable: c.consumable, card: c, color: c.color,
    });
  }
  return list;
}

function combatant(actor: Actor, hpBarId: string | undefined, name: string, id: string): Combatant {
  const v = hpBarId ? actor.bars[hpBarId] : undefined;
  const max = Math.max(1, v ? v.max : 10);
  return {
    id, name, color: actor.color, image: actor.image, emblem: actor.emblem, kind: actor.kind, boss: !!actor.boss,
    hp: max, max, defense: Number.isFinite(actor.defense) ? actor.defense : 10, guard: 0,
    // Criaturas usam 2 habilidades; chefes, 4.
    actions: (actor.actions.length ? actor.actions : [{ name: 'Ataque', hit: '1d20', dmg: '1d4' }]).slice(0, actor.kind === 'enemy' ? (actor.boss ? 4 : 2) : 8),
    ai: actor.ai || 'agressiva', actorId: actor.id, resilience: actor.resilience ?? 0, soul: actor.soul ?? 0,
  };
}

export function newHunt(campaign: { bars: { id: string; name: string; color: string }[] }, heroActor: Actor, prey: Actor[], rng?: Rng): HuntState {
  const hpBar = campaign.bars[0];
  const base = combatant(heroActor, hpBar?.id, heroActor.name, 'heroi');
  const bars: HuntBar[] = campaign.bars.map((b) => { const v = heroActor.bars[b.id] ?? { cur: 0, max: 0 }; return { id: b.id, name: b.name, color: b.color, cur: v.max, max: v.max }; });
  const hero: Hero = {
    ...base, bars: bars.filter((b) => b.id !== hpBar?.id && b.max > 0), hpBar: bars.find((b) => b.id === hpBar?.id) ?? null,
    actionsList: heroActions(heroActor, campaign.bars), equipped: heroActor.cards.filter((c) => c.equipped), passives: heroActor.cards.filter((c) => c.mode === 'passivo'),
  };
  const count = new Map<string, number>();
  const enemies = prey.map((a, i) => {
    const n = (count.get(a.id) ?? 0) + 1; count.set(a.id, n);
    const total = prey.filter((x) => x.id === a.id).length;
    return combatant(a, hpBar?.id, total > 1 ? `${a.name} ${n}` : a.name, `presa-${i}`);
  });
  const uses: Record<string, number> = {};
  for (const a of hero.actionsList) if (a.consumable && a.card) uses[a.id] = a.card.qty;
  const s: HuntState = { round: 1, phase: 'heroi', hero, enemies, cooldowns: {}, uses, log: [], seq: 0, stats: { dealt: 0, taken: 0, healed: 0, crits: 0, turns: 0 } };
  const ini = (r: number) => roll('1d20', rngFn(rng)).total + r;
  const heroIni = ini(0); const preyIni = Math.max(...enemies.map(() => ini(0)));
  line(s, 'sistema', 'Bestiário', `O confronto começa: ${hero.name} contra ${enemies.map((e) => e.name).join(', ')}.`, 'info');
  line(s, 'sistema', 'Iniciativa', `${hero.name} tirou ${heroIni}; as criaturas tiraram ${preyIni}. ${heroIni >= preyIni ? `${hero.name} age primeiro.` : 'As criaturas atacam primeiro!'}`, 'info');
  if (heroIni < preyIni) s.phase = 'inimigos';
  return s;
}

/* ───────────── turnos ───────────── */

const rngFn = (rng?: Rng) => rng ?? undefined;
function line(s: HuntState, side: LogLine['side'], actor: string, text: string, kind: LineKind, extra: Partial<LogLine> = {}) {
  s.log.push({ id: ++s.seq, round: s.round, side, actor, text, kind, ...extra });
  if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
}

export interface Check { ok: boolean; why?: string }
export function canUse(s: HuntState, a: HuntAction): Check {
  if (s.phase !== 'heroi') return { ok: false, why: 'Não é a sua vez.' };
  const cd = s.cooldowns[a.id] ?? 0;
  if (cd > 0) return { ok: false, why: cd >= 900 ? 'Já usada neste confronto.' : `Recarregando: ${cd} turno(s).` };
  if (a.consumable && (s.uses[a.id] ?? 0) <= 0) return { ok: false, why: 'Acabou.' };
  if (a.costBar) { const b = s.hero.bars.find((x) => x.name === a.costBar); if (b && b.cur < a.cost) return { ok: false, why: `Falta ${a.costBar}.` }; }
  return { ok: true };
}

/** Golpe com acerto contra a defesa; 20 natural dobra o dano, 1 natural erra. */
function attack(s: HuntState, side: 'heroi' | 'inimigo', me: Combatant, foe: Combatant, name: string, hit: string, dmgF: string, rng?: Rng) {
  let ok = true; let crit = false; let detail = 'acerto automático';
  const def = foe.defense + foe.guard;
  if (hit) {
    const r = roll(hit, rngFn(rng));
    const first = r.parts[0]?.rolls[0]; const d20 = firstIsD20(hit);
    crit = d20 && first === 20; const fumble = d20 && first === 1;
    ok = crit || (!fumble && r.total >= def);
    detail = `${r.formula} = ${r.total} contra Defesa ${def}${crit ? ' · crítico!' : fumble ? ' · falha crítica' : ''}`;
  }
  if (!ok) { line(s, side, me.name, `${name}: errou ${foe.name}.`, 'erro', { detail, target: foe.id }); return 0; }
  const dmg = Math.max(0, roll(dmgF, rngFn(rng)).total) * (crit ? 2 : 1);
  foe.hp = Math.max(0, foe.hp - dmg);
  line(s, side, me.name, `${name}: ${crit ? 'CRÍTICO! ' : ''}${dmg} de dano em ${foe.name}.`, crit ? 'critico' : 'acerto', { detail, dmg, target: foe.id });
  if (crit) s.stats.crits += 1;
  if (foe.hp <= 0) line(s, 'sistema', 'Bestiário', side === 'heroi' ? `${foe.name} caiu.` : `${foe.name} caiu.`, 'fim', { target: foe.id });
  return dmg;
}

/** O caçador age com uma ação (e um alvo, quando causa dano). */
export function heroAct(prev: HuntState, actionId: string, targetId: string | null, rng?: Rng, said?: string): HuntState {
  const s = clone(prev);
  const a = s.hero.actionsList.find((x) => x.id === actionId);
  if (!a) throw new Error('Ação não encontrada.');
  const can = canUse(s, a);
  if (!can.ok) throw new Error(can.why);
  if (said) {
    const t = s.enemies.find((e) => e.id === targetId);
    line(s, 'heroi', s.hero.name, `“${said}”`, 'fala', { detail: `→ ${a.name}${a.effect === 'dano' && t ? ` em ${t.name}` : ''}` });
  }
  if (a.costBar) { const b = s.hero.bars.find((x) => x.name === a.costBar); if (b) b.cur = Math.max(0, b.cur - a.cost); }
  if (a.consumable) s.uses[a.id] = Math.max(0, (s.uses[a.id] ?? 0) - 1);
  if (a.cooldown > 0) s.cooldowns[a.id] = a.cooldown >= 999 ? 999 : a.cooldown + 1; // +1: desconta já no começo do próximo turno
  s.hero.guard = 0;
  if (a.effect === 'dano') {
    const alive = s.enemies.filter((e) => e.hp > 0);
    const target = alive.find((e) => e.id === targetId) ?? alive[0];
    if (!target) throw new Error('Nenhuma criatura de pé.');
    s.stats.dealt += attack(s, 'heroi', s.hero, target, a.name, a.hit, a.value, rng);
  } else if (a.effect === 'cura') {
    const v = Math.max(0, roll(a.value, rngFn(rng)).total);
    const healed = Math.min(v, s.hero.max - s.hero.hp);
    s.hero.hp += healed; s.stats.healed += healed;
    line(s, 'heroi', s.hero.name, `${a.name}: recupera ${healed} de vida.`, 'cura', { detail: `${a.value} = ${v}` });
  } else {
    const v = Math.max(0, roll(a.value, rngFn(rng)).total);
    s.hero.guard = v;
    line(s, 'heroi', s.hero.name, `${a.name}: +${v} de Defesa até o próximo turno.`, 'defesa', { detail: `${a.value} = ${v}` });
  }
  if (s.hero.hpBar) s.hero.hpBar.cur = s.hero.hp;
  s.stats.turns += 1;
  if (s.enemies.every((e) => e.hp <= 0)) { s.phase = 'vitoria'; line(s, 'sistema', 'Bestiário', `Vitória! ${s.hero.name} abateu todas as criaturas em ${s.round} rodada(s).`, 'fim'); return s; }
  s.phase = 'inimigos';
  return s;
}

/**
 * Vez das presas: cada uma anuncia a intenção (o que a IA escolheu e por quê) e ataca.
 * Devolve os estados intermediários para a tela mostrar um golpe de cada vez.
 */
export function enemyTurns(prev: HuntState, rng?: Rng): HuntState[] {
  let s = clone(prev);
  const frames: HuntState[] = [];
  for (const e of s.enemies) {
    if (e.hp <= 0 || s.hero.hp <= 0) continue;
    const choice = chooseAction(e, s.hero);
    const act = e.actions[choice.index];
    line(s, 'inimigo', e.name, `${e.name} vai de ${act.name} (${choice.reason}: ${Math.round(choice.chance * 100)}% de acerto, ≈ ${fmt(choice.expected)} de dano esperado).`, 'intencao');
    frames.push(clone(s));
    s.stats.taken += attack(s, 'inimigo', e, s.hero, act.name, act.hit, act.dmg, rng);
    if (s.hero.hpBar) s.hero.hpBar.cur = s.hero.hp;
    if (s.hero.hp <= 0) { s.phase = 'derrota'; line(s, 'sistema', 'Bestiário', `${s.hero.name} caiu. O confronto acabou.`, 'fim'); frames.push(clone(s)); return frames; }
    frames.push(clone(s));
    s = clone(s);
  }
  // Fim da rodada: novo turno do caçador, recargas descontadas, defesa extra das presas some.
  s.round += 1; s.phase = 'heroi';
  for (const k of Object.keys(s.cooldowns)) if (s.cooldowns[k] < 999) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - 1);
  frames.push(s);
  return frames;
}

export function flee(prev: HuntState): HuntState {
  const s = clone(prev);
  s.phase = 'fuga';
  line(s, 'sistema', 'Bestiário', `${s.hero.name} recuou. O confronto foi encerrado.`, 'fim');
  return s;
}
