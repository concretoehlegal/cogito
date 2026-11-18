/* Leitor de consulta: mostra PDFs da biblioteca e anexos ao lado do editor. */
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { EventBus, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Minus, Plus, Search, X } from 'lucide-react';
import { openViewer, remember, type Viewer } from '../store';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
const asset = (p: string) => new URL(p, document.baseURI).href;

function PdfView({ viewer: doc }: { viewer: Viewer }) {
  const container = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const ctl = useRef<{ viewer: PDFViewer; bus: EventBus } | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<{ current: number; total: number } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const el = container.current!;
    const bus = new EventBus();
    const linkService = new PDFLinkService({ eventBus: bus });
    const findController = new PDFFindController({ eventBus: bus, linkService });
    const viewer = new PDFViewer({ container: el, viewer: inner.current!, eventBus: bus, linkService, findController });
    linkService.setViewer(viewer);
    (linkService as any).externalLinkEnabled = false;
    ctl.current = { viewer, bus };
    let cancelled = false;
    let fitWidth = true;
    setStatus('loading'); setPages(0); setPage(1); setMatches(null);

    const posKey = `cogito.pdfpos.${doc.key}`;
    const task = pdfjsLib.getDocument({
      url: doc.url, cMapUrl: asset('pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: asset('pdfjs/standard_fonts/'),
      isEvalSupported: false, enableXfa: false,
    });
    task.promise.then((pdf) => {
      if (cancelled) { void pdf.destroy(); return; }
      viewer.setDocument(pdf);
      linkService.setDocument(pdf, null);
      setPages(pdf.numPages);
      setStatus('ready');
    }, (err) => {
      if (cancelled) return;
      setStatus('error');
      setMessage(err?.name === 'PasswordException' ? 'Este PDF é protegido por senha.' : 'Não foi possível abrir este PDF. O arquivo pode estar danificado.');
    });

    bus.on('pagesinit', () => {
      viewer.currentScaleValue = 'page-width';
      let saved = 0;
      try { saved = Number(localStorage.getItem(posKey)) || 0; } catch { /* sem posição salva */ }
      if (saved > 1 && saved <= viewer.pagesCount) viewer.currentPageNumber = saved;
    });
    bus.on('pagechanging', (e: any) => { setPage(e.pageNumber); remember(posKey, e.pageNumber); });
    bus.on('scalechanging', (e: any) => { setScale(e.scale); fitWidth = e.presetValue === 'page-width'; });
    bus.on('updatefindmatchescount', (e: any) => setMatches(e.matchesCount));
    bus.on('updatefindcontrolstate', (e: any) => setMatches(e.matchesCount));

    const ro = new ResizeObserver(() => { if (viewer.pagesCount && fitWidth) viewer.currentScaleValue = 'page-width'; });
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (viewer.pagesCount) viewer.currentScale = Math.min(4, Math.max(0.25, viewer.currentScale * Math.exp(-e.deltaY * 0.0016)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelled = true; ro.disconnect(); ctl.current = null; el.removeEventListener('wheel', onWheel);
      void task.destroy();
      try { viewer.setDocument(null as any); } catch { /* já encerrado */ }
    };
  }, [doc.url, doc.key]);

  const find = (again: boolean, previous = false) => {
    ctl.current?.bus.dispatch('find', {
      source: null, type: again ? 'again' : '', query, caseSensitive: false, entireWord: false, highlightAll: true,
      findPrevious: previous, matchDiacritics: false,
    });
  };
  const zoomBy = (f: number) => { const v = ctl.current?.viewer; if (v) v.currentScale = Math.min(4, Math.max(0.25, v.currentScale * f)); };
  const go = (n: number) => { const v = ctl.current?.viewer; if (v && n >= 1 && n <= v.pagesCount) v.currentPageNumber = n; };

  return (
    <>
      <div className="viewer-tools">
        <button className="icon-btn" title="Página anterior" disabled={page <= 1} onClick={() => go(page - 1)}><ChevronLeft size={16} /></button>
        <input className="page-input" value={page} aria-label="Página" onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n) { setPage(n); go(n); } }} />
        <span className="muted">/ {pages || '–'}</span>
        <button className="icon-btn" title="Próxima página" disabled={page >= pages} onClick={() => go(page + 1)}><ChevronRight size={16} /></button>
        <span className="tool-sep" />
        <button className="icon-btn" title="Diminuir" onClick={() => zoomBy(1 / 1.15)}><Minus size={15} /></button>
        <button className="link-btn zoom-label" title="Ajustar à largura" onClick={() => { const v = ctl.current?.viewer; if (v) v.currentScaleValue = 'page-width'; }}>{Math.round(scale * 100)}%</button>
        <button className="icon-btn" title="Aumentar" onClick={() => zoomBy(1.15)}><Plus size={15} /></button>
        <span className="tool-sep" />
        <form className="viewer-search" onSubmit={(e) => { e.preventDefault(); find(!!matches && matches.total > 0); }}>
          <Search size={14} />
          <input placeholder="Buscar no PDF" value={query} onChange={(e) => { setQuery(e.target.value); setMatches(null); }} />
          {query && matches && <span className="muted match-count">{matches.total ? `${matches.current}/${matches.total}` : '0'}</span>}
          <button type="button" className="icon-btn" title="Resultado anterior" disabled={!query} onClick={() => find(true, true)}><ChevronUp size={15} /></button>
          <button type="button" className="icon-btn" title="Próximo resultado" disabled={!query} onClick={() => find(true)}><ChevronDown size={15} /></button>
        </form>
      </div>
      <div className="viewer-body">
        <div ref={container} className="pdf-container"><div ref={inner} className="pdfViewer" /></div>
        {status === 'loading' && <div className="viewer-msg">Abrindo PDF…</div>}
        {status === 'error' && <div className="viewer-msg error">{message}</div>}
      </div>
    </>
  );
}

export function ViewerPane({ viewer }: { viewer: Viewer }) {
  return (
    <section className="viewer-pane" aria-label="Consulta">
      <header className="viewer-head">
        <span className="viewer-badge" title="Material de consulta: não é adicionado ao livro nem às exportações">{viewer.source === 'biblioteca' ? 'Biblioteca' : 'Anexo'} · só consulta</span>
        <span className="viewer-title" title={viewer.title}>{viewer.title}</span>
        <button className="icon-btn" title="Fechar consulta" onClick={() => openViewer(null)}><X size={16} /></button>
      </header>
      {viewer.kind === 'pdf' ? <PdfView key={viewer.key} viewer={viewer} /> : (
        <div className="viewer-body image"><img src={viewer.url} alt={viewer.title} /></div>
      )}
    </section>
  );
}
