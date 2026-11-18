/* Forma no editor: desenho em SVG com alças para redimensionar arrastando. */
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { labelSize, labelY, shapeParts, wrapStyle, type ShapeAttrs } from './shapes';

export function ShapeSvg({ a }: { a: ShapeAttrs }) {
  return (
    <svg width={a.width} height={a.height} viewBox={`0 0 ${a.width} ${a.height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      {shapeParts(a.kind, a.width, a.height, a.strokeWidth).map((p, k) => (
        <g key={k}>
          <path d={p.d} fill={p.fill ? a.fill : 'none'} stroke={p.stroke && a.strokeWidth > 0 ? a.stroke : 'none'} strokeWidth={a.strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
          {p.shade && p.fill && <path d={p.d} fill="rgba(0,0,0,.25)" stroke="none" />}
        </g>
      ))}
      {a.label && (
        <text x={a.width / 2} y={labelY(a)} textAnchor="middle" dominantBaseline="central" fill={a.labelColor}
          style={{ font: `700 ${labelSize(a)}px "Cogito Chapter Bold", "Cogito Chapter", Georgia, serif` }}>{a.label}</text>
      )}
    </svg>
  );
}

const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;
const MAX_W = 657; // largura útil de uma página A4 (174 mm)

export function ShapeView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const a = node.attrs as ShapeAttrs;
  const [live, setLive] = useState<{ width: number; height: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cur = { ...a, ...(live ?? {}) };

  const start = (e: RPointerEvent, h: (typeof HANDLES)[number]) => {
    e.preventDefault(); e.stopPropagation();
    const zoomEl = box.current?.closest('.page-zoom') as HTMLElement | null;
    const zoom = zoomEl ? parseFloat(getComputedStyle(zoomEl).zoom || '1') || 1 : 1;
    const x0 = e.clientX; const y0 = e.clientY; const w0 = a.width; const h0 = a.height;
    const ratio = w0 / h0;
    let last = { width: w0, height: h0 };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / zoom; const dy = (ev.clientY - y0) / zoom;
      let w = w0 + (h.includes('e') ? dx : h.includes('w') ? -dx : 0) * (a.align === 'center' && (h.includes('e') || h.includes('w')) ? 2 : 1);
      let hh = h0 + (h.includes('s') ? dy : h.includes('n') ? -dy : 0);
      if (ev.shiftKey && h.length === 2) hh = w / ratio; // Shift mantém a proporção
      w = Math.round(Math.min(MAX_W, Math.max(16, w)));
      hh = Math.round(Math.min(1100, Math.max(a.kind === 'line' ? 6 : 16, hh)));
      last = { width: w, height: hh };
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      setLive(null);
      if (last.width !== w0 || last.height !== h0) updateAttributes(last);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <NodeViewWrapper
      ref={box} className={`shape-node${selected ? ' is-selected' : ''}`} data-kind={a.kind} data-align={a.align} data-wrap={a.wrap}
      style={{ width: cur.width, height: cur.height, ...(a.wrap === 'free' ? { left: a.x ?? 0, top: a.y ?? 0 } : {}), ...(wrapStyle(a) ? { shapeOutside: wrapStyle(a).replace(/^shape-outside:|;$/g, '') } : {}) }}
      onMouseDown={(e: React.MouseEvent) => { if (!selected && typeof getPos === 'function') { e.preventDefault(); editor.commands.setNodeSelection(getPos()); } }}
      data-drag-handle
    >
      <ShapeSvg a={cur} />
      {selected && editor.isEditable && HANDLES.map((h) => <span key={h} className={`shape-handle h-${h}`} onPointerDown={(e) => start(e, h)} />)}
      {live && <span className="shape-size">{live.width} × {live.height}</span>}
    </NodeViewWrapper>
  );
}
