/* Planejador: tipos de ficha do quadro, valores padrão, links [[…]] e conversão para as cartas. */
import type { Actor, NodeType, PlanNode, Sheet } from '../game/types.ts';
import { DEFAULT_SYSTEM, blankSheet, kindLabel, listOf, listsFor, numOf, roleStat, statsFor, valOf, type RuleSystem } from '../game/system.ts';

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
  texto: { label: 'Texto', plural: 'Textos', icon: 'texto', color: '#f2f2f2', w: 280, h: 40 },
  caixa: { label: 'Caixa de texto', plural: 'Caixas de texto', icon: 'caixa-texto', color: '#737373', w: 280, h: 140 },
};
export const ORDER: NodeType[] = ['personagem', 'npc', 'inimigo', 'local', 'item', 'faccao', 'sessao', 'nota', 'imagem', 'moldura', 'texto', 'caixa'];
/** Tipos que se escreve direto no quadro (sem painel). */
export const isText = (t: NodeType) => t === 'texto' || t === 'caixa';
export const CARD_RATIO = 300 / 220;
/** Chefes viram cartas largas (o espaço de duas cartas lado a lado). */
export const WIDE_RATIO = 300 / 460;
export const isWide = (n: Pick<PlanNode, 'type' | 'sheet'>) => n.type === 'inimigo' && !!n.sheet?.boss;
export const ratioOf = (n: Pick<PlanNode, 'type' | 'sheet'>) => (isWide(n) ? WIDE_RATIO : CARD_RATIO);
/** Ajusta o tamanho de uma carta ao formato (normal ou larga), mantendo a altura. */
export function fitCard(n: PlanNode) {
  if (!isChar(n.type)) return;
  const r = ratioOf(n);
  if (Math.abs(n.h / n.w - r) < 0.02) return;
  n.w = Math.round(n.h / r); n.h = Math.round(n.w * r);
}

/**
 * Como fitCard, mas abrindo espaço: se a carta ficou mais larga (chefe), o que está à direita dela na mesma faixa
 * anda para a direita e a moldura que a contém cresce junto, para nada ficar por baixo da carta.
 */
export function fitCardRoom(nodes: PlanNode[], n: PlanNode) {
  const w0 = n.w; const x1 = n.x + w0;
  fitCard(n);
  const d = n.w - w0;
  if (d <= 0) return;
  const top = n.y; const bot = n.y + n.h;
  for (const m of nodes) {
    if (m === n) continue;
    const sameRow = m.y < bot && m.y + m.h > top;
    if (!sameRow) continue;
    const holds = m.type === 'moldura' && m.x <= n.x && m.x + m.w >= x1 - 1 && m.y <= top && m.y + m.h >= bot;
    if (holds) m.w += d;
    else if (m.x >= x1 - 8) m.x += d;
  }
}
export const isChar = (t: NodeType) => !!TYPES[t].char;

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Ficha nova com os campos do sistema de regras da campanha. */
export const defaultSheet = (type: NodeType, sys: RuleSystem = DEFAULT_SYSTEM()): Sheet => blankSheet(sys, type);

export function newNode(type: NodeType, x: number, y: number, extra: Partial<PlanNode> = {}, sys?: RuleSystem): PlanNode {
  const d = TYPES[type];
  const titles: Record<NodeType, string> = {
    personagem: 'Novo personagem', npc: 'Novo NPC', inimigo: 'Nova criatura', local: 'Novo local', item: 'Novo item',
    faccao: 'Nova facção', sessao: 'Nova sessão', nota: '', imagem: '', moldura: 'Nova moldura', texto: '', caixa: '',
  };
  return {
    id: uid('n'), type, x: Math.round(x - d.w / 2), y: Math.round(y - d.h / 2), w: d.w, h: d.h,
    title: titles[type], subtitle: '', color: d.color, icon: d.icon, image: null, body: '', tags: [],
    ...(isChar(type) ? { sheet: defaultSheet(type, sys) } : {}), ...extra,
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

/* ───────────── Cartas ───────────── */

/** Ficha do quadro no formato usado pelas cartas de personagem, lida pelo sistema de regras. */
export function nodeActor(n: PlanNode, sys: RuleSystem = DEFAULT_SYSTEM()): Actor {
  const s = n.sheet ?? defaultSheet(n.type, sys);
  const kind = n.type === 'inimigo' ? 'enemy' : n.type === 'npc' ? 'npc' : 'pc';
  const boss = kind === 'enemy' && !!s.boss;
  const fields = statsFor(sys, n.type);
  const value = (role: Parameters<typeof roleStat>[1], d: number) => { const st = roleStat(sys, role, n.type); return st ? numOf(valOf(s, st, n.type), d) : d; };
  return {
    id: n.id, kind, name: n.title || kindLabel(sys, n.type, boss), subtitle: n.subtitle, color: n.color, image: n.image,
    emblem: n.icon, boss, ai: s.ai || 'agressiva', actions: s.actions, cards: s.cards, kindLabel: kindLabel(sys, n.type, boss),
    hp: Math.max(1, value('vida', 10)), defense: value('defesa', 10), armor: Math.max(0, value('armadura', 0)),
    resources: fields.filter((f) => f.role === 'recurso').map((f) => ({ id: f.id, name: f.name, short: f.short, max: Math.max(0, numOf(valOf(s, f, n.type), 0)) })),
    combatActions: Math.max(1, Math.min(9, value('acoes', 1))), moveActions: Math.max(0, value('movimento', 0)),
    stats: fields.map((f) => ({ id: f.id, name: f.name, short: f.short, icon: f.icon, kind: f.kind, role: f.role, card: f.card, value: valOf(s, f, n.type) })),
    lists: listsFor(sys, n.type).map((l) => ({ id: l.id, name: l.name, icon: l.icon, card: l.card, items: listOf(s, l) })),
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
