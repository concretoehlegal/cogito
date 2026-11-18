/*
 * Fórmulas em tabelas, no estilo de planilha: uma célula que começa com "=" é calculada.
 * Referências como A1 (coluna A, linha 1) e intervalos A1:B3; funções SOMA, MÉDIA, MÍN, MÁX, CONT, ARRED, ABS
 * (os nomes em inglês também valem); operadores + − * / ^ e parênteses; vírgula ou ponto como decimal.
 */

export type Grid = string[][];

const FN: Record<string, (args: number[][]) => number> = {
  SOMA: (a) => flat(a).reduce((x, y) => x + y, 0),
  MEDIA: (a) => { const v = flat(a); if (!v.length) throw new Error('#DIV/0'); return v.reduce((x, y) => x + y, 0) / v.length; },
  MIN: (a) => { const v = flat(a); return v.length ? Math.min(...v) : 0; },
  MAX: (a) => { const v = flat(a); return v.length ? Math.max(...v) : 0; },
  CONT: (a) => flat(a).length,
  ARRED: (a) => { const [[x = 0] = [], [n = 0] = []] = a; const k = 10 ** Math.round(n); return Math.round(x * k) / k; },
  ABS: (a) => Math.abs(flat(a)[0] ?? 0),
};
const ALIAS: Record<string, string> = { SUM: 'SOMA', AVERAGE: 'MEDIA', MÉDIA: 'MEDIA', MÍN: 'MIN', MÁX: 'MAX', COUNT: 'CONT', ROUND: 'ARRED' };
const flat = (a: number[][]) => a.flat();

export const colName = (i: number) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const colIndex = (s: string) => s.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

export const isFormula = (text: string) => /^\s*=/.test(text);

/** Converte o texto de uma célula em número (aceita "1,5", "12 PV", "+3"). Vazio conta como nada. */
export function cellNumber(text: string): number | null {
  const m = /^\s*([+-]?\d+(?:[.,]\d+)?)/.exec(text.replace(/ /g, ' '));
  return m ? Number(m[1].replace(',', '.')) : null;
}

type Tok = { t: 'num'; v: number } | { t: 'ref'; c: number; r: number } | { t: 'range'; c1: number; r1: number; c2: number; r2: number } | { t: 'fn'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.toUpperCase();
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    let m = /^([A-Z]{1,3})(\d{1,4})(?::([A-Z]{1,3})(\d{1,4}))?/.exec(s.slice(i));
    if (m && !/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(s.slice(i + m[0].length))) {
      if (m[3]) out.push({ t: 'range', c1: colIndex(m[1]), r1: Number(m[2]) - 1, c2: colIndex(m[3]), r2: Number(m[4]) - 1 });
      else out.push({ t: 'ref', c: colIndex(m[1]), r: Number(m[2]) - 1 });
      i += m[0].length; continue;
    }
    m = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]+(?=\s*\()/.exec(s.slice(i));
    if (m) { out.push({ t: 'fn', v: m[0] }); i += m[0].length; continue; }
    m = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (m) { out.push({ t: 'num', v: Number(m[0].replace(',', '.')) }); i += m[0].length; continue; }
    if ('+-*/^();'.includes(ch)) { out.push({ t: 'op', v: ch === ';' ? ',' : ch }); i++; continue; }
    if (ch === ',') { out.push({ t: 'op', v: ',' }); i++; continue; }
    throw new Error('#ERRO');
  }
  return out;
}

