/* Área central: páginas do livro, cada uma com seu editor. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { AlertTriangle, Columns2, Copy, FilePlus2, Plus, Scissors, Trash2 } from 'lucide-react';
import { api, errorText } from '../api';
import { editorExtensions } from '../editor/extensions';
import { snapGuides, type Guide } from '../lib/guides';
import { imageNode } from '../editor/templates';
import { overflowIndex } from '../lib/layout';
import { FORMATS, MM_TO_PX, PAGE_MARGIN_MM, flatPages, formatOf, pageLabel, type Book, type DocNode, type FlatPage, type PageFormat } from '../model';
import {
  addChapter, addPage, deletePage, duplicatePage, goToPage, registerFlusher, setActiveEditor, setPageContent, setPageProps,
  setZoom, splitPage, toast, useApp,
} from '../store';
import { confirmDialog } from './ui';

/** Mantém sempre um parágrafo no fim da página, para dar onde continuar escrevendo depois de tabelas e blocos. */
const TrailingParagraph = Extension.create({
  name: 'trailingParagraph',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('trailingParagraph'),
      appendTransaction: (_trs, _old, state) => {
        const last = state.doc.lastChild;
        if (last && last.type.name !== 'paragraph') return state.tr.insert(state.doc.content.size, state.schema.nodes.paragraph.create());
        return null;
      },
    })];
  },
});
const pageExtensions = [...editorExtensions, TrailingParagraph];

const touched = new WeakSet<Editor>();
/** Páginas criadas por "mover excedente" que ainda precisam ser conferidas (o excedente pode ocupar várias páginas). */
const cascade = new Set<string>();

/** Insere um bloco na posição do cursor (ou no fim da página, se ela ainda não recebeu o cursor). */
export function insertBlock(editor: Editor, node: DocNode | DocNode[]) {
  const chain = editor.chain();
  if (!editor.isFocused && !touched.has(editor)) chain.focus('end'); else chain.focus();
  chain.insertContent(node as any).run();
}

const imageFiles = (dt: DataTransfer | null): File[] => Array.from(dt?.files ?? []).filter((f) => f.type.startsWith('image/'));

export async function storeImageFiles(bookId: string, files: File[]): Promise<DocNode[]> {
  const nodes: DocNode[] = [];
  for (const f of files) {
    const saved = await api.saveImage(bookId, f.name || 'imagem.png', new Uint8Array(await f.arrayBuffer()));
    nodes.push(imageNode(saved.url, f.name));
  }
  return nodes;
}

