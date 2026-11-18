/* Painel direito: inserir conteúdo, rolar dados, biblioteca de PDFs e anexos de consulta. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dices, ExternalLink, FilePlus2, FileText, FileType2, Heading1, Heading2, Heading3, ImageIcon, MessageSquareQuote, MoreHorizontal,
  Pencil, Plus, ScrollText, Search, Shield, Skull, Sparkles, Table2, Trash2, X,
} from 'lucide-react';
import { api, errorText, formatBytes, type LibraryItem, type RefFile } from '../api';
import { DICE, HISTORY_LIMIT, pushHistory, roll, type RollResult } from '../lib/dice';
import { DiceColors, DiceFx, DieFace, extremeOf, type FxRoll } from '../dice/DiceFx';
import {
  characterSheet, creatureBlock, imageNode, itemBlock, masterNote, readAloud, rollTableTemplate, tableTemplate,
} from '../editor/templates';
import { exportDocx } from '../export/docx';
import { exportPdf } from '../export/pdf';
import type { DocNode } from '../model';
import { addPageAtEnd, openViewer, remember, setPrefs, setRightTab, toast, useApp, type RightTab } from '../store';
import { ResizeHandle } from './ResizeHandle';
import { SHAPES, shapeParts } from '../editor/shapes';
import { insertBlock } from './Workspace';
import { BrandLogo } from './Logo';
import { IconAttach, IconDice, IconExport, IconGear, IconImage, IconLibrary, IconText } from './icons';
import { Menu, confirmDialog, fmtTime, promptDialog } from './ui';

const TABS: { id: RightTab; label: string; icon: ReactNode }[] = [
  { id: 'dados', label: 'Dados', icon: <IconDice size={27} /> },
  { id: 'biblioteca', label: 'Biblioteca', icon: <IconLibrary size={25} /> },
  { id: 'inserir', label: 'Inserir', icon: <IconText size={27} /> },
  { id: 'anexos', label: 'Anexos', icon: <IconAttach size={25} /> },
];

/** Escolhe imagens no computador e insere na página ativa. */
export async function pickAndInsertImages() {
  const { book, activeEditor } = useApp.getState();
  if (!book) return;
  if (!activeEditor || activeEditor.isDestroyed) { toast('Clique em uma página para inserir a imagem nela.', 'info'); return; }
  try {
    const picked = await api.pickImages(book.id);
    if (picked.length && !activeEditor.isDestroyed) insertBlock(activeEditor, picked.map((i) => imageNode(i.url, i.name)));
  } catch (e) { toast(`Não foi possível inserir a imagem: ${errorText(e)}`, 'error'); }
}

export function RightPanel({ onHome, onSettings }: { onHome: () => void; onSettings: () => void }) {
  const tab = useApp((s) => s.rightTab);
  const panelWidth = useApp((s) => s.prefs.rightWidth);
  return (
    <aside className={`right-side${tab ? ' open' : ''}`} aria-label="Ferramentas">
      {tab && <ResizeHandle side="right" />}
      {tab && (
        <div className="right-panel" style={{ '--w': `${panelWidth}px` } as React.CSSProperties}>
          <header className="panel-head">
            <h3>{TABS.find((t) => t.id === tab)?.label}</h3>
            <button className="icon-btn" title="Recolher painel" onClick={() => setRightTab(null)}><X size={16} /></button>
          </header>
          <div className="panel-body">
            {tab === 'inserir' && <InsertPanel />}
            {tab === 'dados' && <DicePanel />}
            {tab === 'biblioteca' && <LibraryPanel />}
            {tab === 'anexos' && <RefsPanel />}
          </div>
        </div>
      )}
      <nav className="rail" aria-label="Ferramentas">
        <button className="rail-logo" title="Meus livros" aria-label="Meus livros" onClick={onHome}><BrandLogo size={44} /></button>
        {TABS.map((t) => (
          <button key={t.id} className={`rail-btn${tab === t.id ? ' on' : ''}`} title={t.label} aria-label={t.label} aria-pressed={tab === t.id} onClick={() => setRightTab(tab === t.id ? null : t.id)}>
            {t.icon}
          </button>
        ))}
        <button className="rail-btn" title="Inserir imagem na página" aria-label="Inserir imagem" onMouseDown={(e) => e.preventDefault()} onClick={() => { void pickAndInsertImages(); }}><IconImage size={25} /></button>
        <span className="rail-space" />
        <Menu
          className="rail-btn" title="Exportar o livro" align="right"
          items={[
            { label: 'Exportar como PDF', icon: <FileText size={14} />, onClick: () => { void exportPdf(); } },
            { label: 'Exportar como DOCX (Word)', icon: <FileType2 size={14} />, onClick: () => { void exportDocx(); } },
          ]}
        ><IconExport size={24} /></Menu>
        <button className="rail-btn" title="Configurações" aria-label="Configurações" onClick={onSettings}><IconGear size={26} /></button>
      </nav>
    </aside>
  );
}