export function evaluate(formula: string, grid: Grid, stack: Set<string> = new Set()): number {
  const toks = tokenize(formula.replace(/^\s*=/, ''));
  let p = 0;
  const peek = () => toks[p];
  const cellValue = (c: number, r: number): number => {
    const key = `${c},${r}`;
    if (r < 0 || r >= grid.length || c < 0 || c >= (grid[r]?.length ?? 0)) throw new Error('#REF');
    if (stack.has(key)) throw new Error('#CICLO');
    const text = grid[r][c] ?? '';
    if (isFormula(text)) { stack.add(key); const v = evaluate(text, grid, stack); stack.delete(key); return v; }
    return cellNumber(text) ?? 0;
  };
  const rangeValues = (c1: number, r1: number, c2: number, r2: number): number[] => {
    const out: number[] = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
        if (r >= grid.length || c >= (grid[r]?.length ?? 0)) throw new Error('#REF');
        const text = grid[r][c] ?? '';
        if (isFormula(text)) out.push(cellValue(c, r));
        else { const n = cellNumber(text); if (n !== null) out.push(n); }
      }
    }
    return out;
  };
  const expect = (v: string) => { const t = peek(); if (!t || t.t !== 'op' || t.v !== v) throw new Error('#ERRO'); p++; };
  function primary(): number {
    const t = peek();
    if (!t) throw new Error('#ERRO');
    if (t.t === 'num') { p++; return t.v; }
    if (t.t === 'ref') { p++; return cellValue(t.c, t.r); }
    if (t.t === 'range') throw new Error('#ERRO');
    if (t.t === 'op' && t.v === '(') { p++; const v = expr(); expect(')'); return v; }
    if (t.t === 'op' && (t.v === '-' || t.v === '+')) { p++; const v = power(); return t.v === '-' ? -v : v; }
    if (t.t === 'fn') {
      p++;
      const name = ALIAS[t.v] ?? t.v;
      const fn = FN[name];
      if (!fn) throw new Error('#NOME');
      expect('(');
      const args: number[][] = [];
      if (!(peek()?.t === 'op' && (peek() as { v: string }).v === ')')) {
        for (;;) {
          const a = peek();
          if (a?.t === 'range') { p++; args.push(rangeValues(a.c1, a.r1, a.c2, a.r2)); } else args.push([expr()]);
          const sep = peek();
          if (sep?.t === 'op' && sep.v === ',') { p++; continue; }
          break;
        }
      }
      expect(')');
      return fn(args);
    }
    throw new Error('#ERRO');
  }
  function power(): number { const b = primary(); const t = peek(); if (t?.t === 'op' && t.v === '^') { p++; return b ** power(); } return b; }
  function term(): number {
    let v = power();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) { p++; const r = power(); if (t.v === '/' && r === 0) throw new Error('#DIV/0'); v = t.v === '*' ? v * r : v / r; } else return v;
    }
  }
  function expr(): number {
    let v = term();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '+' || t.v === '-')) { p++; const r = term(); v = t.v === '+' ? v + r : v - r; } else return v;
    }
  }
  if (!toks.length) throw new Error('#ERRO');
  const v = expr();
  if (p !== toks.length) throw new Error('#ERRO');
  if (!Number.isFinite(v)) throw new Error('#ERRO');
  return v;
}

/** Texto exibido para uma fórmula: o resultado formatado em português, ou o código do erro. */
export function formulaResult(text: string, grid: Grid): string {
  try {
    const v = evaluate(text, grid);
    return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  } catch (e) { return (e as Error).message.startsWith('#') ? (e as Error).message : '#ERRO'; }
}

/* ───────────── documentos (JSON do editor) ───────────── */

interface Node { type: string; content?: Node[]; text?: string; attrs?: Record<string, unknown>; marks?: unknown[] }
const textOf = (n: Node): string => (n.text ?? '') + (n.content ?? []).map(textOf).join(n.type === 'paragraph' ? '' : '');

/** Grade de textos de uma tabela, respeitando células mescladas (a célula ocupa as posições cobertas). */
export function tableGrid(table: Node): Grid {
  const grid: Grid = [];
  (table.content ?? []).forEach((row, r) => {
    grid[r] = grid[r] ?? [];
    let c = 0;
    for (const cell of row.content ?? []) {
      while (grid[r][c] !== undefined) c++;
      const cs = Number(cell.attrs?.colspan ?? 1); const rs = Number(cell.attrs?.rowspan ?? 1);
      const text = (cell.content ?? []).map(textOf).join(' ').trim();
      for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) { grid[r + dr] = grid[r + dr] ?? []; grid[r + dr][c + dc] = dr || dc ? '' : text; }
      c += cs;
    }
  });
  return grid.map((row) => Array.from(row, (x) => x ?? ''));
}

/** Copia o documento trocando o texto das células com fórmula pelo resultado (para exportar). */
export function resolveFormulas<T extends Node>(doc: T): T {
  const walk = (n: Node): Node => {
    if (n.type === 'table') {
      const grid = tableGrid(n);
      return {
        ...n,
        content: (n.content ?? []).map((row) => ({
          ...row,
          content: (row.content ?? []).map((cell) => {
            const text = (cell.content ?? []).map(textOf).join(' ').trim();
            if (!isFormula(text)) return { ...cell, content: (cell.content ?? []).map(walk) };
            const align = cell.content?.[0]?.attrs?.textAlign;
            return { ...cell, content: [{ type: 'paragraph', ...(align ? { attrs: { textAlign: align } } : {}), content: [{ type: 'text', text: formulaResult(text, grid) }] }] };
          }),
        })),
      };
    }
    return n.content ? { ...n, content: n.content.map(walk) } : n;
  };
  return walk(doc) as T;
}
