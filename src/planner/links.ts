/*
 * Ligações do quadro: saem de um dos 4 lados de cada ficha (ou do lado virado para a outra) e podem ser retas,
 * curvas ou em cotovelo, com traço contínuo, tracejado ou pontilhado e pontas diferentes em cada extremo.
 */
import type { LinkCap, LinkDash, LinkKind, LinkSide, PlanLink } from '../game/types';
import type { Box } from './model';

export type Side = Exclude<LinkSide, 'auto'>;
export interface Pt { x: number; y: number }
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];
const NORMAL: Record<Side, Pt> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };

/** Ponto no meio do lado de uma ficha. */
export function sidePoint(b: Box, side: Side): Pt {
  return side === 'top' ? { x: b.x + b.w / 2, y: b.y } : side === 'bottom' ? { x: b.x + b.w / 2, y: b.y + b.h }
    : side === 'left' ? { x: b.x, y: b.y + b.h / 2 } : { x: b.x + b.w, y: b.y + b.h / 2 };
}

/** Lado da ficha virado para um ponto. */
export function sideToward(b: Box, p: Pt): Side {
  const cx = b.x + b.w / 2; const cy = b.y + b.h / 2;
  const dx = (p.x - cx) / Math.max(1, b.w); const dy = (p.y - cy) / Math.max(1, b.h);
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top');
}

/** Lado mais perto de um ponto (para decidir de qual lado uma ligação chega quando é solta em cima da ficha). */
export function nearestSide(b: Box, p: Pt): Side {
  let best: Side = 'top'; let d = Infinity;
  for (const s of SIDES) { const q = sidePoint(b, s); const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (dd < d) { d = dd; best = s; } }
  return best;
}

export interface LinkStyle { kind: LinkKind; dash: LinkDash; startCap: LinkCap; endCap: LinkCap; width: number }
/** Estilo de uma ligação (valores ausentes = como as ligações antigas: reta com seta no fim). */
export const styleOf = (l: Partial<PlanLink>): LinkStyle => ({
  kind: l.kind ?? 'reta', dash: l.dash ?? 'solido', startCap: l.startCap ?? 'nenhuma', endCap: l.endCap ?? 'seta',
  width: Math.max(1, Math.min(8, l.width ?? 2)),
});

/** Estilos prontos, dos mais simples aos mais elaborados. */
export const PRESETS: { id: string; label: string; style: LinkStyle }[] = [
  { id: 'linha', label: 'Linha', style: { kind: 'reta', dash: 'solido', startCap: 'nenhuma', endCap: 'nenhuma', width: 1.5 } },
  { id: 'seta', label: 'Seta', style: { kind: 'reta', dash: 'solido', startCap: 'nenhuma', endCap: 'seta', width: 2 } },
  { id: 'curva', label: 'Curva', style: { kind: 'curva', dash: 'solido', startCap: 'nenhuma', endCap: 'seta', width: 2 } },
  { id: 'fluxo', label: 'Fluxo', style: { kind: 'cotovelo', dash: 'solido', startCap: 'nenhuma', endCap: 'triangulo', width: 2 } },
  { id: 'dupla', label: 'Mão dupla', style: { kind: 'reta', dash: 'solido', startCap: 'triangulo', endCap: 'triangulo', width: 2 } },
  { id: 'pista', label: 'Pista', style: { kind: 'curva', dash: 'tracejado', startCap: 'circulo', endCap: 'seta', width: 2 } },
  { id: 'segredo', label: 'Segredo', style: { kind: 'curva', dash: 'pontilhado', startCap: 'nenhuma', endCap: 'losango', width: 2.5 } },
  { id: 'rompido', label: 'Rompido', style: { kind: 'cotovelo', dash: 'tracejado', startCap: 'barra', endCap: 'barra', width: 3 } },
];

/** Estilo das ligações novas (o último usado neste computador). */
export function newLinkStyle(): LinkStyle {
  try { const v = JSON.parse(localStorage.getItem('cogito.planLinkStyle') || 'null'); if (v && v.kind) return styleOf(v); } catch { /* sem preferência */ }
  return PRESETS[2].style;
}
export function rememberLinkStyle(s: LinkStyle) { try { localStorage.setItem('cogito.planLinkStyle', JSON.stringify(s)); } catch { /* ignora */ } }

export const dashArray = (dash: LinkDash, w: number) => (dash === 'tracejado' ? `${w * 4} ${w * 3}` : dash === 'pontilhado' ? `0 ${w * 2.6}` : undefined);

export interface LinkGeom { d: string; start: Pt & { angle: number }; end: Pt & { angle: number }; mid: Pt }

const angle = (from: Pt, to: Pt) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Caminho de uma ligação entre duas fichas (b pode ser só um ponto, enquanto se arrasta).
 * Ângulos: direção em que a linha "entra" em cada ponta, para desenhar as pontas.
 */