function PageView({ book, item, scale }: { book: Book; item: FlatPage; scale: number }) {
  const totalPages = useMemo(() => flatPages(book).length, [book.chapters]); // eslint-disable-line react-hooks/exhaustive-deps
  const { page } = item;
  const selected = useApp((s) => s.sel.kind === 'page' && s.sel.pageId === page.id);
  const spell = useApp((s) => s.prefs.spell);
  const format = formatOf(book, page);
  const columns = page.columns === 2 ? 2 : 1;
  const pending = useRef<DocNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const limitRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [overflowAt, setOverflowAt] = useState(-1);
  const moveTool = useApp((s) => s.moveTool);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideOrigin, setGuideOrigin] = useState({ x: 0, y: 0 });
  const pageRef = useRef<HTMLDivElement>(null);

  /**
   * Ferramenta Mover: arrastar uma imagem ou forma a deixa em posição livre na página.
   * Com Shift, encaixa nas guias (bordas e centro da página, margens e os outros elementos livres).
   */
  const startMove = (e: React.PointerEvent) => {
    if (!moveTool || e.button !== 0) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>('.page-content img, .page-content .shape-node');
    const pg = pageRef.current; const ed = editorRef.current;
    if (!target || !pg || !ed) return;
    e.preventDefault(); e.stopPropagation();
    // posição do nó no documento (imagem: o próprio <img>; forma: o invólucro da vista)
    let pos = -1;
    try {
      const p0 = ed.view.posAtDOM(target, 0);
      for (const p of [p0, p0 - 1]) { const nd = p >= 0 ? ed.state.doc.nodeAt(p) : null; if (nd && (nd.type.name === 'image' || nd.type.name === 'shape')) { pos = p; break; } }
    } catch { /* fora do documento */ }
    if (pos < 0) return;
    const node = ed.state.doc.nodeAt(pos)!;
    // Coordenadas a partir do canto da área de texto (dentro das margens), igual no editor, no PDF e no Word.
    const content = pg.querySelector<HTMLElement>('.page-content') ?? pg;
    const pr = pg.getBoundingClientRect(); const cr = content.getBoundingClientRect(); const tr0 = target.getBoundingClientRect();
    const W = pr.width / scale; const H = pr.height / scale;
    const ox = (pr.left - cr.left) / scale; const oy = (pr.top - cr.top) / scale; // canto da página, visto da área de texto
    const rel = (r: DOMRect) => ({ x: (r.left - cr.left) / scale, y: (r.top - cr.top) / scale, w: r.width / scale, h: r.height / scale });
    const box0 = rel(tr0);
    const m = PAGE_MARGIN_MM * MM_TO_PX;
    const others = [...pg.querySelectorAll<HTMLElement>(".page-content [data-wrap='free']")].filter((el) => el !== target).map((el) => rel(el.getBoundingClientRect()));
    const refs = [{ x: ox, y: oy, w: W, h: H }, { x: ox + m, y: oy + m, w: W - 2 * m, h: H - 2 * m }, ...others];
    setGuideOrigin({ x: -ox, y: -oy });
    const x0 = e.clientX; const y0 = e.clientY; let moved = false; let at = { x: box0.x, y: box0.y };
    target.classList.add('moving');
    const move = (ev: PointerEvent) => {
      let dx = (ev.clientX - x0) / scale; let dy = (ev.clientY - y0) / scale;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      if (ev.shiftKey) { const snap = snapGuides({ ...box0, x: box0.x + dx, y: box0.y + dy }, refs, 7); dx += snap.dx; dy += snap.dy; setGuides(snap.guides); } else setGuides([]);
      at = { x: Math.round(Math.min(ox + W - 16, Math.max(ox + 16 - box0.w, box0.x + dx))), y: Math.round(Math.min(oy + H - 16, Math.max(oy + 16 - box0.h, box0.y + dy))) };
      target.style.transform = `translate(${at.x - box0.x}px, ${at.y - box0.y}px)`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      target.classList.remove('moving'); target.style.transform = ''; setGuides([]);
      if (!moved) { ed.commands.setNodeSelection(pos); return; }
      const attrs: Record<string, unknown> = { ...node.attrs, wrap: 'free', x: at.x, y: at.y };
      // Imagens em % da coluna ficam com a largura que tinham na tela (a posição livre mede pela página).
      if (node.type.name === 'image' && String(node.attrs.width).endsWith('%')) attrs.width = `${Math.round(box0.w)}px`;
      ed.view.dispatch(ed.state.tr.setNodeMarkup(pos, undefined, attrs));
      ed.commands.setNodeSelection(pos);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const colsRef = useRef(columns);
  colsRef.current = columns;

  const commit = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) { const c = pending.current; pending.current = null; setPageContent(page.id, c); }
  }, [page.id]);

  const measure = useCallback(() => {
    const ed = editorRef.current; const limit = limitRef.current;
    if (!ed || ed.isDestroyed || !limit) return;
    const idx = overflowIndex(ed.view.dom as HTMLElement, limit.getBoundingClientRect().top, colsRef.current as 1 | 2);
    setOverflowAt(idx);
    if (cascade.has(page.id)) {
      cascade.delete(page.id);
      if (idx >= 0 && cascade.size < 300) { const next = splitPage(page.id, idx); if (next) cascade.add(next); }
    }
  }, [page.id]);
  const raf = useRef(0);
  const scheduleMeasure = useCallback(() => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(measure); }, [measure]);

  const insertFiles = async (files: File[], pos?: number) => {
    try {
      const nodes = await storeImageFiles(book.id, files);
      const ed = editorRef.current;
      if (!ed || ed.isDestroyed || !nodes.length) return;
      if (pos !== undefined) ed.chain().focus().insertContentAt(pos, nodes as any).run();
      else insertBlock(ed, nodes);
    } catch (e) { toast(`Não foi possível inserir a imagem: ${errorText(e)}`, 'error'); }
  };

  const editor = useEditor({
    extensions: pageExtensions,
    content: page.content as any,
    editorProps: {
      attributes: { class: 'page-content', spellcheck: useApp.getState().prefs.spell ? 'true' : 'false', lang: 'pt-BR' },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void insertFiles(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        void insertFiles(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      pending.current = editor.getJSON() as DocNode;
      clearTimeout(timer.current);
      timer.current = setTimeout(commit, 400);
      scheduleMeasure();
    },
    onFocus: ({ editor }) => {
      touched.add(editor);
      setActiveEditor(editor);
      const s = useApp.getState().sel;
      if (!(s.kind === 'page' && s.pageId === page.id)) goToPage(page.id);
    },
  }, []);
  editorRef.current = editor;

  useEffect(() => { editor?.view.dom.setAttribute('spellcheck', spell ? 'true' : 'false'); }, [editor, spell]);

  // Entrega o texto pendente quando pedirem (salvamento, troca de página, fechamento).
  useEffect(() => { const un = registerFlusher(commit); return () => { un(); commit(); }; }, [commit]);

  useEffect(() => {
    if (!editor) return;
    if (selected) setActiveEditor(editor);
    return () => { if (useApp.getState().activeEditor === editor) setActiveEditor(null); };
  }, [editor, selected]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(dom);
    dom.addEventListener('load', scheduleMeasure, true);
    void document.fonts.ready.then(scheduleMeasure);
    scheduleMeasure();
    return () => { ro.disconnect(); dom.removeEventListener('load', scheduleMeasure, true); cancelAnimationFrame(raf.current); };
  }, [editor, scheduleMeasure]);
  useEffect(scheduleMeasure, [columns, format, scale, scheduleMeasure]);

  /**
   * Clique ou arraste começando fora do texto (margens e área vazia da página):
   * o cursor vai para o ponto do texto mais próximo e, ao arrastar, a seleção acompanha o mouse.
   */
  const startMarginSelect = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (e.button !== 0 || !editor || editor.isDestroyed) return;
    if (!(t.classList.contains('page') || t.classList.contains('page-body'))) return;
    e.preventDefault();
    const view = editor.view;
    const dom = view.dom as HTMLElement;
    const posAt = (x: number, y: number): number => {
      const r = dom.getBoundingClientRect();
      const size = view.state.doc.content.size;
      if (y >= r.bottom) return size;
      if (y <= r.top) return 0;
      const found = view.posAtCoords({ left: Math.min(r.right - 2, Math.max(r.left + 2, x)), top: y });
      return found ? found.pos : size;
    };
    const anchor = posAt(e.clientX, e.clientY);
    const select = (head: number) => {
      const doc = view.state.doc;
      const fix = (p: number) => Math.max(0, Math.min(doc.content.size, p));
      view.dispatch(view.state.tr.setSelection(TextSelection.between(doc.resolve(fix(anchor)), doc.resolve(fix(head)))));
    };
    view.focus();
    select(anchor);
    const move = (ev: MouseEvent) => { if (!editor.isDestroyed) select(posAt(ev.clientX, ev.clientY)); };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const overflow = overflowAt >= 0;
  const blockCount = editor?.state.doc.childCount ?? 0;
  const canSplit = overflow && Math.max(1, overflowAt) < blockCount;
  const where = item.section ? `${item.chapter.title} › ${item.section.title}` : item.chapter.title;

  return (
    <div className={`page-wrap${selected ? ' selected' : ''}`} data-page-id={page.id} style={{ width: FORMATS[format].w * MM_TO_PX * scale }}>
      <div className="page-bar" onMouseDown={() => { if (!selected) goToPage(page.id); }}>
        <span className="page-bar-title" title={where}><b>Página {item.index + 1}</b><span className="muted"> · {where}</span></span>
        <span className="page-bar-tools">
          <select
            className="mini-select" title="Formato desta página" value={page.format ?? ''}
            onChange={(e) => setPageProps(page.id, { format: (e.target.value || null) as PageFormat | null })}
          >
            <option value="">{book.format} (livro)</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
          </select>
          <button className={`icon-btn${columns === 2 ? ' on' : ''}`} title={columns === 2 ? 'Voltar para uma coluna' : 'Diagramar em duas colunas'} onClick={() => setPageProps(page.id, { columns: columns === 2 ? 1 : 2 })}><Columns2 size={15} /></button>
          <button className="icon-btn" title="Nova página depois desta" onClick={() => addPage({ afterPageId: page.id })}><FilePlus2 size={15} /></button>
          <button className="icon-btn" title="Duplicar página" onClick={() => duplicatePage(page.id)}><Copy size={15} /></button>
          <button
            className="icon-btn" title="Excluir página"
            onClick={async () => { if (await confirmDialog({ title: 'Excluir página', message: `Excluir a página ${item.index + 1} e todo o seu conteúdo?`, confirmText: 'Excluir', danger: true })) deletePage(page.id); }}
          ><Trash2 size={15} /></button>
        </span>
      </div>
      <div className="page-zoom" style={{ zoom: scale }}>
        <div
          ref={pageRef}
          className={`page fmt-${format} style-${book.pageStyle}${columns === 2 ? ' cols-2' : ''}${overflow ? ' overflow' : ''}${moveTool ? ' move-tool' : ''}`}
          onMouseDown={startMarginSelect} onPointerDownCapture={startMove}
        >
          {guides.map((g, i) => <div key={i} className={`page-guide ${g.axis}`} style={g.axis === 'x' ? { left: g.at + guideOrigin.x, top: Math.max(0, g.from + guideOrigin.y - 10), height: g.to - g.from + 20 } : { top: g.at + guideOrigin.y, left: Math.max(0, g.from + guideOrigin.x - 10), width: g.to - g.from + 20 }} />)}
          <EditorContent editor={editor} className="page-body" />
          <div ref={limitRef} className="page-limit" aria-hidden><span>fim da página</span></div>
          {book.showPageNumbers && <div className="page-number" aria-hidden>{pageLabel(book.pageNumberStyle, item.index + 1, totalPages)}</div>}
        </div>
      </div>
      {overflow && (
        <div className="overflow-banner" role="status">
          <AlertTriangle size={15} />
          <span>{columns === 2 ? 'O conteúdo não cabe nas duas colunas desta página.' : 'O conteúdo passou do fim da página.'}{' '}
            {canSplit ? 'Na exportação, o excedente vai para a página seguinte.' : 'Este bloco é maior que a página; reduza-o ou divida-o.'}</span>
          {canSplit && <button className="btn small" onClick={() => { cascade.clear(); const next = splitPage(page.id, overflowAt); if (next) cascade.add(next); }}><Scissors size={13} /> Mover excedente para nova página</button>}
        </div>
      )}
    </div>
  );
}

