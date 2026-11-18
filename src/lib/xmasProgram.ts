/*
 * Programa do pisca-pisca clássico, como os controladores de 8 funções das luzes de Natal: as lâmpadas são divididas em
 * 4 grupos alternados ao longo do fio (1, 2, 3, 4, 1, 2…) e cada efeito diz o quanto cada grupo está aceso (0 a 1).
 * O programa passa por todos os efeitos, um após o outro, e recomeça.
 */
export type XmasMode = 'sequencia' | 'alternado' | 'pisca' | 'ondas' | 'respira' | 'cintila' | 'combinado' | 'fixo';

/** Ordem do programa e quanto tempo (s) cada efeito fica. */
export const PROGRAM: { mode: XmasMode; secs: number; label: string }[] = [
  { mode: 'sequencia', secs: 7, label: 'Sequência' },
  { mode: 'alternado', secs: 6, label: 'Alternado' },
  { mode: 'pisca', secs: 5, label: 'Todas piscam' },
  { mode: 'ondas', secs: 7, label: 'Ondas' },
  { mode: 'respira', secs: 7, label: 'Acende e apaga devagar' },
  { mode: 'cintila', secs: 6, label: 'Cintilante' },
  { mode: 'combinado', secs: 8, label: 'Combinação' },
  { mode: 'fixo', secs: 4, label: 'Acesas' },
];
export const CYCLE = PROGRAM.reduce((s, p) => s + p.secs, 0);

export const GROUPS = 4;

/** Qual efeito está tocando num instante (ms desde o começo) e há quanto tempo (s). */
export function programAt(ms: number): { mode: XmasMode; t: number } {
  let s = ((ms / 1000) % CYCLE + CYCLE) % CYCLE;
  for (const p of PROGRAM) {
    if (s < p.secs) return { mode: p.mode, t: s };
    s -= p.secs;
  }
  return { mode: 'fixo', t: 0 };
}

/** Sorteio fixo (o mesmo a cada passo), para a cintilação não depender de Math.random. */
const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const wave = (x: number) => 0.5 + 0.5 * Math.sin(2 * Math.PI * x);

/** Brilho (0 a 1) de um grupo de lâmpadas no efeito, t segundos depois de ele começar. */
export function level(mode: XmasMode, group: number, t: number): number {
  switch (mode) {
    case 'sequencia': return Math.floor(t * 6) % GROUPS === group ? 1 : 0; // uma luz corre pelo fio
    case 'alternado': return Math.floor(t * 2) % 2 === group % 2 ? 1 : 0; // pares e ímpares se revezam
    case 'pisca': return Math.floor(t * 2.5) % 2 === 0 ? 1 : 0; // todas juntas
    case 'ondas': return wave(t / 2 - group / GROUPS); // brilho que passa como onda
    case 'respira': return wave(t / 3.5 - 0.25); // todas acendem e apagam devagar
    case 'cintila': return hash(Math.floor(t * 5), group) > 0.45 ? 1 : 0.15;
    case 'combinado': { // a sequência volta e vai, depois um par fica aceso enquanto o outro pisca
      const step = Math.floor(t * 5);
      if (t < 4) { const k = step % 6; const pos = k < GROUPS ? k : 6 - k; return pos === group ? 1 : 0.1; }
      return group % 2 === 0 ? 1 : step % 2 ? 1 : 0;
    }
    default: return 1;
  }
}
