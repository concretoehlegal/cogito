/* Sumário: gerado a partir da estrutura, editável à mão e clicável. */
import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2, Check } from 'lucide-react';
import { buildToc, flatPages, pageSnippet, type TocEntry } from '../model';
import {
  addTocCustom, goToPage, removeTocCustom, resetAllToc, resetTocOverride, setTocOverride, setTocProps, updateTocCustom, useApp,
} from '../store';
import { confirmDialog } from './ui';

function LabelInput({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className="toc-input" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onCommit(v); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setV(value); } }}
    />
  );
}

export function TocView() {
  const book = useApp((s) => s.book)!;
  const [editing, setEditing] = useState(false);
  const entries = useMemo(() => buildToc(book), [book]);
  const flat = useMemo(() => flatPages(book), [book]);
  const [newLabel, setNewLabel] = useState('');
  const [newPage, setNewPage] = useState('');
  const [newLevel, setNewLevel] = useState<1 | 2>(2);

  const shown = editing ? entries : entries.filter((e) => !e.hidden);
  const manualCount = entries.filter((e) => e.edited).length;
  const pageOptions = flat.map((f) => (
    <option key={f.page.id} value={f.page.id}>{`Pág. ${f.index + 1} — ${pageSnippet(f.page) || f.section?.title || f.chapter.title}`}</option>
  ));

  const commitLabel = (e: TocEntry, v: string) => {
    if (e.kind === 'custom') updateTocCustom(e.id, { label: v.trim() || e.label });
    else setTocOverride(e.id, { label: v.trim() === e.autoLabel ? undefined : v.trim() });
  };

  return (
    <div className="workspace">
      <div className="toc-wrap">
        <div className="page-bar">
          <span className="page-bar-title"><b>Sumário</b><span className="muted"> · {editing ? 'editando' : 'clique em um item para ir até a página'}</span></span>
          <span className="page-bar-tools">
            <label className="check" title="Quando marcado, o sumário abre o PDF e o DOCX exportados">
              <input type="checkbox" checked={book.toc.includeInExport} onChange={(e) => setTocProps({ includeInExport: e.target.checked })} /> Incluir na exportação
            </label>
            <button className={`btn small${editing ? ' primary' : ''}`} onClick={() => setEditing(!editing)}>
              {editing ? <><Check size={13} /> Concluir</> : <><Pencil size={13} /> Editar sumário</>}
            </button>
          </span>
        </div>

        <div className={`page toc-sheet style-${book.pageStyle}`}>
          <div className="page-content toc-content">
            {editing
              ? <input className="toc-title-input" value={book.toc.title} onChange={(e) => setTocProps({ title: e.target.value })} aria-label="Título do sumário" />
              : <h1 className="toc-title">{book.toc.title || 'Sumário'}</h1>}

            {!shown.length && <p className="muted">O sumário aparece aqui conforme você cria capítulos e seções.</p>}

            <div className="toc-list">
              {shown.map((e) => {
                const num = e.pageIndex >= 0 ? e.pageIndex + 1 : null;
                if (!editing) {
                  return (
                    <button key={e.id} className={`toc-entry lvl-${e.level}`} disabled={!e.pageId} onClick={() => e.pageId && goToPage(e.pageId)} title={e.pageId ? `Ir para a página ${num}` : 'Este item ainda não aponta para uma página'}>
                      <span className="toc-label">{e.label}</span>
                      <span className="toc-dots" />
                      <span className="toc-num">{num ?? '—'}</span>
                    </button>
                  );
                }
                return (
                  <div key={e.id} className={`toc-edit-row lvl-${e.level}${e.hidden ? ' hidden-entry' : ''}`}>
                    {e.kind === 'custom'
                      ? <span className="toc-tag manual" title="Item criado manualmente">manual</span>
                      : <button className="icon-btn dark" title={e.hidden ? 'Mostrar no sumário' : 'Ocultar do sumário'} onClick={() => setTocOverride(e.id, { hidden: !e.hidden })}>{e.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
                    <LabelInput value={e.label} onCommit={(v) => commitLabel(e, v)} placeholder={e.autoLabel} />
                    {e.kind === 'custom' && (
                      <>
                        <select className="toc-select" value={e.pageId ?? ''} title="Página de destino" onChange={(ev) => updateTocCustom(e.id, { pageId: ev.target.value || null })}>
                          <option value="">(sem destino)</option>
                          {pageOptions}
                        </select>
                        <select className="toc-select narrow" value={e.level} title="Nível" onChange={(ev) => updateTocCustom(e.id, { level: Number(ev.target.value) as 1 | 2 })}>
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                        </select>
                        <button className="icon-btn dark" title="Excluir item manual" onClick={() => removeTocCustom(e.id)}><Trash2 size={15} /></button>
                      </>
                    )}
                    {e.kind !== 'custom' && e.edited && (
                      <button className="icon-btn dark" title={`Voltar ao automático (“${e.autoLabel}”)`} onClick={() => resetTocOverride(e.id)}><RotateCcw size={15} /></button>
                    )}
                    {e.kind !== 'custom' && e.edited && <span className="toc-tag" title="Alterado manualmente; não é sobrescrito quando a estrutura muda">editado</span>}
                    <span className="toc-num">{num ?? '—'}</span>
                  </div>
                );
              })}
            </div>

            {editing && (
              <div className="toc-add">
                <strong>Adicionar item manual</strong>
                <div className="toc-add-row">
                  <input className="toc-input" placeholder="Texto do item (ex.: Apêndice A)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                  <select className="toc-select" value={newPage} onChange={(e) => setNewPage(e.target.value)} title="Página de destino">
                    <option value="">Escolha a página…</option>
                    {pageOptions}
                  </select>
                  <select className="toc-select narrow" value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value) as 1 | 2)}>
                    <option value={1}>Nível 1</option>
                    <option value={2}>Nível 2</option>
                  </select>
                  <button className="btn small primary" disabled={!newLabel.trim()} onClick={() => { addTocCustom(newLabel, newPage || null, newLevel); setNewLabel(''); setNewPage(''); }}><Plus size={13} /> Adicionar</button>
                </div>
                <p className="toc-help">
                  Capítulos e seções entram no sumário sozinhos e acompanham renomeações e mudanças de ordem.
                  O que você alterar aqui (textos, itens ocultos e itens manuais) é preservado quando a estrutura muda.
                </p>
                {manualCount > 0 && (
                  <button className="btn small" onClick={async () => { if (await confirmDialog({ title: 'Restaurar sumário automático', message: `Descartar ${manualCount} alteração(ões) manual(is) e voltar ao sumário gerado pela estrutura?`, confirmText: 'Restaurar', danger: true })) resetAllToc(); }}>
                    <RotateCcw size={13} /> Descartar alterações manuais
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
