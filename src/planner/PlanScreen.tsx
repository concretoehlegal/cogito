/* Tela de uma campanha do Planejador: barra de cima, ferramentas à esquerda, quadro no meio e painel à direita. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Link2, Maximize, Minus, Plus, Redo2, Search, Undo2 } from 'lucide-react';
import { api, errorText } from '../api';
import { TitleStrip } from '../components/Logo';
import { toast } from '../store';
import { GameIcon } from '../game/icons';
import type { NodeType } from '../game/types';
import { Canvas, canvas } from './Canvas';
import { NodePanel } from './NodePanel';
import { Ficha } from './Ficha';
import { ORDER, TYPES, freeSpot, matches, newNode, uid } from './model';
import { closePlan, edit, redo, select, undo, usePlan } from './state';
import './planner.css';

function SaveBadge() {
  const save = usePlan((s) => s.save);
  const at = usePlan((s) => s.savedAt);
  const text = save === 'saving' ? 'Salvando…' : save === 'pending' ? 'Alterações pendentes' : save === 'error' ? 'Erro ao salvar' : `Salvo · ${new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return <span className={`plan-save ${save}`}>{text}</span>;
}

export function PlanScreen() {
  const plan = usePlan((s) => s.plan);
  const canUndo = usePlan((s) => s.past.length > 0);
  const canRedo = usePlan((s) => s.future.length > 0);
  const [search, setSearch] = useState('');
  const [hit, setHit] = useState(0);
  const [textLinks, setTextLinks] = useState(() => localStorage.getItem('cogito.planTextLinks') !== '0');
  const searchRef = useRef<HTMLInputElement>(null);
  const [zoomPct, setZoomPct] = useState(100);
  const [sheetId, setSheetId] = useState<string | null>(null);
  useEffect(() => {
    const open = (e: Event) => setSheetId(String((e as CustomEvent).detail ?? ''));
    window.addEventListener('plan:open-sheet', open);
    return () => window.removeEventListener('plan:open-sheet', open);
  }, []);

  useEffect(() => { document.documentElement.classList.add('noir'); return () => document.documentElement.classList.remove('noir'); }, []);
  useEffect(() => { const t = window.setInterval(() => setZoomPct(Math.round(canvas.zoom() * 100)), 300); return () => window.clearInterval(t); }, []);
  // Primeira abertura: enquadra o que houver.
  useEffect(() => { if (plan && plan.view.x === 0 && plan.view.y === 0 && plan.nodes.length) requestAnimationFrame(() => canvas.fit()); }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (type: NodeType) => {
    const c = canvas.centerWorld();
    const n = newNode(type, c.x, c.y);
    if (type !== 'moldura') { const others = (usePlan.getState().plan?.nodes ?? []).filter((m) => m.type !== 'moldura'); const p = freeSpot(others, c.x, c.y, n.w, n.h); n.x = p.x; n.y = p.y; }
    edit((d) => { if (type === 'moldura') d.nodes.unshift(n); else d.nodes.push(n); });
    select([n.id]);
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('plan:edit-title')));
  };
  const addImages = async () => {
    if (!plan) return;
    try {
      const imgs = await api.planPickImages(plan.id);
      const c = canvas.centerWorld();
      const made = imgs.map((im, i) => newNode('imagem', c.x + i * 40, c.y + i * 40, { image: im.file, title: '' }));
      if (made.length) { edit((d) => { d.nodes.push(...made); }); select(made.map((m) => m.id)); }
    } catch (e) { toast(errorText(e), 'error'); }
  };

  const found = useMemo(() => (plan && search.trim() ? plan.nodes.filter((n) => matches(n, search)) : []), [plan, search]);
  const goNext = () => { if (!found.length) return; const n = found[hit % found.length]; canvas.focus(n.id); setHit((h) => h + 1); };

  // Atalhos do quadro.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); return; }
      if (typing) return;
      const s = usePlan.getState();
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); select(s.plan?.nodes.map((n) => n.id) ?? []); return; }
      if (mod && e.key.toLowerCase() === 'd' && s.sel.length) {
        e.preventDefault();
        const copies = s.plan!.nodes.filter((n) => s.sel.includes(n.id)).map((n) => ({ ...JSON.parse(JSON.stringify(n)), id: uid('n'), x: n.x + 30, y: n.y + 30 }));
        edit((d) => { d.nodes.push(...copies); }); select(copies.map((c) => c.id)); return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selLink) { edit((d) => { d.links = d.links.filter((l) => l.id !== s.selLink); }); select([]); return; }
        if (s.sel.length) { const ids = s.sel; edit((d) => { d.nodes = d.nodes.filter((n) => !ids.includes(n.id)); d.links = d.links.filter((l) => !ids.includes(l.from) && !ids.includes(l.to)); }); select([]); }
        return;
      }
      if (e.key === 'Escape') select([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!plan) return null;
  return (
    <div className="editor-screen plan-screen">
      <TitleStrip book={`Planejador · ${plan.name}`} />
      <header className="plan-top">
        <button className="btn small" onClick={() => { void closePlan(); }}><ArrowLeft size={14} /> Campanhas</button>
        <span className="plan-title" style={{ color: plan.color }}><GameIcon id={plan.icon} size={18} /> {plan.name}</span>
        <SaveBadge />
        <span className="grow" />
        <div className="plan-search">
          <Search size={14} />
          <input ref={searchRef} value={search} placeholder="Buscar no quadro (Ctrl+F)" onChange={(e) => { setSearch(e.target.value); setHit(0); }}
            onKeyDown={(e) => { if (e.key === 'Enter') goNext(); if (e.key === 'Escape') { setSearch(''); (e.target as HTMLInputElement).blur(); } }} />
          {search && <span className="muted small">{found.length ? `${(hit % found.length) + 1}/${found.length}` : '0'}</span>}
        </div>
        <button className="icon-btn" title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={16} /></button>
        <button className="icon-btn" title="Refazer (Ctrl+Y)" disabled={!canRedo} onClick={redo}><Redo2 size={16} /></button>
      </header>
      <div className="plan-body">
        <nav className="plan-tools" aria-label="Criar no quadro">
          {ORDER.filter((t) => t !== 'imagem').map((t) => (
            <button key={t} className="plan-tool" title={`Novo(a) ${TYPES[t].label.toLowerCase()}`} onClick={() => add(t)} style={{ '--tc': TYPES[t].color } as React.CSSProperties}>
              <GameIcon id={TYPES[t].icon} size={20} /><span>{TYPES[t].label}</span>
            </button>
          ))}
          <button className="plan-tool" title="Imagens do computador" onClick={() => { void addImages(); }}><ImagePlus size={19} /><span>Imagem</span></button>
          <span className="grow" />
          <button className={`plan-tool small${textLinks ? ' on' : ''}`} title="Mostrar as ligações feitas com [[Nome]] no texto" onClick={() => { setTextLinks(!textLinks); localStorage.setItem('cogito.planTextLinks', textLinks ? '0' : '1'); }}><Link2 size={16} /><span>[[ ]]</span></button>
          <button className="plan-tool small" title="Afastar" onClick={() => canvas.zoomBy(1 / 1.25)}><Minus size={16} /></button>
          <span className="plan-zoom">{zoomPct}%</span>
          <button className="plan-tool small" title="Aproximar" onClick={() => canvas.zoomBy(1.25)}><Plus size={16} /></button>
          <button className="plan-tool small" title="Enquadrar tudo" onClick={() => canvas.fit()}><Maximize size={16} /></button>
        </nav>
        <main className="plan-main"><Canvas plan={plan} search={search} textLinks={textLinks} /></main>
        <aside className="plan-panel"><NodePanel /></aside>
      </div>
      {sheetId && (() => { const n = plan.nodes.find((m) => m.id === sheetId); return n ? <Ficha n={n} planId={plan.id} onClose={() => setSheetId(null)} onEdit={() => { setSheetId(null); select([n.id]); }} /> : null; })()}
    </div>
  );
}
