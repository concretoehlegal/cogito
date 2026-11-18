/*
 * Quadro infinito do Planejador (no espírito do Miro e do Obsidian).
 * Rolagem move a visão; Ctrl + rolagem (ou pinça) aproxima; arrastar no fundo faz o laço de seleção;
 * botão do meio, direito ou Espaço + arrastar move a visão. Fichas se movem, mudam de tamanho e se ligam
 * arrastando a bolinha da borda até outra ficha. Molduras levam junto o que está dentro delas.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPE } from 'react';
import { Markdown } from './Markdown';
import { CharCard, dataFromActor } from '../game/CharCard';
import { GameIcon } from '../game/icons';
import type { Plan, PlanNode } from '../game/types';
import { api, errorText } from '../api';
import { toast } from '../store';
import { CARD_RATIO, HUNT_BARS, TYPES, center, edgePoint, findByTitle, fitView, inside, isChar, linksIn, matches, newNode, nodeActor, segments, uid, type Box } from './model';
import { edit, planFileUrl, select, usePlan } from './state';

/* Controle do quadro usado pela barra de ferramentas e pelo painel (centralizar, enquadrar, criar no centro). */
export const canvas = {
  focus: (_id: string) => {},
  fit: () => {},
  zoomBy: (_f: number) => {},
  centerWorld: () => ({ x: 0, y: 0 }),
  zoom: () => 1,
};

const BRAND = '#b8ff2c';
type Drag = { ids: string[]; dx: number; dy: number } | null;
type Resize = { id: string; w: number; h: number } | null;
type Wire = { from: string; x: number; y: number } | null;