/* ───────────── Inserir ───────────── */

function InsertButton({ icon, label, hint, onClick, disabled }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="insert-btn" disabled={disabled} title={hint ?? label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <span className="insert-icon">{icon}</span><span>{label}</span>
    </button>
  );
}

function InsertPanel() {
  const editor = useApp((s) => s.activeEditor);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(3);
  const [sides, setSides] = useState(6);
  const off = !editor || editor.isDestroyed;
  const put = (node: DocNode | DocNode[]) => { if (editor && !editor.isDestroyed) insertBlock(editor, node); };
  const heading = (level: 1 | 2 | 3) => put({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: level === 1 ? 'Título' : level === 2 ? 'Subtítulo' : 'Título menor' }] });

  const addImage = () => { void pickAndInsertImages(); };

  return (
    <div className="insert-panel">
      {off && <p className="panel-note">Clique em uma página para inserir conteúdo nela.</p>}

      <h4>Texto</h4>
      <div className="insert-grid">
        <InsertButton icon={<Heading1 size={17} />} label="Título" disabled={off} onClick={() => heading(1)} />
        <InsertButton icon={<Heading2 size={17} />} label="Subtítulo" disabled={off} onClick={() => heading(2)} />
        <InsertButton icon={<Heading3 size={17} />} label="Título menor" disabled={off} onClick={() => heading(3)} />
        <InsertButton icon={<ImageIcon size={17} />} label="Imagem" hint="Inserir imagem do computador (fica no livro exportado)" disabled={off} onClick={addImage} />
      </div>

      <h4>Tabelas</h4>
      <div className="insert-line">
        <InsertButton icon={<Table2 size={17} />} label="Tabela" disabled={off} onClick={() => put(tableTemplate(rows, cols))} />
        <label className="num" title="Linhas"><input type="number" min={2} max={40} value={rows} onChange={(e) => setRows(Math.min(40, Math.max(2, Number(e.target.value) || 2)))} /> lin.</label>
        <label className="num" title="Colunas"><input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} /> col.</label>
      </div>
      <div className="insert-line">
        <InsertButton icon={<Dices size={17} />} label="Tabela de rolagem" hint="Tabela numerada para sortear resultados com um dado" disabled={off} onClick={() => put(rollTableTemplate(sides))} />
        <select className="mini-select" value={sides} onChange={(e) => setSides(Number(e.target.value))} title="Dado da tabela">
          {DICE.map((d) => <option key={d} value={d}>d{d}</option>)}
        </select>
      </div>

      <h4>Formas</h4>
      <div className="shape-grid">
        {SHAPES.map((k) => (
          <button key={k.kind} className="shape-btn" title={`${k.label} — arraste as alças para redimensionar`} disabled={off} onMouseDown={(e) => e.preventDefault()}
            onClick={() => put({ type: 'shape', attrs: { kind: k.kind, width: k.w, height: k.h, fill: k.kind === 'line' ? 'transparent' : k.kind === 'banner' ? '#7a1f1f' : '#d9d0bf', stroke: '#161616', strokeWidth: k.kind === 'line' ? 3 : 2, label: k.kind === 'banner' ? 'Título' : '', labelColor: k.kind === 'banner' ? '#f2e6c9' : '#161616', align: 'center', wrap: 'none' } })}>
            <svg viewBox={`0 0 ${k.w} ${k.h}`} width="38" height="26" preserveAspectRatio="xMidYMid meet" aria-hidden>
              {shapeParts(k.kind, k.w, k.h, k.kind === 'line' ? 10 : 8).map((p, i) => <path key={i} d={p.d} fill={p.fill ? 'currentColor' : 'none'} fillOpacity={p.shade ? 0.45 : 0.28} stroke="currentColor" strokeWidth={k.kind === 'line' ? 10 : 8} strokeLinejoin="round" />)}
            </svg>
            <span>{k.label}</span>
          </button>
        ))}
      </div>

      <h4>Blocos de RPG</h4>
      <div className="insert-grid one">
        <InsertButton icon={<Shield size={17} />} label="Ficha de personagem" disabled={off} onClick={() => put(characterSheet())} />
        <InsertButton icon={<Skull size={17} />} label="Bloco de criatura" disabled={off} onClick={() => put(creatureBlock())} />
        <InsertButton icon={<Sparkles size={17} />} label="Item ou magia" disabled={off} onClick={() => put(itemBlock())} />
        <InsertButton icon={<ScrollText size={17} />} label="Nota do mestre" disabled={off} onClick={() => put(masterNote())} />
        <InsertButton icon={<MessageSquareQuote size={17} />} label="Texto para leitura" hint="Caixa de texto para ler em voz alta aos jogadores" disabled={off} onClick={() => put(readAloud())} />
      </div>

      <h4>Página</h4>
      <div className="insert-grid one">
        <InsertButton icon={<FilePlus2 size={17} />} label="Nova página" onClick={() => addPageAtEnd()} />
      </div>
      <p className="panel-note">Você também pode colar ou arrastar imagens direto para a página.</p>
    </div>
  );
}

