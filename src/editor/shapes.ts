/*
 * Formas do livro: geometria em caminhos SVG, usada igual no editor, no PDF e no DOCX (desenhada em canvas).
 */

export type ShapeKind = 'rect' | 'round' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'banner' | 'arrow' | 'line';

export const SHAPES: { kind: ShapeKind; label: string; w: number; h: number }[] = [
  { kind: 'rect', label: 'Retângulo', w: 220, h: 120 },
  { kind: 'round', label: 'Cartão', w: 220, h: 120 },
  { kind: 'ellipse', label: 'Elipse', w: 180, h: 130 },
  { kind: 'triangle', label: 'Triângulo', w: 160, h: 140 },
  { kind: 'diamond', label: 'Losango', w: 150, h: 150 },
  { kind: 'hexagon', label: 'Hexágono', w: 170, h: 150 },
  { kind: 'star', label: 'Estrela', w: 150, h: 150 },
  { kind: 'banner', label: 'Faixa', w: 360, h: 80 },
  { kind: 'arrow', label: 'Seta', w: 200, h: 80 },
  { kind: 'line', label: 'Linha', w: 400, h: 16 },
];

export interface ShapeAttrs {
  kind: ShapeKind; width: number; height: number; fill: string; stroke: string; strokeWidth: number;
  label: string; labelColor: string; align: 'left' | 'center' | 'right'; wrap: 'none' | 'left' | 'right' | 'free';
  /** Posição livre (wrap = "free"), em px a partir do canto da página. */
  x?: number; y?: number;
}

export interface ShapePart { d: string; fill: boolean; stroke: boolean; shade?: boolean }

const pts = (list: [number, number][]) => `M${list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;

/** Polígono normalizado (0..1) do contorno, também usado para o texto contornar a forma. */
export function outline(kind: ShapeKind): [number, number][] | null {
  switch (kind) {
    case 'triangle': return [[0.5, 0], [1, 1], [0, 1]];
    case 'diamond': return [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
    case 'hexagon': return [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]];
    case 'star': {
      const out: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 0.2 : 0.5;
        out.push([0.5 + r * Math.cos(a), 0.52 + r * Math.sin(a) * 1.04]);
      }
      return out;
    }
    case 'arrow': return [[0, 0.3], [0.68, 0.3], [0.68, 0], [1, 0.5], [0.68, 1], [0.68, 0.7], [0, 0.7]];
    default: return null;
  }
}

/** Caminhos da forma no tamanho pedido (o traço fica por dentro da caixa). */
export function shapeParts(kind: ShapeKind, w: number, h: number, sw: number): ShapePart[] {
  const i = Math.max(0.5, sw / 2);
  const W = Math.max(1, w - 2 * i); const H = Math.max(1, h - 2 * i);
  const poly = outline(kind);
  if (poly) return [{ d: pts(poly.map(([x, y]) => [i + x * W, i + y * H])), fill: true, stroke: true }];
  switch (kind) {
    case 'rect': return [{ d: `M${i} ${i} H${i + W} V${i + H} H${i} Z`, fill: true, stroke: true }];
    case 'round': {
      const r = Math.min(18, W / 4, H / 4);
      return [{ d: `M${i + r} ${i} H${i + W - r} A${r} ${r} 0 0 1 ${i + W} ${i + r} V${i + H - r} A${r} ${r} 0 0 1 ${i + W - r} ${i + H} H${i + r} A${r} ${r} 0 0 1 ${i} ${i + H - r} V${i + r} A${r} ${r} 0 0 1 ${i + r} ${i} Z`, fill: true, stroke: true }];
    }
    case 'ellipse': {
      const rx = W / 2; const ry = H / 2; const cx = i + rx; const cy = i + ry;
      return [{ d: `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`, fill: true, stroke: true }];
    }
    case 'banner': {
      // Faixa com as pontas dobradas para trás, como em títulos de livros de RPG.
      const t = H * 0.18; const e = Math.min(W * 0.12, H * 0.9); const n = e * 0.45;
      const back = (x0: number, dir: 1 | -1): ShapePart => {
        const xa = x0; const xb = x0 + dir * e; const top = i + t; const bot = i + H; const mid = (top + bot) / 2;
        return { d: pts([[xa, top], [xb, top], [xb, bot], [xa, bot], [xa + dir * n, mid]]), fill: true, stroke: true, shade: true };
      };
      return [
        back(i, 1),
        back(i + W, -1),
        { d: pts([[i + e * 0.55, i], [i + W - e * 0.55, i], [i + W - e * 0.55, i + H - t], [i + e * 0.55, i + H - t]]), fill: true, stroke: true },
      ];
    }
    case 'line': return [{ d: `M${i} ${h / 2} H${i + W}`, fill: false, stroke: true }];
    default: return [];
  }
}

/** Desenha a forma num canvas (para o DOCX, que não aceita SVG). */
export async function shapePng(a: ShapeAttrs, scale = 3): Promise<Uint8Array | null> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(a.width * scale)); canvas.height = Math.max(1, Math.round(a.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  for (const part of shapeParts(a.kind, a.width, a.height, a.strokeWidth)) {
    const path = new Path2D(part.d);
    if (part.fill && a.fill !== 'transparent') { ctx.fillStyle = a.fill; ctx.fill(path); if (part.shade) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill(path); } }
    if (part.stroke && a.strokeWidth > 0) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.strokeWidth; ctx.lineJoin = 'round'; ctx.stroke(path); }
  }
  if (a.label) {
    await document.fonts.load(`700 ${labelSize(a)}px "Cogito Chapter"`).catch(() => {});
    ctx.fillStyle = a.labelColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${labelSize(a)}px "Cogito Chapter Bold", "Cogito Chapter", Georgia, serif`;
    ctx.fillText(a.label, a.width / 2, labelY(a), a.width * 0.86);
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

export const labelSize = (a: Pick<ShapeAttrs, 'width' | 'height' | 'label' | 'kind'>) =>
  Math.max(9, Math.min(a.height * (a.kind === 'banner' ? 0.36 : 0.3), (a.width * 1.7) / Math.max(4, a.label.length)));
export const labelY = (a: Pick<ShapeAttrs, 'height' | 'kind'>) => (a.kind === 'banner' ? a.height * 0.41 : a.kind === 'triangle' ? a.height * 0.66 : a.height / 2);

/** Estilo que faz o texto contornar a forma quando ela flutua. */
export function wrapStyle(a: Pick<ShapeAttrs, 'kind' | 'wrap'>): string {
  if (a.wrap === 'none' || a.wrap === 'free') return '';
  const poly = outline(a.kind);
  const shape = a.kind === 'ellipse' ? 'ellipse(50% 50%)' : poly ? `polygon(${poly.map(([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`).join(', ')})` : 'margin-box';
  return `shape-outside:${shape};`;
}
