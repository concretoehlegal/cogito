/* Guias de alinhamento (usadas no quadro do Planejador e na ferramenta Mover do Escritor). */
export interface Box { x: number; y: number; w: number; h: number }
export type Guide = { axis: 'x' | 'y'; at: number; from: number; to: number };

/**
 * Guias de alinhamento: encaixa as bordas e os centros da caixa que se move nos das outras fichas (até `tol` de distância).
 * Devolve o deslocamento corrigido e as linhas-guia para desenhar.
 */
export function snapGuides(moving: Box, others: Box[], tol: number): { dx: number; dy: number; guides: Guide[] } {
  const xs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w]; const ys = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
  let bx = { d: tol + 1, v: 0 }; let by = { d: tol + 1, v: 0 };
  for (const o of others) {
    for (const c of [o.x, o.x + o.w / 2, o.x + o.w]) for (const x of xs) { const d = Math.abs(c - x); if (d < bx.d) bx = { d, v: c - x }; }
    for (const c of [o.y, o.y + o.h / 2, o.y + o.h]) for (const y of ys) { const d = Math.abs(c - y); if (d < by.d) by = { d, v: c - y }; }
  }
  const dx = bx.d <= tol ? bx.v : 0; const dy = by.d <= tol ? by.v : 0;
  const m = { x: moving.x + dx, y: moving.y + dy, w: moving.w, h: moving.h };
  const guides: Guide[] = [];
  const mxs = [m.x, m.x + m.w / 2, m.x + m.w]; const mys = [m.y, m.y + m.h / 2, m.y + m.h];
  for (const o of others) {
    for (const c of [o.x, o.x + o.w / 2, o.x + o.w]) if (bx.d <= tol && mxs.some((x) => Math.abs(x - c) < 0.5)) guides.push({ axis: 'x', at: c, from: Math.min(m.y, o.y), to: Math.max(m.y + m.h, o.y + o.h) });
    for (const c of [o.y, o.y + o.h / 2, o.y + o.h]) if (by.d <= tol && mys.some((y) => Math.abs(y - c) < 0.5)) guides.push({ axis: 'y', at: c, from: Math.min(m.x, o.x), to: Math.max(m.x + m.w, o.x + o.w) });
  }
  return { dx, dy, guides };
}
