/* Painel esquerdo: livro, sumário e árvore de capítulos, seções e páginas. */
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, Copy, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, ListTree, MoreHorizontal,
  PanelLeftClose, Pencil, Plus, Trash2,
} from 'lucide-react';
import { SavePill } from './SaveIndicator';
import { SearchBox } from './SearchBox';
import { flatPages, pageSnippet, type Chapter, type Page, type Section } from '../model';
import {
  addChapter, addPage, addSection, setLeftOpen, deleteChapter, deletePage, deleteSection, duplicatePage, goToPage, moveChapter, movePage,
  moveSection, renameNode, select, setBookProps, setRenaming, shiftItem, useApp, type DropPos,
} from '../store';
import { InlineEdit, Menu, confirmDialog, type MenuItem } from './ui';

type Kind = 'chapter' | 'section' | 'page';
let dragging: { kind: Kind; id: string } | null = null;

/** Onde um item arrastado pode ser solto em relação a outro. */
function dropPosition(drag: Kind, target: Kind, e: DragEvent): DropPos | null {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const half: DropPos = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
  if (drag === target) return half;
  if (drag === 'section' && target === 'chapter') return 'inside';
  if (drag === 'page' && (target === 'chapter' || target === 'section')) return 'inside';
  return null;
}

export function LeftPanel() {
  const book = useApp((s) => s.book)!;
  const sel = useApp((s) => s.sel);
  const renaming = useApp((s) => s.renaming);
  const panelWidth = useApp((s) => s.prefs.leftWidth);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState<{ id: string; pos: DropPos } | null>(null);
  const [editTitle, setEditTitle] = useState(false);

  const flat = useMemo(() => flatPages(book), [book]);
  const numberOf = useMemo(() => new Map(flat.map((f) => [f.page.id, f.index + 1])), [flat]);
  const selPage = sel.kind === 'page' ? sel.pageId : null;

  // Abre os grupos que contêm a página selecionada.
  useEffect(() => {
    const f = flat.find((x) => x.page.id === selPage);
    if (!f) return;
    setCollapsed((c) => (c[f.chapter.id] || (f.section && c[f.section.id]) ? { ...c, [f.chapter.id]: false, ...(f.section ? { [f.section.id]: false } : {}) } : c));
  }, [selPage, flat]);

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const dnd = (kind: Kind, id: string) => ({
    draggable: renaming !== id,
    onDragStart: (e: DragEvent) => { dragging = { kind, id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.stopPropagation(); },
    onDragEnd: () => { dragging = null; setHint(null); },
    onDragOver: (e: DragEvent) => {
      if (!dragging || dragging.id === id) return;
      const pos = dropPosition(dragging.kind, kind, e);
      if (!pos) return;
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (hint?.id !== id || hint.pos !== pos) setHint({ id, pos });
    },
    onDragLeave: () => { if (hint?.id === id) setHint(null); },
    onDrop: (e: DragEvent) => {
      const d = dragging; dragging = null; setHint(null);
      if (!d || d.id === id) return;
      const pos = dropPosition(d.kind, kind, e);
      if (!pos) return;
      e.preventDefault(); e.stopPropagation();
      if (d.kind === 'chapter') moveChapter(d.id, id, pos);
      else if (d.kind === 'section') moveSection(d.id, id, pos);
      else movePage(d.id, id, pos);
    },
  });
  const hintClass = (id: string) => (hint?.id === id ? ` drop-${hint.pos}` : '');

  const pageRow = (p: Page, local: number) => {
    const n = numberOf.get(p.id) ?? 0;
    const snippet = pageSnippet(p);
    const items: MenuItem[] = [
      { label: 'Nova página depois', icon: <FilePlus2 size={14} />, onClick: () => addPage({ afterPageId: p.id }) },
      { label: 'Duplicar', icon: <Copy size={14} />, onClick: () => duplicatePage(p.id) },
      'sep',
      { label: 'Mover para cima', icon: <ArrowUp size={14} />, onClick: () => shiftItem('page', p.id, -1) },
      { label: 'Mover para baixo', icon: <ArrowDown size={14} />, onClick: () => shiftItem('page', p.id, 1) },
      'sep',
      { label: 'Excluir página', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir página', message: `Excluir a página ${n} e todo o seu conteúdo?`, confirmText: 'Excluir', danger: true })) deletePage(p.id); } },
    ];
    return (
      <div key={p.id} className={`tree-row page-row${selPage === p.id ? ' selected' : ''}${hintClass(p.id)}`} {...dnd('page', p.id)} onClick={() => goToPage(p.id)} title={`Página ${n} do livro${snippet ? ` — ${snippet}` : ''}`}>
        <span className="row-icon"><FileText size={14} /></span>
        <span className="row-label"><span className="page-no">{local}</span>{snippet || <i>página em branco</i>}</span>
        <Menu items={items} title="Opções da página" className="row-menu"><MoreHorizontal size={15} /></Menu>
      </div>
    );
  };

  const groupRow = (kind: 'chapter' | 'section', node: Chapter | Section, items: MenuItem[], firstPage: Page | null, count: number) => (
    <div
      className={`tree-row ${kind}-row${hintClass(node.id)}`} {...dnd(kind, node.id)}
      onClick={() => { if (firstPage) goToPage(firstPage.id); if (collapsed[node.id]) toggle(node.id); }}
      onDoubleClick={() => setRenaming(node.id)} title={node.title}
    >
      <button className={`twisty${collapsed[node.id] ? ' closed' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(node.id); }} aria-label={collapsed[node.id] ? 'Expandir' : 'Recolher'}>
        {collapsed[node.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
      </button>
      <span className="row-icon">{kind === 'chapter' ? <BookOpen size={15} /> : collapsed[node.id] ? <Folder size={15} /> : <FolderOpen size={15} />}</span>
      {renaming === node.id
        ? <InlineEdit value={node.title} onCommit={(v) => { renameNode(node.id, v); setRenaming(null); }} onCancel={() => setRenaming(null)} />
        : <span className="row-label">{node.title}</span>}
      {renaming !== node.id && <span className="count" title={`${count} página(s)`}>{count}</span>}
      <Menu items={items} title="Opções" className="row-menu"><MoreHorizontal size={15} /></Menu>
    </div>
  );

  const sectionBlock = (c: Chapter, s: Section) => {
    const items: MenuItem[] = [
      { label: 'Renomear', icon: <Pencil size={14} />, onClick: () => setRenaming(s.id) },
      { label: 'Nova página', icon: <FilePlus2 size={14} />, onClick: () => addPage({ containerId: s.id }) },
      'sep',
      { label: 'Mover para cima', icon: <ArrowUp size={14} />, onClick: () => shiftItem('section', s.id, -1) },
      { label: 'Mover para baixo', icon: <ArrowDown size={14} />, onClick: () => shiftItem('section', s.id, 1) },
      'sep',
      { label: 'Excluir seção', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir seção', message: `Excluir a seção “${s.title}” e ${s.pages.length} página(s)?`, confirmText: 'Excluir', danger: true })) deleteSection(s.id); } },
    ];
    return (
      <div key={s.id} className="tree-group">
        {groupRow('section', s, items, s.pages[0] ?? null, s.pages.length)}
        {!collapsed[s.id] && (
          <div className="tree-children">
            {s.pages.map((p, i) => pageRow(p, i + 1))}
            {!s.pages.length && <div className="tree-empty">Seção sem páginas</div>}
          </div>
        )}
      </div>
    );
  };

  const chapterBlock = (c: Chapter) => {
    const total = c.pages.length + c.sections.reduce((a, s) => a + s.pages.length, 0);
    const items: MenuItem[] = [
      { label: 'Renomear', icon: <Pencil size={14} />, onClick: () => setRenaming(c.id) },
      { label: 'Nova seção', icon: <FolderPlus size={14} />, onClick: () => { addSection(c.id); } },
      { label: 'Nova página', icon: <FilePlus2 size={14} />, onClick: () => addPage({ containerId: c.id }) },
      'sep',
      { label: 'Mover para cima', icon: <ArrowUp size={14} />, onClick: () => shiftItem('chapter', c.id, -1) },
      { label: 'Mover para baixo', icon: <ArrowDown size={14} />, onClick: () => shiftItem('chapter', c.id, 1) },
      'sep',
      { label: 'Excluir capítulo', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir capítulo', message: `Excluir o capítulo “${c.title}”, ${c.sections.length} seção(ões) e ${total} página(s)?`, confirmText: 'Excluir', danger: true })) deleteChapter(c.id); } },
    ];
    const first = c.pages[0] ?? c.sections.find((s) => s.pages.length)?.pages[0] ?? null;
    return (
      <div key={c.id} className="tree-group chapter-group">
        {groupRow('chapter', c, items, first, total)}
        {!collapsed[c.id] && (
          <div className="tree-children">
            {c.pages.map((p, i) => pageRow(p, i + 1))}
            {c.sections.map((s) => sectionBlock(c, s))}
            {!total && !c.sections.length && <div className="tree-empty">Capítulo sem páginas</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="left-panel" aria-label="Estrutura do livro" style={{ '--w': `${panelWidth}px` } as React.CSSProperties}>
      <div className="side-head">
        {editTitle
          ? <InlineEdit className="inline-edit book-title-edit" value={book.title} onCommit={(v) => { setBookProps({ title: v }); setEditTitle(false); }} onCancel={() => setEditTitle(false)} />
          : <button className="book-title" title="Clique para renomear o livro" onClick={() => setEditTitle(true)}>{book.title}</button>}
        <button className="icon-btn" title="Novo capítulo" onClick={() => addChapter()}><Plus size={16} /></button>
        <button className="icon-btn" title="Ocultar estrutura" onClick={() => setLeftOpen(false)}><PanelLeftClose size={16} /></button>
      </div>
      <div className="side-meta"><span>{flat.length} página(s) · {book.format}</span><SavePill /></div>
      <div className="side-search"><SearchBox /></div>

      <div className="tree" role="tree">
        <div className={`tree-row toc-row toc-link${sel.kind === 'toc' ? ' selected' : ''}`} onClick={() => select({ kind: 'toc' })} title="Abrir o sumário do livro">
          <span className="row-icon"><ListTree size={15} /></span>
          <span className="row-label">Sumário</span>
        </div>
        <div className="tree-section">Capítulos</div>
        {book.chapters.map(chapterBlock)}
        {!book.chapters.length && <div className="tree-empty">Nenhum capítulo ainda.</div>}
      </div>
      <button className="btn ghost add-chapter" onClick={() => addChapter()}><Plus size={15} /> Novo capítulo</button>
    </aside>
  );
}