/* ───────────── Dados ───────────── */

function loadHistory(): RollResult[] {
  try { const v = JSON.parse(localStorage.getItem('cogito.dados') || '[]'); return Array.isArray(v) ? v.slice(0, HISTORY_LIMIT) : []; } catch { return []; }
}
const toFx = (r: RollResult, color: string): FxRoll => ({
  id: r.id, formula: r.formula, total: r.total, color,
  dice: r.parts.flatMap((p) => { const s = Number(/d(\d+)/.exec(p.text)?.[1] ?? 0); return p.rolls.map((v) => ({ s, v })); }),
  extreme: extremeOf(r.parts, r.total), detail: breakdown(r),
});

function DicePanel() {
  const animate = useApp((s) => s.prefs.diceAnim);
  const diceColor = useApp((s) => s.prefs.diceColor);
  const [history, setHistory] = useState<RollResult[]>(loadHistory);
  const [formula, setFormula] = useState('2d6+3');
  const [error, setError] = useState('');
  const [shown, setShown] = useState<FxRoll | null>(() => { const h = loadHistory()[0]; return h ? toFx(h, diceColor) : null; });
  const [fresh, setFresh] = useState(false);

  const doRoll = (f: string) => {
    let r: RollResult;
    try { r = roll(f); } catch (e) { setError(errorText(e)); return; }
    setError('');
    setHistory((h) => { const next = pushHistory(h, r); remember('cogito.dados', next); return next; });
    setShown(toFx(r, diceColor));
    setFresh(true);
  };

  return (
    <div className="dice-panel">
      <div className="dice-grid">
        {DICE.map((d) => (
          <button key={d} data-silent className="die-btn" title={`Rolar 1d${d}`} onClick={() => doRoll(`1d${d}`)}>
            <DieFace sides={d} value={d} color={diceColor} size={34} />
            <span>d{d}</span>
          </button>
        ))}
      </div>

      <form className="dice-form" onSubmit={(e) => { e.preventDefault(); doRoll(formula); }}>
        <input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="2d6+3" aria-label="Fórmula de dados" spellCheck={false} />
        <button className="btn primary" type="submit" data-silent>Rolar</button>
      </form>
      {error && <p className="dice-error" role="alert">{error}</p>}

      <div className="dice-stage-fx">
        {shown ? <DiceFx key={shown.id} roll={shown} animate={fresh && animate} sound={fresh} /> : <p className="muted small">Escolha um dado ou digite uma fórmula.</p>}
      </div>
      <h4>Cor dos meus dados</h4>
      <DiceColors value={diceColor} onChange={(c) => setPrefs({ diceColor: c })} />

      <div className="dice-history-head">
        <h4>Últimas rolagens</h4>
        {history.length > 0 && <button className="link-btn" onClick={() => { setHistory([]); remember('cogito.dados', []); }}>limpar</button>}
      </div>
      <ol className="dice-history">
        {history.map((r) => (
          <li key={r.id} title={breakdown(r)}>
            <button className="hist-formula" data-silent title="Rolar de novo" onClick={() => doRoll(r.formula)}>{r.formula}</button>
            <span className="hist-break">{breakdown(r)}</span>
            <strong className={extremeOf(r.parts, r.total) ?? ''}>{r.total}</strong>
            <time>{fmtTime(r.at)}</time>
          </li>
        ))}
        {!history.length && <li className="muted empty">Nenhuma rolagem ainda.</li>}
      </ol>
      <p className="panel-note">O histórico guarda só as {HISTORY_LIMIT} rolagens mais recentes. O maior resultado possível ganha brilho dourado; o menor, rachaduras.</p>
    </div>
  );
}

function breakdown(r: RollResult): string {
  return r.parts.map((p) => (p.rolls.length ? `${p.text} [${p.rolls.join(', ')}]` : p.text)).join(' ');
}

/* ───────────── Biblioteca ───────────── */