export function linkGeom(a: Box, aSide: LinkSide | undefined, b: Box | Pt, bSide: LinkSide | undefined, kind: LinkKind): LinkGeom {
  const bBox = 'w' in b ? (b as Box) : null;
  const bc = bBox ? { x: bBox.x + bBox.w / 2, y: bBox.y + bBox.h / 2 } : (b as Pt);
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const sa: Side = !aSide || aSide === 'auto' ? sideToward(a, bc) : aSide;
  const p1 = sidePoint(a, sa);
  const sb: Side | null = bBox ? (!bSide || bSide === 'auto' ? sideToward(bBox, ac) : bSide) : null;
  const p2 = bBox && sb ? sidePoint(bBox, sb) : (b as Pt);
  const n1 = NORMAL[sa];
  const n2: Pt = sb ? NORMAL[sb] : (() => { const dx = p1.x - p2.x; const dy = p1.y - p2.y; return Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 }; })();

  if (kind === 'curva') {
    const k = Math.max(40, dist(p1, p2) * 0.42);
    const c1 = { x: p1.x + n1.x * k, y: p1.y + n1.y * k }; const c2 = { x: p2.x + n2.x * k, y: p2.y + n2.y * k };
    const at = (t: number) => { const u = 1 - t; return { x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x, y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y }; };
    return { d: `M${p1.x} ${p1.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`, start: { ...p1, angle: angle(c1, p1) }, end: { ...p2, angle: angle(c2, p2) }, mid: at(0.5) };
  }
  if (kind === 'cotovelo') {
    const off = 24;
    const o1 = { x: p1.x + n1.x * off, y: p1.y + n1.y * off }; const o2 = { x: p2.x + n2.x * off, y: p2.y + n2.y * off };
    const h1 = n1.y === 0; const h2 = n2.y === 0;
    let pts: Pt[];
    if (h1 && h2) { const mx = (o1.x + o2.x) / 2; pts = [p1, o1, { x: mx, y: o1.y }, { x: mx, y: o2.y }, o2, p2]; }
    else if (!h1 && !h2) { const my = (o1.y + o2.y) / 2; pts = [p1, o1, { x: o1.x, y: my }, { x: o2.x, y: my }, o2, p2]; }
    else if (h1) pts = [p1, o1, { x: o2.x, y: o1.y }, o2, p2];
    else pts = [p1, o1, { x: o1.x, y: o2.y }, o2, p2];
    pts = pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 0.5);
    const total = pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);
    let mid = pts[0]; let run = 0;
    for (let i = 1; i < pts.length; i++) { const l = dist(pts[i - 1], pts[i]); if (run + l >= total / 2) { const t = (total / 2 - run) / Math.max(l, 1e-6); mid = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }; break; } run += l; }
    return { d: `M${pts.map((p) => `${p.x} ${p.y}`).join('L')}`, start: { ...p1, angle: angle(pts[1] ?? p2, p1) }, end: { ...p2, angle: angle(pts[pts.length - 2] ?? p1, p2) }, mid };
  }
  return { d: `M${p1.x} ${p1.y}L${p2.x} ${p2.y}`, start: { ...p1, angle: angle(p2, p1) }, end: { ...p2, angle: angle(p1, p2) }, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

/** Desenho de uma ponta, apontando para +x a partir da origem (a ponta fica em 0,0). */
export function capPath(cap: LinkCap, w: number): { d: string; fill: boolean } | null {
  const s = Math.max(1, w);
  switch (cap) {
    case 'seta': return { d: `M${-4.2 * s - 4} ${-2.6 * s - 2.5}L0 0L${-4.2 * s - 4} ${2.6 * s + 2.5}`, fill: false };
    case 'triangulo': return { d: `M0 0L${-4.6 * s - 5} ${-2.4 * s - 3}L${-4.6 * s - 5} ${2.4 * s + 3}Z`, fill: true };
    case 'circulo': { const r = 1.6 * s + 2.2; return { d: `M${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, fill: true }; }
    case 'losango': { const r = 2.2 * s + 3; return { d: `M0 0L${-r} ${-r * 0.62}L${-2 * r} 0L${-r} ${r * 0.62}Z`, fill: true }; }
    case 'barra': return { d: `M${-1.5 * s - 1} ${-2.8 * s - 3}L${-1.5 * s - 1} ${2.8 * s + 3}`, fill: false };
    default: return null;
  }
}

/** Quanto a linha recua em cada ponta para não aparecer por baixo de uma ponta cheia. */
export function capInset(cap: LinkCap, w: number): number {
  const s = Math.max(1, w);
  return cap === 'triangulo' ? 4.6 * s + 4 : cap === 'losango' ? 2 * (2.2 * s + 3) - 1 : cap === 'circulo' ? 2 * (1.6 * s + 2.2) - 1 : 0;
}
