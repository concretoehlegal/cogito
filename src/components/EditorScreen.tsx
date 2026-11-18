/* Tela do editor: cartão da estrutura, páginas, busca, consulta lado a lado e trilho de ferramentas. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookCopy, ChevronLeft, ChevronRight, Minus, PanelLeft, Plus, RectangleVertical } from 'lucide-react';
import { flatPages } from '../model';
import { closeBook, saveNow, setLeftOpen, setRightTab, setViewMode, setZoom, stepPage, useApp } from '../store';
import { LeftPanel } from './LeftPanel';
import { TitleStrip } from './Logo';
import { ResizeHandle } from './ResizeHandle';
import { RightPanel } from './RightPanel';
import { StatusSave } from './SaveIndicator';
import { Settings } from './Settings';
import { TocView } from './TocView';
import { Toolbar } from './Toolbar';
import { ViewerPane } from './ViewerPane';
import { Workspace } from './Workspace';
import { confirmDialog } from './ui';

export function useWindowWidth(): number {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

const ZOOMS = [0.25, 0.35, 0.5, 0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];

/** Barra flutuante: navegação entre páginas, modo de exibição e zoom. */
function StatusPill({ showSave }: { showSave: boolean }) {
  const book = useApp((s) => s.book)!;
  const sel = useApp((s) => s.sel);
  const viewMode = useApp((s) => s.viewMode);
  const zoom = useApp((s) => s.zoom);
  const saveError = useApp((s) => s.save.state === 'error');
  const flat = useMemo(() => flatPages(book), [book]);
  const idx = sel.kind === 'page' ? flat.findIndex((f) => f.page.id === sel.pageId) : -1;
  const stepZoom = (dir: 1 | -1) => {
    const cur = zoom === 'fit' ? 1 : zoom;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.001) : [...ZOOMS].reverse().find((z) => z < cur - 0.001);
    if (next) setZoom(next);
  };
  return (
    <footer className="status-pill">
      <button className="icon-btn" title="Página anterior (Ctrl+PageUp)" disabled={sel.kind === 'toc'} onClick={() => stepPage(-1)}><ChevronLeft size={17} /></button>
      <span className="status-page">{sel.kind === 'toc' ? 'Sumário' : `Página ${idx + 1} de ${flat.length}`}</span>
      <button className="icon-btn" title="Próxima página (Ctrl+PageDown)" disabled={!flat.length || idx >= flat.length - 1} onClick={() => stepPage(1)}><ChevronRight size={17} /></button>
      <span className="tool-sep" />
      <button className={`icon-btn${viewMode === 'single' ? ' on' : ''}`} title="Uma página por vez" onClick={() => setViewMode('single')}><RectangleVertical size={15} /></button>
      <button className={`icon-btn${viewMode === 'spread' ? ' on' : ''}`} title="Duas páginas lado a lado" onClick={() => setViewMode('spread')}><BookCopy size={15} /></button>
      <span className="tool-sep" />
      <button className="icon-btn" title="Diminuir zoom" onClick={() => stepZoom(-1)}><Minus size={15} /></button>
      <button className={`link-btn zoom-label${zoom === 'fit' ? ' on' : ''}`} title="Ajustar à largura disponível (Ctrl + rolagem do mouse muda o zoom)" onClick={() => setZoom('fit')}>{zoom === 'fit' ? 'Ajustado' : `${Math.round(zoom * 100)}%`}</button>
      <button className="icon-btn" title="Aumentar zoom" onClick={() => stepZoom(1)}><Plus size={15} /></button>
      {(showSave || saveError) && <><span className="tool-sep" /><StatusSave /></>}
    </footer>
  );
}

export function EditorScreen() {
  const bookTitle = useApp((s) => s.book!.title);
  const sel = useApp((s) => s.sel);
  const viewer = useApp((s) => s.viewer);
  const leftOpen = useApp((s) => s.leftOpen);
  const rightTab = useApp((s) => s.rightTab);
  const [settings, setSettings] = useState(false);
  const [ratio, setRatio] = useState(0.5);
  const mainRef = useRef<HTMLDivElement>(null);
  const width = useWindowWidth();
  const narrow = width < 1180;      // painel direito passa a flutuar sobre as páginas
  const compact = width < 900;      // cartão da estrutura também flutua
  const splitOk = width >= 1000;    // espaço para editor e consulta lado a lado

  // Ao encolher a janela, recolhe os painéis para dar espaço à escrita.
  const prev = useRef({ narrow, compact });
  useEffect(() => {
    if (compact && !prev.current.compact) setLeftOpen(false);
    if (!compact && prev.current.compact) setLeftOpen(true);
    if (narrow && !prev.current.narrow && useApp.getState().rightTab) setRightTab(null);
    prev.current = { narrow, compact };
  }, [narrow, compact]);
  useEffect(() => { if (window.innerWidth < 900) setLeftOpen(false); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); void saveNow(); }
      else if (k === 'f') {
        e.preventDefault();
        // A busca fica na barra lateral: abre a barra se estiver escondida.
        if (!useApp.getState().leftOpen) setLeftOpen(true);
        setTimeout(() => { const el = document.getElementById('book-search') as HTMLInputElement | null; el?.focus(); el?.select(); }, 30);
      }
      else if (e.key === 'PageDown') { e.preventDefault(); stepPage(1); }
      else if (e.key === 'PageUp') { e.preventDefault(); stepPage(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goHome = async () => {
    if (await closeBook()) return;
    if (await confirmDialog({ title: 'O livro não pôde ser salvo', message: 'Há alterações que não foram gravadas. Sair mesmo assim pode perder as últimas mudanças.', confirmText: 'Sair sem salvar', danger: true })) await closeBook(true);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const box = mainRef.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) => setRatio(Math.min(0.75, Math.max(0.25, (ev.clientX - box.left) / box.width)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('dragging-split'); };
    document.body.classList.add('dragging-split');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const showSplit = !!viewer && splitOk;
  const showOnlyViewer = !!viewer && !splitOk;

  return (
    <div className={`editor-screen${narrow ? ' narrow' : ''}${compact ? ' compact' : ''}`}>
      <TitleStrip book={bookTitle} />
      <div className="editor-body">
        {leftOpen && <LeftPanel />}
        {leftOpen && !compact && <ResizeHandle side="left" />}
        {leftOpen && compact && <div className="scrim" onClick={() => setLeftOpen(false)} />}
        <main className="center">
          <div className="center-top">
            {!leftOpen && <button className="icon-btn panel-toggle" title="Mostrar estrutura do livro" onClick={() => setLeftOpen(true)}><PanelLeft size={17} /></button>}
            {sel.kind === 'page' && !showOnlyViewer && <Toolbar />}
          </div>
          <div className="main-area" ref={mainRef}>
            {!showOnlyViewer && (
              <div className="editor-area" style={showSplit ? { width: `${ratio * 100}%`, flex: 'none' } : undefined}>
                {sel.kind === 'toc' ? <TocView /> : <Workspace />}
              </div>
            )}
            {showSplit && <div className="splitter" onPointerDown={startDrag} role="separator" aria-orientation="vertical" title="Arraste para redimensionar" />}
            {viewer && <ViewerPane viewer={viewer} />}
          </div>
          {!showOnlyViewer && <StatusPill showSave={!leftOpen} />}
        </main>
        {rightTab && narrow && <div className="scrim right" onClick={() => setRightTab(null)} />}
        <RightPanel onHome={goHome} onSettings={() => setSettings(true)} />
      </div>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
