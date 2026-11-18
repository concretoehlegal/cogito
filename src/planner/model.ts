/* Planejador: tipos de ficha do quadro, valores padrão, links [[…]] e conversão para o Bestiário. */
import type { Actor, BarDef, NodeType, PlanNode, Sheet } from '../game/types.ts';

export interface TypeDef { label: string; plural: string; icon: string; color: string; w: number; h: number; char?: boolean }
export const TYPES: Record<NodeType, TypeDef> = {
  personagem: { label: 'Personagem', plural: 'Personagens', icon: 'detetive', color: '#c99a62', w: 200, h: 273, char: true },
  npc: { label: 'NPC', plural: 'NPCs', icon: 'pessoa', color: '#a493c4', w: 200, h: 273, char: true },
  inimigo: { label: 'Inimigo', plural: 'Inimigos', icon: 'garra', color: '#d77a6e', w: 200, h: 273, char: true },
  local: { label: 'Local', plural: 'Locais', icon: 'mapa', color: '#7aa7d6', w: 320, h: 240 },
  item: { label: 'Item', plural: 'Itens', icon: 'chave', color: '#d8c26a', w: 280, h: 200 },
  faccao: { label: 'Facção', plural: 'Facções', icon: 'sigilo', color: '#a48bb8', w: 280, h: 200 },
  sessao: { label: 'Sessão', plural: 'Sessões', icon: 'livro', color: '#b8ff2c', w: 300, h: 240 },
  nota: { label: 'Nota', plural: 'Notas', icon: 'pergaminho', color: '#d4d4d4', w: 300, h: 220 },
  imagem: { label: 'Imagem', plural: 'Imagens', icon: 'camera', color: '#9a9a9a', w: 320, h: 230 },
  moldura: { label: 'Moldura', plural: 'Molduras', icon: 'mapa', color: '#8a8a8a', w: 680, h: 440 },
};
export const ORDER: NodeType[] = ['personagem', 'npc', 'inimigo', 'local', 'item', 'faccao', 'sessao', 'nota', 'imagem', 'moldura'];
export const CARD_RATIO = 300 / 220;
export const isChar = (t: NodeType) => !!TYPES[t].char;

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const defaultSheet = (type: NodeType): Sheet => ({
  life: type === 'inimigo' ? 12 : 20, defense: type === 'inimigo' ? 11 : 12, resilience: 0, soul: type === 'inimigo' ? 0 : 3, boss: false,
  attrs: [], actions: [{ name: type === 'inimigo' ? 'Garra' : 'Ataque', hit: '1d20+2', dmg: '1d6' }], cards: [], ai: 'agressiva',
});

export function newNode(type: NodeType, x: number, y: number, extra: Partial<PlanNode> = {}): PlanNode {
  const d = TYPES[type];
  const titles: Record<NodeType, string> = {
    personagem: 'Novo personagem', npc: 'Novo NPC', inimigo: 'Nova criatura', local: 'Novo local', item: 'Novo item',
    faccao: 'Nova facção', sessao: 'Nova sessão', nota: '', imagem: '', moldura: 'Nova moldura',
  };
  return {
    id: uid('n'), type, x: Math.round(x - d.w / 2), y: Math.round(y - d.h / 2), w: d.w, h: d.h,
    title: titles[type], subtitle: '', color: d.color, icon: d.icon, image: null, body: '', tags: [],
    ...(isChar(type) ? { sheet: defaultSheet(type) } : {}), ...extra,
  };
}

/* ───────────── texto e [[links]] ───────────── */

export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const LINK = /\[\[([^\]\n]{1,80})\]\]/g;

/** Títulos citados no texto como [[Título]]. */
export function linksIn(body: string): string[] {
  const out: string[] = []; let m: RegExpExecArray | null;
  LINK.lastIndex = 0;
  while ((m = LINK.exec(body))) out.push(m[1].trim());
  return out;
}
/** Trechos do texto: texto comum e links (para desenhar os links como etiquetas clicáveis). */
export function segments(body: string): ({ text: string } | { link: string })[] {
  const out: ({ text: string } | { link: string })[] = []; let last = 0; let m: RegExpExecArray | null;
  LINK.lastIndex = 0;
  while ((m = LINK.exec(body))) {
    if (m.index > last) out.push({ text: body.slice(last, m.index) });
    out.push({ link: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last) });
  return out;
}
export const findByTitle = (nodes: PlanNode[], title: string) => { const t = norm(title); return nodes.find((n) => n.title && norm(n.title) === t) ?? null; };
/** Fichas que citam esta ([[Título]] no texto). */
export const backlinks = (nodes: PlanNode[], node: PlanNode) => (node.title ? nodes.filter((n) => n.id !== node.id && linksIn(n.body).some((l) => norm(l) === norm(node.title))) : []);

