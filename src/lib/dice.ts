/* Rolagem de dados local (sem serviços externos). */

export interface DiceTerm { sign: 1 | -1; count: number; sides: number }
export interface ConstTerm { sign: 1 | -1; value: number }
export type Term = DiceTerm | ConstTerm;

export interface RollPart { text: string; rolls: number[]; subtotal: number }
export interface RollResult { id: string; formula: string; total: number; parts: RollPart[]; at: number }

export const HISTORY_LIMIT = 6;
export const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

const isDice = (t: Term): t is DiceTerm => 'sides' in t;

/** Interpreta fórmulas como "2d6+3", "d20", "1d8 + 2d4 - 1" ou "d%". */
export function parseFormula(input: string): Term[] {
  const src = input.replace(/\s+/g, '').toLowerCase().replace(/d%/g, 'd100');
  if (!src) throw new Error('Digite uma fórmula, por exemplo 2d6+3.');
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(src)) {
    throw new Error('Fórmula inválida. Use o formato 2d6+3.');
  }
  const terms: Term[] = [];
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3] !== undefined) {
      const count = m[2] ? Number(m[2]) : 1;
      const sides = Number(m[3]);
      if (count < 1 || count > 100) throw new Error('Use de 1 a 100 dados por termo.');
      if (sides < 2 || sides > 1000) throw new Error('O dado deve ter de 2 a 1000 lados.');
      terms.push({ sign, count, sides });
    } else {
      const value = Number(m[4]);
      if (value > 100000) throw new Error('Número grande demais.');
      terms.push({ sign, value });
    }
  }
  if (!terms.some(isDice)) throw new Error('Inclua pelo menos um dado, por exemplo 1d20.');
  return terms;
}

/** Inteiro uniforme em [1, sides], sem viés de módulo. */
export function rollDie(sides: number, random: () => number = secureUint32): number {
  const limit = Math.floor(0x100000000 / sides) * sides;
  let x: number;
  do { x = random(); } while (x >= limit);
  return (x % sides) + 1;
}
function secureUint32(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

export function normalizeFormula(terms: Term[]): string {
  return terms.map((t, i) => {
    const body = isDice(t) ? `${t.count}d${t.sides}` : String(t.value);
    return (t.sign < 0 ? '-' : i ? '+' : '') + body;
  }).join('');
}

export function roll(input: string, random?: () => number): RollResult {
  const terms = parseFormula(input);
  const parts: RollPart[] = terms.map((t) => {
    if (isDice(t)) {
      const rolls = Array.from({ length: t.count }, () => rollDie(t.sides, random));
      return { text: `${t.sign < 0 ? '-' : ''}${t.count}d${t.sides}`, rolls, subtotal: t.sign * rolls.reduce((a, b) => a + b, 0) };
    }
    return { text: `${t.sign < 0 ? '-' : '+'}${t.value}`, rolls: [], subtotal: t.sign * t.value };
  });
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    formula: normalizeFormula(terms),
    total: parts.reduce((a, p) => a + p.subtotal, 0),
    parts,
    at: Date.now(),
  };
}

/** Acrescenta uma rolagem ao histórico, mantendo só as mais recentes (a mais antiga sai). */
export function pushHistory(history: RollResult[], r: RollResult, limit = HISTORY_LIMIT): RollResult[] {
  return [r, ...history].slice(0, limit);
}