export function Workspace() {
  const book = useApp((s) => s.book)!;
  const sel = useApp((s) => s.sel);
  const viewMode = useApp((s) => s.viewMode);
  const zoom = useApp((s) => s.zoom);
  const contentRev = useApp((s) => s.contentRev);
  const epoch = useApp((s) => s.epoch);
  const flat = useMemo(() => flatPages(book), [book]);
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pageId = sel.kind === 'page' ? sel.pageId : null;
  const idx = flat.findIndex((f) => f.page.id === pageId);
  const spread = viewMode === 'spread';

  // Lado a lado: as páginas andam em pares fixos — (1,2) (3,4) (5,6)…
  const visible: FlatPage[] = useMemo(() => {
    if (idx < 0) return [];
    if (!spread) return [flat[idx]];
    const start = idx - (idx % 2);
    return [flat[start], flat[start + 1]].filter(Boolean);
  }, [flat, idx, spread]);
  // No fim de um livro com número ímpar de páginas, o segundo lugar fica livre para uma página nova.
  const ghost = spread && visible.length === 1;

  const firstVisible = visible[0]?.page.id;
  useEffect(() => { host.current?.scrollTo({ top: 0 }); }, [firstVisible]);

  const gap = 28;
  const widthOf = (f: FlatPage) => FORMATS[formatOf(book, f.page)].w * MM_TO_PX;
  const total = visible.reduce((a, f) => a + widthOf(f), 0) + (ghost ? widthOf(visible[0]) : 0);
  const slots = visible.length + (ghost ? 1 : 0);
  const fit = Math.min(1.3, Math.max(0.2, (width - 56 - gap * (slots - 1)) / (total || 1)));
  const scale = zoom === 'fit' ? fit : zoom;

  // Ctrl + rolagem do mouse (ou gesto de pinça) aproxima e afasta, mantendo no lugar o ponto sob o cursor.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const anchor = useRef<{ cx: number; cy: number; sx: number; sy: number; ratio: number } | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const cur = scaleRef.current;
      const step = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const next = Math.min(3, Math.max(0.25, cur * Math.exp(-step * 0.0016)));
      if (Math.abs(next - cur) < 0.001) return;
      const box = el.getBoundingClientRect();
      anchor.current = { cx: e.clientX - box.left, cy: e.clientY - box.top, sx: el.scrollLeft, sy: el.scrollTop, ratio: next / cur };
      scaleRef.current = next;
      setZoom(Math.round(next * 1000) / 1000);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  useLayoutEffect(() => {
    const a = anchor.current; const el = host.current;
    if (!a || !el) return;
    anchor.current = null;
    el.scrollLeft = (a.sx + a.cx) * a.ratio - a.cx;
    el.scrollTop = (a.sy + a.cy) * a.ratio - a.cy;
  }, [scale]);

  const ghostFormat = ghost ? formatOf(book, visible[0].page) : 'A4';

  return (
    <div className="workspace" ref={host}>
      {!flat.length ? (
        <div className="empty-state">
          <h3>Este livro ainda não tem páginas</h3>
          <p>Crie um capítulo para começar a escrever.</p>
          <button className="btn primary" onClick={() => addChapter()}><Plus size={15} /> Novo capítulo</button>
        </div>
      ) : (
        <div className="pages-row" style={{ gap }}>
          {visible.map((item) => (
            <PageView key={`${item.page.id}:${contentRev[item.page.id] ?? 0}:${epoch}`} book={book} item={item} scale={scale} />
          ))}
          {ghost && (
            <div className="page-wrap" style={{ width: FORMATS[ghostFormat].w * MM_TO_PX * scale }}>
              <div className="page-bar"><span className="page-bar-title muted">Fim do livro</span></div>
              <button
                className="page-ghost" style={{ height: FORMATS[ghostFormat].h * MM_TO_PX * scale }}
                onClick={() => addPage({ afterPageId: visible[0].page.id })}
              ><Plus size={22} /> Nova página</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
