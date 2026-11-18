/*
 * Motor do Bestiário: combate em turnos entre um caçador (personagem da campanha) e uma ou mais criaturas.
 * As cartas do personagem viram ações (dano, cura ou defesa), com recarga em turnos, custo em barra e consumíveis.
 * Os inimigos seguem um perfil de IA; o perfil "agressiva" escolhe sempre o golpe que tira mais vida no menor tempo
 * (dano esperado, somado a um bônus pela chance de derrubar o caçador já neste turno).
 */
import { roll } from '../lib/dice.ts';
import type { Actor, Card, CombatAction } from '../game/types.ts';
import { numOf, roleStat, type CombatRules, type RuleSystem } from '../game/system.ts';

export type Effect = 'dano' | 'cura' | 'defesa';
export interface HuntBar { id: string; name: string; short: string; color: string; cur: number; max: number }
export interface Combatant {
  id: string; name: string; color: string; image: string | null; emblem: string; kind: 'pc' | 'npc' | 'enemy'; boss: boolean;
  hp: number; max: number; defense: number; guard: number; actions: CombatAction[]; ai: string;
  actorId: string; armor: number;
}
/** Como o sistema da campanha resolve os ataques, e os nomes que aparecem no registro. */
export interface HuntRules extends CombatRules { hpName: string; hpShort: string; defName: string; defShort: string }
export const DEFAULT_RULES: HuntRules = { hit: 'contra-defesa', crit: 'max', armor: false, defaultHit: '1d20', hpName: 'Vida', hpShort: 'PV', defName: 'Defesa', defShort: 'DEF' };
export function rulesOf(sys: RuleSystem): HuntRules {
  const hp = roleStat(sys, 'vida', 'personagem') ?? roleStat(sys, 'vida', 'inimigo');
  const def = roleStat(sys, 'defesa', 'personagem') ?? roleStat(sys, 'defesa', 'inimigo');
  return { ...sys.combat, hpName: hp?.name ?? 'Vida', hpShort: hp?.short || 'PV', defName: def?.name ?? 'Defesa', defShort: def?.short || 'DEF' };
}
export interface HuntAction {
  id: string; source: 'ataque' | 'carta'; name: string; icon: string; effect: Effect; hit: string; value: string;
  cooldown: number; costBar: string | null; cost: number; consumable: boolean; card: Card | null; color: string;
}
export interface Hero extends Combatant { bars: HuntBar[]; hpBar: HuntBar | null; actionsList: HuntAction[]; equipped: Card[]; passives: Card[]; combatActions: number; moveActions: number }
export type LineKind = 'acerto' | 'critico' | 'erro' | 'cura' | 'defesa' | 'intencao' | 'info' | 'fim' | 'fala';
export interface LogLine { id: number; round: number; side: 'heroi' | 'inimigo' | 'sistema'; actor: string; text: string; detail?: string; kind: LineKind; dmg?: number; target?: string }
export type Phase = 'heroi' | 'inimigos' | 'vitoria' | 'derrota' | 'fuga';
export interface HuntState {
  round: number; phase: Phase; hero: Hero; enemies: Combatant[];
  /** Regras de combate do sistema da campanha. */
  rules: HuntRules;
  /** Ações de combate que o caçador ainda tem neste turno. */
  left?: number;
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
/** Custo em recurso: "2 Alma" ou "2 PE" gasta 2 do recurso com esse nome ou sigla. Outros textos ($800, 1 ação) não gastam nada. */
export function parseCost(text: string, bars: { name: string; short?: string }[]): { bar: string | null; n: number } {
  const m = String(text || '').trim().match(/^(\d+)\s+(.+)$/);
  if (!m) return { bar: null, n: 0 };
  const name = m[2].toLowerCase();
  const bar = bars.find((b) => { const nm = b.name.toLowerCase(); const sh = (b.short ?? '').toLowerCase(); return nm === name || (sh && sh === name) || nm.startsWith(name) || name.startsWith(nm); });
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
/** Dano que passa depois da redução (armadura, proteção), dobrado no crítico. */
const dealt = (v: number, mult: number, red: number) => Math.max(0, Math.max(0, v) * mult - red);
const mean = (d: Map<number, number>, red = 0) => { let m = 0; for (const [v, p] of d) m += dealt(v, 1, red) * p; return m; };
/** Média do dano que realmente conta: o que passa da vida restante é desperdício. */
const meanCapped = (d: Map<number, number>, cap: number, mult = 1, red = 0) => { let m = 0; for (const [v, p] of d) m += Math.min(cap, dealt(v, mult, red)) * p; return m; };
const atLeast = (d: Map<number, number>, x: number, mult = 1, red = 0) => { let q = 0; for (const [v, p] of d) if (dealt(v, mult, red) >= x) q += p; return q; };
/** Primeiro termo da fórmula, quando é um dado positivo (ex.: o d20 de "1d20+5", os 2d12 de "2d12+2"). */
const firstDie = (formula: string) => { const t = termsOf(formula)[0]; return 'sides' in t && t.sign > 0 ? t : null; };
/** Fórmula sem o primeiro dado (ou sem os dois primeiros, se `two`). */
const restOf = (formula: string, two = false) => {
  const terms = termsOf(formula); const f = terms[0];
  const out: string[] = [];
  if ('sides' in f && f.count > (two ? 2 : 1)) out.push(`${f.count - (two ? 2 : 1)}d${f.sides}`);
  for (const t of terms.slice(1)) out.push(`${t.sign < 0 ? '-' : '+'}${'sides' in t ? `${t.count}d${t.sides}` : t.value}`);
  return out.join('').replace(/^\+/, '') || '0';
};
/**
 * Chance de um valor percentual (Call of Cthulhu): "50", "Lutar 55" → 50, 55 (entre 1 e 99).
 * Uma fórmula de dados (ação feita em outro sistema, como "1d20+5") não é uma chance: vale 50%.
 */
export const percentOf = (hit: string) => (/\d*d\d/i.test(hit) ? 50 : Math.max(1, Math.min(99, numOf(hit, 50))));

/**
 * Chance de acerto e de crítico de uma rolagem contra uma defesa, conforme as regras do sistema:
 * contra a defesa (com 1 natural errando e crítico pelo dado máximo, por 10 acima ou por dados iguais), porcentagem (d100) ou automático.
 */
export function hitChances(hit: string, defense: number, rules: Pick<CombatRules, 'hit' | 'crit'> = DEFAULT_RULES): { normal: number; crit: number } {
  if (!hit || rules.hit === 'automatico') return { normal: 1, crit: 0 };
  if (rules.hit === 'percentual') {
    const p = percentOf(hit) / 100;
    const crit = rules.crit === 'extremo' ? Math.floor(percentOf(hit) / 5) / 100 : 0;
    return { normal: Math.max(0, p - crit), crit };
  }
  const die = firstDie(hit);
  if (!die || rules.crit === 'nenhum' || rules.crit === 'extremo') return { normal: atLeast(distribution(hit), defense), crit: 0 };
  if (rules.crit === 'iguais') {
    if (die.count < 2) return { normal: atLeast(distribution(hit), defense), crit: 0 };
    const rest = distribution(restOf(hit, true)); const s = die.sides;
    let normal = 0; let crit = 0;
    for (let a = 1; a <= s; a++) for (let b = 1; b <= s; b++) {
      const pf = 1 / (s * s);
      if (a === b) { crit += pf; continue; }
      for (const [v, p] of rest) if (a + b + v >= defense) normal += pf * p;
    }
    return { normal, crit };
  }
  if (die.count !== 1) return { normal: atLeast(distribution(hit), defense), crit: 0 };
  // Um dado na frente: o 1 natural erra sempre; o máximo acerta com crítico ("max") ou só dá crítico se passar por 10 ("dez").
  const rest = distribution(restOf(hit)); const s = die.sides;
  let normal = 0; let crit = 0;
  for (let face = 1; face <= s; face++) {
    for (const [v, p] of rest) {
      const pf = p / s; const total = face + v;
      if (face === 1) continue;
      if (rules.crit === 'max') { if (face === s) crit += pf; else if (total >= defense) normal += pf; }
      else if (face === s && s === 20) crit += pf;
      else if (total >= defense + 10) crit += pf;
      else if (total >= defense) normal += pf;
    }
  }
  return { normal, crit };
}

/* ───────────── IA dos inimigos ───────────── */

export interface AiChoice { index: number; expected: number; chance: number; kill: number; reason: string }
type AiProfile = (me: Combatant, hero: Hero, rules: HuntRules) => AiChoice;
/** Defesa efetiva do alvo e o quanto do dano ele segura (armadura e proteção). Fora do modo "contra a defesa", a proteção vira redução de dano. */
export function defenseOf(foe: Combatant, rules: HuntRules) {
  const vsDef = rules.hit === 'contra-defesa';
  return { def: foe.defense + (vsDef ? foe.guard : 0), red: (rules.armor ? foe.armor : 0) + (vsDef ? 0 : foe.guard) };
}

/**
 * Agressiva: escolhe o golpe que tira, em média, a maior parte da vida que resta ao caçador neste turno
 * (dano acima da vida restante não conta), com um pequeno peso extra para a chance de derrubá-lo agora.
 * Com o caçador inteiro isso é o maior dano esperado; quase caindo, é o golpe mais certeiro.
 */
const agressiva: AiProfile = (me, hero, rules) => {
  const { def, red } = defenseOf(hero, rules);
  let best: AiChoice | null = null; let bestScore = -1; let bestMax = -1;
  me.actions.forEach((a, index) => {
    if (!a.dmg) return;
    const { normal, crit } = hitChances(a.hit, def, rules);
    const dmg = distribution(a.dmg);
    const expected = normal * mean(dmg, red) + crit * meanCapped(dmg, Infinity, 2, red);
    const kill = normal * atLeast(dmg, hero.hp, 1, red) + crit * atLeast(dmg, hero.hp, 2, red);
    const useful = normal * meanCapped(dmg, hero.hp, 1, red) + crit * meanCapped(dmg, hero.hp, 2, red);
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
export const chooseAction = (me: Combatant, hero: Hero, rules: HuntRules = DEFAULT_RULES): AiChoice => (AI[me.ai] ?? AI.agressiva).choose(me, hero, rules);

/* ───────────── montagem ───────────── */

const ICON_OF: Record<string, string> = { item: 'revolver', habilidade: 'raio', feitico: 'vela' };

/** Ações do caçador: ataques da ficha (combate) e cartas com efeito na caçada. */
export function heroActions(actor: Actor, bars: { name: string; short?: string }[] = actor.resources): HuntAction[] {
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

function combatant(actor: Actor, name: string, id: string): Combatant {
  const max = Math.max(1, actor.hp || 10);
  return {
    id, name, color: actor.color, image: actor.image, emblem: actor.emblem, kind: actor.kind, boss: !!actor.boss,
    hp: max, max, defense: Number.isFinite(actor.defense) ? actor.defense : 10, guard: 0,
    // Criaturas usam 2 habilidades; chefes, 4.
    actions: (actor.actions.length ? actor.actions : [{ name: 'Ataque', hit: '1d20', dmg: '1d4' }]).slice(0, actor.kind === 'enemy' ? (actor.boss ? 4 : 2) : 8),
    ai: actor.ai || 'agressiva', actorId: actor.id, armor: actor.armor ?? 0,
  };
}

const BAR_COLORS = ['#9a9a9a', '#7aa7d6', '#a493c4', '#d8c26a'];
export function newHunt(campaign: { system?: RuleSystem; rules?: HuntRules }, heroActor: Actor, prey: Actor[], rng?: Rng): HuntState {
  const rules = campaign.rules ?? (campaign.system ? rulesOf(campaign.system) : DEFAULT_RULES);
  const base = combatant(heroActor, heroActor.name, 'heroi');
  const bars: HuntBar[] = heroActor.resources.filter((r) => r.max > 0).map((r, i) => ({ id: r.id, name: r.name, short: r.short, color: BAR_COLORS[i % BAR_COLORS.length], cur: r.max, max: r.max }));
  const hero: Hero = {
    ...base, bars, hpBar: { id: 'vida', name: rules.hpName, short: rules.hpShort, color: '#c8463c', cur: base.hp, max: base.max },
    actionsList: heroActions(heroActor, heroActor.resources), equipped: heroActor.cards.filter((c) => c.equipped), passives: heroActor.cards.filter((c) => c.mode === 'passivo'),
    combatActions: Math.max(1, Math.min(9, Math.round(heroActor.combatActions ?? 1))), moveActions: Math.max(0, Math.round(heroActor.moveActions ?? 0)),
  };
  const count = new Map<string, number>();
  const enemies = prey.map((a, i) => {
    const n = (count.get(a.id) ?? 0) + 1; count.set(a.id, n);
    const total = prey.filter((x) => x.id === a.id).length;
    return combatant(a, total > 1 ? `${a.name} ${n}` : a.name, `presa-${i}`);
  });
  const uses: Record<string, number> = {};
  for (const a of hero.actionsList) if (a.consumable && a.card) uses[a.id] = a.card.qty;
  const s: HuntState = { round: 1, phase: 'heroi', rules, hero, enemies, cooldowns: {}, uses, log: [], seq: 0, stats: { dealt: 0, taken: 0, healed: 0, crits: 0, turns: 0 }, left: hero.combatActions };
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

/** Rola o acerto conforme as regras do sistema: devolve se acertou, se foi crítico e o texto do registro. */
export function rollHit(rules: HuntRules, hit: string, def: number, rng?: Rng): { ok: boolean; crit: boolean; detail: string } {
  if (!hit || rules.hit === 'automatico') return { ok: true, crit: false, detail: 'acerto automático' };
  if (rules.hit === 'percentual') {
    const chance = percentOf(hit); const r = roll('1d100', rngFn(rng)).total;
    const crit = rules.crit === 'extremo' && r <= Math.floor(chance / 5);
    const fumble = r === 100 || (chance < 50 && r >= 96);
    const ok = !fumble && r <= chance;
    return { ok, crit: ok && crit, detail: `1d100 = ${r} contra ${chance}%${crit && ok ? ' · extremo!' : fumble ? ' · desastre' : ''}` };
  }
  const r = roll(hit, rngFn(rng));
  const die = firstDie(hit);
  const faces = r.parts[0]?.rolls ?? [];
  let crit = false; let fumble = false;
  if (die && die.count === 1 && rules.crit !== 'nenhum' && rules.crit !== 'iguais' && rules.crit !== 'extremo') {
    fumble = faces[0] === 1;
    crit = rules.crit === 'max' ? faces[0] === die.sides : (faces[0] === 20 && die.sides === 20) || r.total >= def + 10;
  } else if (die && die.count >= 2 && rules.crit === 'iguais') crit = faces[0] === faces[1];
  const ok = crit || (!fumble && r.total >= def);
  return { ok, crit: ok && crit, detail: `${r.formula} = ${r.total} contra ${rules.defName} ${def}${crit && ok ? ' · crítico!' : fumble ? ' · falha crítica' : ''}` };
}

/** Golpe: acerto conforme o sistema; crítico dobra o dano; armadura (se o sistema usa) e proteção descontam. */
function attack(s: HuntState, side: 'heroi' | 'inimigo', me: Combatant, foe: Combatant, name: string, hit: string, dmgF: string, rng?: Rng) {
  const rules = s.rules ?? DEFAULT_RULES;
  const { def, red } = defenseOf(foe, rules);
  const { ok, crit, detail: d0 } = rollHit(rules, hit, def, rng);
  let detail = d0;
  if (!ok) { line(s, side, me.name, `${name}: errou ${foe.name}.`, 'erro', { detail, target: foe.id }); return 0; }
  const raw = Math.max(0, roll(dmgF, rngFn(rng)).total) * (crit ? 2 : 1);
  const dmg = Math.max(0, raw - red);
  if (red > 0) detail += ` · ${raw} − ${red} de proteção`;
  foe.hp = Math.max(0, foe.hp - dmg);
  line(s, side, me.name, `${name}: ${crit ? 'CRÍTICO! ' : ''}${dmg} de dano em ${foe.name}.`, crit ? 'critico' : 'acerto', { detail, dmg, target: foe.id });
  if (crit) s.stats.crits += 1;
  if (foe.hp <= 0) line(s, 'sistema', 'Bestiário', `${foe.name} caiu.`, 'fim', { target: foe.id });
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
  const perTurn = s.hero.combatActions ?? 1;
  const left = s.left ?? perTurn;
  if (left >= perTurn) s.hero.guard = 0; // a defesa extra some no começo do turno, não entre as ações dele
  if (a.effect === 'dano') {
    const alive = s.enemies.filter((e) => e.hp > 0);
    const target = alive.find((e) => e.id === targetId) ?? alive[0];
    if (!target) throw new Error('Nenhuma criatura de pé.');
    s.stats.dealt += attack(s, 'heroi', s.hero, target, a.name, a.hit, a.value, rng);
  } else if (a.effect === 'cura') {
    const v = Math.max(0, roll(a.value, rngFn(rng)).total);
    const healed = Math.min(v, s.hero.max - s.hero.hp);
    s.hero.hp += healed; s.stats.healed += healed;
    line(s, 'heroi', s.hero.name, `${a.name}: recupera ${healed} de ${(s.rules ?? DEFAULT_RULES).hpName}.`, 'cura', { detail: `${a.value} = ${v}` });
  } else {
    const v = Math.max(0, roll(a.value, rngFn(rng)).total);
    s.hero.guard = v;
    const vsDef = (s.rules ?? DEFAULT_RULES).hit === 'contra-defesa';
    line(s, 'heroi', s.hero.name, vsDef ? `${a.name}: +${v} de ${(s.rules ?? DEFAULT_RULES).defName} até o próximo turno.` : `${a.name}: segura ${v} de dano até o próximo turno.`, 'defesa', { detail: `${a.value} = ${v}` });
  }
  if (s.hero.hpBar) s.hero.hpBar.cur = s.hero.hp;
  s.stats.turns += 1;
  if (s.enemies.every((e) => e.hp <= 0)) { s.phase = 'vitoria'; line(s, 'sistema', 'Bestiário', `Vitória! ${s.hero.name} abateu todas as criaturas em ${s.round} rodada(s).`, 'fim'); return s; }
  s.left = left - 1;
  if (s.left > 0) { line(s, 'sistema', 'Bestiário', `${s.hero.name} ainda tem ${s.left} ${s.left === 1 ? 'ação' : 'ações'} de combate neste turno.`, 'info'); return s; }
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
    const choice = chooseAction(e, s.hero, s.rules ?? DEFAULT_RULES);
    const act = e.actions[choice.index];
    line(s, 'inimigo', e.name, `${e.name} vai de ${act.name} (${choice.reason}: ${Math.round(choice.chance * 100)}% de acerto, ≈ ${fmt(choice.expected)} de dano esperado).`, 'intencao');
    frames.push(clone(s));
    s.stats.taken += attack(s, 'inimigo', e, s.hero, act.name, act.hit, act.dmg, rng);
    if (s.hero.hpBar) s.hero.hpBar.cur = s.hero.hp;
    if (s.hero.hp <= 0) { s.phase = 'derrota'; line(s, 'sistema', 'Bestiário', 'O confronto acabou.', 'fim'); frames.push(clone(s)); return frames; }
    frames.push(clone(s));
    s = clone(s);
  }
  // Fim da rodada: novo turno do caçador, recargas descontadas, defesa extra das presas some.
  s.round += 1; s.phase = 'heroi'; s.left = s.hero.combatActions ?? 1;
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