/** Busca sem acento em título, subtítulo, texto e etiquetas. */
export const matches = (n: PlanNode, q: string) => { const t = norm(q); return !t || [n.title, n.subtitle, n.body, ...n.tags].some((x) => norm(x).includes(t)); };

/* ───────────── geometria ───────────── */

export interface Box { x: number; y: number; w: number; h: number }
export const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** Ponto em que a reta do centro de A até B sai da borda de A. */
export function edgePoint(a: Box, toward: { x: number; y: number }) {
  const c = center(a); const dx = toward.x - c.x; const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? (a.w / 2) / Math.abs(dx) : Infinity; const sy = dy ? (a.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}
export const inside = (inner: Box, outer: Box) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

/** Visão que enquadra todas as fichas na área visível. */
export function fitView(nodes: Box[], vw: number, vh: number) {
  if (!nodes.length) return { x: vw / 2, y: vh / 2, zoom: 1 };
  const minX = Math.min(...nodes.map((n) => n.x)); const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)); const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  const zoom = Math.max(0.15, Math.min(1.4, Math.min((vw - 120) / (maxX - minX || 1), (vh - 120) / (maxY - minY || 1))));
  return { x: vw / 2 - ((minX + maxX) / 2) * zoom, y: vh / 2 - ((minY + maxY) / 2) * zoom, zoom };
}

/* ───────────── Bestiário ───────────── */

export const HUNT_BARS: BarDef[] = [{ id: 'vida', name: 'Vida', color: '#c8463c' }, { id: 'alma', name: 'Alma', color: '#8d5aa3' }];

/** Ficha do quadro no formato usado pelas cartas de personagem e pelo Bestiário. */
export function nodeActor(n: PlanNode): Actor {
  const s = n.sheet ?? defaultSheet(n.type);
  const kind = n.type === 'inimigo' ? 'enemy' : n.type === 'npc' ? 'npc' : 'pc';
  return {
    id: n.id, kind, name: n.title || TYPES[n.type].label, subtitle: n.subtitle, color: n.color, image: n.image,
    bars: { vida: { cur: s.life, max: s.life }, alma: { cur: s.soul, max: s.soul } },
    attrs: s.attrs, defense: s.defense, actions: s.actions, cards: s.cards, emblem: n.icon, boss: kind === 'enemy' && s.boss,
    ai: s.ai || 'agressiva', resilience: s.resilience, soul: s.soul, caps: s.caps ?? [],
    origin: s.origin ?? '', level: s.level, affiliation: s.affiliation ?? '', cliche: s.cliche ?? '',
    combatActions: Math.max(1, Math.min(9, Math.round(s.combatActions ?? 1))), moveActions: Math.max(0, Math.round(s.moveActions ?? 0)),
  };
}

/** Posição livre mais próxima de (x, y) para uma ficha w × h, sem cobrir outras fichas (molduras não contam). */
export function freeSpot(nodes: Box[], x: number, y: number, w: number, h: number, gap = 24) {
  const hits = (bx: number, by: number) => nodes.some((n) => bx < n.x + n.w + gap && bx + w + gap > n.x && by < n.y + n.h + gap && by + h + gap > n.y);
  const x0 = Math.round(x - w / 2); const y0 = Math.round(y - h / 2);
  if (!hits(x0, y0)) return { x: x0, y: y0 };
  const step = 60;
  for (let ring = 1; ring < 40; ring++) {
    for (let i = -ring; i <= ring; i++) {
      for (const [dx, dy] of [[i, -ring], [i, ring], [-ring, i], [ring, i]]) {
        const bx = x0 + dx * step; const by = y0 + dy * step;
        if (!hits(bx, by)) return { x: bx, y: by };
      }
    }
  }
  return { x: x0, y: y0 };
}