/** Texto com [[links]] como etiquetas clicáveis. */
export function RichText({ body, nodes, onLink, max }: { body: string; nodes: PlanNode[]; onLink: (title: string) => void; max?: number }) {
  const text = max && body.length > max ? `${body.slice(0, max)}…` : body;
  return (
    <>
      {segments(text).map((s, i) => ('link' in s
        ? <button key={i} type="button" className={`pn-link${findByTitle(nodes, s.link) ? '' : ' missing'}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onLink(s.link); }}>{s.link}</button>
        : <span key={i}>{s.text}</span>))}
    </>
  );
}

function NodeView({ n, nodes, planId, selected, dim, onLink }: { n: PlanNode; nodes: PlanNode[]; planId: string; selected: boolean; dim: boolean; onLink: (t: string) => void }) {
  const t = TYPES[n.type];
  if (isChar(n.type)) {
    return <CharCard d={dataFromActor(nodeActor(n), HUNT_BARS)} width={n.w} imgUrl={(f) => planFileUrl(planId, f)} />;
  }
  if (n.type === 'moldura') {
    return <div className="pn-frame-label"><GameIcon id={n.icon} size={14} />{n.title || 'Moldura'}</div>;
  }
  if (n.type === 'imagem') {
    return (
      <div className="pn-image">
        {n.image ? <img src={planFileUrl(planId, n.image)} alt="" draggable={false} /> : <span className="pn-image-empty"><GameIcon id="camera" size={40} /><small>Sem imagem</small></span>}
        {n.title && <span className="pn-caption">{n.title}</span>}
      </div>
    );
  }
  // Notas, locais, itens, facções e sessões: cartões de texto como no Obsidian Canvas.
  return (
    <div className={`pn-doc-card${n.type === 'nota' ? ' plain' : ''}`}>
      <span className="pn-label">{n.title || t.label}</span>
      <div className="pn-doc">
        {n.image && (
          <figure className="pn-fig">
            <img src={planFileUrl(planId, n.image)} alt="" draggable={false} />
            {n.subtitle && <figcaption>{n.subtitle}</figcaption>}
          </figure>
        )}
        <h1 className="pn-h">{n.title || t.label}</h1>
        {(n.type !== 'nota' || (!n.image && n.subtitle)) && (
          <div className="pn-meta">
            {n.type !== 'nota' && <span className="pn-kind"><GameIcon id={n.icon} size={12} />{t.label}</span>}
            {!n.image && n.subtitle && <em>{n.subtitle}</em>}
          </div>
        )}
        {n.body ? <Markdown body={n.body} nodes={nodes} onLink={onLink} /> : !(selected || dim) && <p className="pn-empty">Vazio — escreva no painel à direita.</p>}
        {n.tags.length > 0 && <div className="pn-tags">{n.tags.map((g) => <span key={g}>#{g}</span>)}</div>}
      </div>
    </div>
  );
}

export function Canvas({ plan, search, textLinks }: { plan: Plan; search: string; textLinks: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const sel = usePlan((s) => s.sel);
  const selLink = usePlan((s) => s.selLink);
  const [view, setView] = useState(plan.view ?? { x: 0, y: 0, zoom: 1 });
  const viewRef = useRef(view); viewRef.current = view;
  const [drag, setDrag] = useState<Drag>(null);
  const [resize, setResize] = useState<Resize>(null);
  const [wire, setWire] = useState<Wire>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const space = useRef(false);
  const nodes = plan.nodes;

  // A visão vai para o arquivo sem entrar no desfazer.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const v = viewRef.current; const p = usePlan.getState().plan;
      if (p && (p.view.x !== v.x || p.view.y !== v.y || p.view.zoom !== v.zoom)) edit((d) => { d.view = { x: Math.round(v.x), y: Math.round(v.y), zoom: Math.round(v.zoom * 1000) / 1000 }; }, { history: false });
    }, 500);
    return () => window.clearTimeout(t);
  }, [view]);

  const toWorld = useCallback((cx: number, cy: number) => {
    const r = host.current!.getBoundingClientRect(); const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.zoom, y: (cy - r.top - v.y) / v.zoom };
  }, []);
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const r = host.current!.getBoundingClientRect(); const v = viewRef.current;
    const zoom = Math.min(3, Math.max(0.1, v.zoom * factor));
    const px = cx - r.left; const py = cy - r.top;
    setView({ zoom, x: px - ((px - v.x) / v.zoom) * zoom, y: py - ((py - v.y) / v.zoom) * zoom });
  }, []);

  // Controle externo.
  useEffect(() => {
    canvas.zoom = () => viewRef.current.zoom;
    canvas.zoomBy = (f) => { const r = host.current?.getBoundingClientRect(); if (r) zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); };
    canvas.fit = () => { const r = host.current?.getBoundingClientRect(); const p = usePlan.getState().plan; if (r && p) setView(fitView(p.nodes, r.width, r.height)); };
    canvas.centerWorld = () => { const r = host.current?.getBoundingClientRect(); const v = viewRef.current; return r ? { x: (r.width / 2 - v.x) / v.zoom, y: (r.height / 2 - v.y) / v.zoom } : { x: 0, y: 0 }; };
    canvas.focus = (id) => {
      const p = usePlan.getState().plan; const n = p?.nodes.find((x) => x.id === id); const r = host.current?.getBoundingClientRect();
      if (!n || !r) return;
      const zoom = Math.max(viewRef.current.zoom, 0.8);
      setView({ zoom, x: r.width / 2 - (n.x + n.w / 2) * zoom, y: r.height / 2 - (n.y + n.h / 2) * zoom });
      select([id]);
    };
  }, [zoomAt]);

  // Rolagem: move; Ctrl + rolagem: zoom. Espaço segurado: arrastar move a visão.
  useEffect(() => {
    const el = host.current; if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest('.pn-scroll')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0018));
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    const typing = (e: KeyboardEvent) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '');
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space' && !typing(e)) { space.current = true; el.classList.add('space'); } };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') { space.current = false; el.classList.remove('space'); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [zoomAt]);

  const follow = (move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) => {
    const u = (e: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', u); up(e); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', u);
  };

  /* fundo: laço ou mover a visão */
  const onBackground = (e: RPE) => {
    if ((e.target as Element).closest('.pn-node, .pc-link-label')) return;
    const pan = e.button === 1 || e.button === 2 || space.current;
    if (pan) {
      e.preventDefault();
      const x0 = e.clientX; const y0 = e.clientY; const v0 = viewRef.current;
      host.current!.classList.add('panning');
      follow((ev) => setView({ ...v0, x: v0.x + ev.clientX - x0, y: v0.y + ev.clientY - y0 }), () => host.current?.classList.remove('panning'));
      return;
    }
    if (e.button !== 0) return;
    const a = toWorld(e.clientX, e.clientY); const add = e.shiftKey; let moved = false;
    let cur = { x0: a.x, y0: a.y, x1: a.x, y1: a.y };
    follow((ev) => {
      const b = toWorld(ev.clientX, ev.clientY); cur = { ...cur, x1: b.x, y1: b.y };
      if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 4) moved = true;
      if (moved) setBox(cur);
    }, () => {
      setBox(null);
      if (!moved) { select([]); return; }
      const lx = Math.min(cur.x0, cur.x1); const ly = Math.min(cur.y0, cur.y1); const hx = Math.max(cur.x0, cur.x1); const hy = Math.max(cur.y0, cur.y1);
      const hit = nodes.filter((n) => inside(n, { x: lx, y: ly, w: hx - lx, h: hy - ly })).map((n) => n.id);
      select(add ? [...new Set([...usePlan.getState().sel, ...hit])] : hit);
    });
  };

  /* fichas: selecionar e arrastar (molduras levam o que está dentro) */
  const onNode = (e: RPE, n: PlanNode) => {
    if (e.button !== 0 || space.current) return;
    e.stopPropagation();
    if ((e.target as Element).closest('button, input, textarea, .pn-handle')) return;
    const cur = usePlan.getState().sel;
    let ids = cur;
    if (e.shiftKey) { ids = cur.includes(n.id) ? cur.filter((x) => x !== n.id) : [...cur, n.id]; select(ids); return; }
    if (!cur.includes(n.id)) { ids = [n.id]; select(ids); }
    const moving = new Set(ids);
    for (const f of nodes) if (f.type === 'moldura' && moving.has(f.id)) for (const m of nodes) if (m.id !== f.id && inside(m, f)) moving.add(m.id);
    const list = [...moving];
    const x0 = e.clientX; const y0 = e.clientY;
    follow((ev) => setDrag({ ids: list, dx: (ev.clientX - x0) / viewRef.current.zoom, dy: (ev.clientY - y0) / viewRef.current.zoom }), (ev) => {
      setDrag(null);
      const dx = Math.round((ev.clientX - x0) / viewRef.current.zoom); const dy = Math.round((ev.clientY - y0) / viewRef.current.zoom);
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      edit((d) => { for (const m of d.nodes) if (moving.has(m.id)) { m.x += dx; m.y += dy; } });
    });
  };

  const onResize = (e: RPE, n: PlanNode) => {
    e.stopPropagation(); e.preventDefault();
    const x0 = e.clientX; const y0 = e.clientY; let w = n.w; let h = n.h;
    const keep = isChar(n.type);
    follow((ev) => {
      const z = viewRef.current.zoom;
      w = Math.max(keep ? 110 : 120, Math.round(n.w + (ev.clientX - x0) / z));
      h = keep ? Math.round(w * CARD_RATIO) : Math.max(70, Math.round(n.h + (ev.clientY - y0) / z));
      setResize({ id: n.id, w, h });
    }, () => {
      setResize(null);
      if (w !== n.w || h !== n.h) edit((d) => { const m = d.nodes.find((x) => x.id === n.id); if (m) { m.w = w; m.h = h; } });
    });
  };

  const onWire = (e: RPE, n: PlanNode) => {
    e.stopPropagation(); e.preventDefault();
    follow((ev) => { const p = toWorld(ev.clientX, ev.clientY); setWire({ from: n.id, x: p.x, y: p.y }); }, (ev) => {
      setWire(null);
      const p = toWorld(ev.clientX, ev.clientY);
      const target = [...nodes].reverse().find((m) => m.id !== n.id && m.type !== 'moldura' && p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h)
        ?? [...nodes].reverse().find((m) => m.id !== n.id && p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h);
      if (!target) return;
      if (plan.links.some((l) => (l.from === n.id && l.to === target.id))) return;
      const id = uid('l');
      edit((d) => { d.links.push({ id, from: n.id, to: target.id, label: '', color: '#9fb8ad' }); });
      select([], id);
    });
  };

  /* imagens soltas no quadro */
  const dropImages = async (files: File[], at: { x: number; y: number }) => {
    let i = 0;
    for (const f of files) {
      if (!/^image\//.test(f.type)) continue;
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const file = await api.planPutFile(plan.id, f.name || 'imagem.png', bytes);
        const size = await new Promise<{ w: number; h: number }>((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 320, h: 230 }); im.src = URL.createObjectURL(f); });
        const w = 320; const h = Math.max(80, Math.round(w * (size.h / Math.max(1, size.w))));
        const node = newNode('imagem', at.x + i * 30, at.y + i * 30, { image: file, w, h, title: '' });
        node.x = Math.round(at.x + i * 30 - w / 2); node.y = Math.round(at.y + i * 30 - h / 2);
        edit((d) => { d.nodes.push(node); }); select([node.id]); i++;
      } catch (err) { toast(errorText(err), 'error'); }
    }
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => /^image\//.test(f.type));
      if (!files.length) return;
      e.preventDefault(); void dropImages(files, canvas.centerWorld());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const onLink = (title: string) => {
    const t = findByTitle(nodes, title);
    if (t) { canvas.focus(t.id); return; }
    const c = canvas.centerWorld(); const node = newNode('nota', c.x, c.y, { title });
    edit((d) => { d.nodes.push(node); }); select([node.id]);
    toast(`“${title}” ainda não existia: criei uma nota com esse nome.`, 'info');
  };

  const pos = (n: PlanNode): Box => {
    const off = drag && drag.ids.includes(n.id) ? drag : null;
    const rs = resize?.id === n.id ? resize : null;
    return { x: n.x + (off?.dx ?? 0), y: n.y + (off?.dy ?? 0), w: rs?.w ?? n.w, h: rs?.h ?? n.h };
  };
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const frames = nodes.filter((n) => n.type === 'moldura');
  const others = nodes.filter((n) => n.type !== 'moldura');
  const searching = search.trim().length > 0;
  const textEdges = useMemo(() => {
    if (!textLinks) return [];
    const out: { a: string; b: string }[] = [];
    for (const n of nodes) for (const t of linksIn(n.body)) { const m = findByTitle(nodes, t); if (m && m.id !== n.id) out.push({ a: n.id, b: m.id }); }
    return out;
  }, [nodes, textLinks]);

  const renderNode = (n: PlanNode) => {
    const b = pos(n); const s = sel.includes(n.id);
    return (
      <div
        key={n.id} className={`pn-node t-${n.type}${s ? ' selected' : ''}${searching && !matches(n, search) ? ' dim' : ''}${drag?.ids.includes(n.id) ? ' dragging' : ''}`}
        style={{ left: b.x, top: b.y, width: b.w, height: n.type === 'moldura' || !isChar(n.type) ? b.h : undefined, '--nc': n.color } as CSSProperties}
        onPointerDown={(e) => onNode(e, n)} onDoubleClick={(e) => { e.stopPropagation(); select([n.id]); window.dispatchEvent(isChar(n.type) ? new CustomEvent('plan:open-sheet', { detail: n.id }) : new CustomEvent('plan:edit-title')); }}
      >
        <NodeView n={{ ...n, w: b.w }} nodes={nodes} planId={plan.id} selected={s} dim={searching} onLink={onLink} />
        {s && sel.length === 1 && <>
          <span className="pn-handle wire" title="Arraste até outra ficha para ligar" onPointerDown={(e) => onWire(e, n)} />
          <span className="pn-handle size" title="Arraste para mudar o tamanho" onPointerDown={(e) => onResize(e, n)} />
        </>}
      </div>
    );
  };

  const gridSize = 32 * view.zoom;
  const arrowColors = [...new Set([BRAND, ...plan.links.map((l) => l.color)])];
  return (
    <div
      ref={host} className="plan-canvas" onPointerDown={onBackground} onContextMenu={(e) => e.preventDefault()}
      onDoubleClick={(e) => { if ((e.target as Element).closest('.pn-node')) return; const p = toWorld(e.clientX, e.clientY); const n = newNode('nota', p.x, p.y); edit((d) => { d.nodes.push(n); }); select([n.id]); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
      onDrop={(e) => { const files = [...e.dataTransfer.files]; if (!files.length) return; e.preventDefault(); void dropImages(files, toWorld(e.clientX, e.clientY)); }}
      style={{ backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
    >
      <div className="pc-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {frames.map(renderNode)}
        <svg className="pc-links" width="1" height="1">
          <defs>
            {arrowColors.map((c, i) => <marker key={c} id={`pc-arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={c} /></marker>)}
          </defs>
          {textEdges.map((t, i) => {
            const A = byId.get(t.a); const B = byId.get(t.b); if (!A || !B) return null;
            const a = pos(A); const b = pos(B); const p1 = edgePoint(a, center(b)); const p2 = edgePoint(b, center(a));
            return <line key={`t${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="pc-textlink" />;
          })}
          {plan.links.map((l) => {
            const A = byId.get(l.from); const B = byId.get(l.to); if (!A || !B) return null;
            const a = pos(A); const b = pos(B); const p1 = edgePoint(a, center(b)); const p2 = edgePoint(b, center(a));
            const on = selLink === l.id;
            return (
              <g key={l.id} className={`pc-link${on ? ' selected' : ''}`} onPointerDown={(e) => { e.stopPropagation(); select([], l.id); }}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="hit" />
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="vis" style={{ stroke: on ? BRAND : l.color }} markerEnd={`url(#pc-arrow-${arrowColors.indexOf(on ? BRAND : l.color)})`} />
              </g>
            );
          })}
          {wire && (() => { const A = byId.get(wire.from); if (!A) return null; const a = pos(A); const p1 = edgePoint(a, wire); return <line x1={p1.x} y1={p1.y} x2={wire.x} y2={wire.y} className="pc-wire" />; })()}
        </svg>
        {plan.links.filter((l) => l.label).map((l) => {
          const A = byId.get(l.from); const B = byId.get(l.to); if (!A || !B) return null;
          const a = center(pos(A)); const b = center(pos(B));
          return <span key={l.id} className={`pc-link-label${selLink === l.id ? ' selected' : ''}`} style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }} onPointerDown={(e) => { e.stopPropagation(); select([], l.id); }}>{l.label}</span>;
        })}
        {others.map(renderNode)}
        {box && <div className="pc-box" style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }} />}
      </div>
      {!nodes.length && (
        <div className="pc-empty">
          <GameIcon id="mapa" size={48} />
          <strong>Quadro vazio</strong>
          <span>Use a barra à esquerda para criar personagens, inimigos, locais e notas, ou dê dois cliques no quadro para uma nota rápida. Arraste imagens do computador direto para cá.</span>
        </div>
      )}
    </div>
  );
}