function LibraryPanel() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [q, setQ] = useState('');
  const viewer = useApp((s) => s.viewer);
  useEffect(() => { api.listLibrary().then(setItems, (e) => { setItems([]); toast(errorText(e), 'error'); }); }, []);
  const shown = useMemo(() => (items ?? []).filter((i) => i.title.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')), [items, q]);

  const add = async () => {
    try { setItems(await api.addToLibrary()); } catch (e) { toast(`Não foi possível adicionar: ${errorText(e)}`, 'error'); }
  };
  const open = (i: LibraryItem) => openViewer({ key: `lib:${i.id}`, kind: 'pdf', title: i.title, url: i.url, source: 'biblioteca' });

  return (
    <div className="list-panel">
      <button className="btn primary block" onClick={add}><Plus size={15} /> Adicionar PDFs</button>
      {(items?.length ?? 0) > 3 && (
        <label className="search"><Search size={14} /><input placeholder="Filtrar por título" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      )}
      <ul className="file-list">
        {shown.map((i) => (
          <li key={i.id} className={viewer?.key === `lib:${i.id}` ? 'on' : ''}>
            <button className="file-main" onClick={() => open(i)} title="Abrir para consulta">
              <FileText size={16} /><span className="file-title">{i.title}</span><span className="file-meta">{formatBytes(i.size)}</span>
            </button>
            <Menu
              className="row-menu" title="Opções"
              items={[
                { label: 'Renomear', icon: <Pencil size={14} />, onClick: async () => { const t = await promptDialog({ title: 'Renomear PDF', label: 'Título na biblioteca', value: i.title, confirmText: 'Renomear' }); if (t) setItems(await api.renameLibraryItem(i.id, t)); } },
                { label: 'Remover da biblioteca', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Remover da biblioteca', message: `Remover “${i.title}”? O arquivo vai para a lixeira.`, confirmText: 'Remover', danger: true })) { if (viewer?.key === `lib:${i.id}`) openViewer(null); setItems(await api.removeLibraryItem(i.id)); } } },
              ]}
            ><MoreHorizontal size={15} /></Menu>
          </li>
        ))}
      </ul>
      {items && !items.length && <p className="panel-empty">Sua biblioteca está vazia. Adicione PDFs de outros sistemas para consultar enquanto escreve.</p>}
      {items && items.length > 0 && !shown.length && <p className="panel-empty">Nenhum PDF com esse título.</p>}
      <p className="panel-note">A biblioteca é só para consulta: fica neste computador, é independente dos seus livros e nunca entra nas exportações.</p>
    </div>
  );
}

/* ───────────── Anexos de consulta do livro ───────────── */

const kindOf = (name: string): 'pdf' | 'image' | 'other' => (/\.pdf$/i.test(name) ? 'pdf' : /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name) ? 'image' : 'other');

function RefsPanel() {
  const bookId = useApp((s) => s.book!.id);
  const viewer = useApp((s) => s.viewer);
  const [items, setItems] = useState<RefFile[] | null>(null);
  useEffect(() => { api.listRefs(bookId).then(setItems, () => setItems([])); }, [bookId]);

  const add = async () => {
    try { setItems(await api.addRefs(bookId)); } catch (e) { toast(`Não foi possível anexar: ${errorText(e)}`, 'error'); }
  };
  const open = (f: RefFile) => {
    const kind = kindOf(f.name);
    if (kind === 'other') { void api.openRefExternal(bookId, f.name); return; }
    openViewer({ key: `ref:${f.name}`, kind, title: f.name, url: f.url, source: 'anexo', name: f.name });
  };

  return (
    <div className="list-panel">
      <button className="btn primary block" onClick={add}><Plus size={15} /> Anexar arquivos</button>
      <ul className="file-list">
        {(items ?? []).map((f) => (
          <li key={f.name} className={viewer?.key === `ref:${f.name}` ? 'on' : ''}>
            <button className="file-main" onClick={() => open(f)} title={kindOf(f.name) === 'other' ? 'Abrir no programa padrão do computador' : 'Abrir para consulta'}>
              {kindOf(f.name) === 'image' ? <ImageIcon size={16} /> : kindOf(f.name) === 'other' ? <ExternalLink size={16} /> : <FileText size={16} />}
              <span className="file-title">{f.name}</span><span className="file-meta">{formatBytes(f.size)}</span>
            </button>
            <Menu
              className="row-menu" title="Opções"
              items={[{ label: 'Remover anexo', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Remover anexo', message: `Remover “${f.name}” deste livro? O arquivo vai para a lixeira.`, confirmText: 'Remover', danger: true })) { if (viewer?.key === `ref:${f.name}`) openViewer(null); setItems(await api.removeRef(bookId, f.name)); } } }]}
            ><MoreHorizontal size={15} /></Menu>
          </li>
        ))}
      </ul>
      {items && !items.length && <p className="panel-empty">Nenhum anexo. Guarde aqui rascunhos, mapas e referências deste livro.</p>}
      <p className="panel-note">Anexos são material de consulta deste livro e <b>não entram</b> no PDF nem no DOCX exportados. Para colocar uma imagem no livro, use Inserir › Imagem.</p>
    </div>
  );
}
