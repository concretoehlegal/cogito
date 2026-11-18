/* Busca no texto do livro aberto (capítulos, seções e páginas). Tudo local, sem internet. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { flatPages, nodeText } from '../model';
import { goToPage, useApp } from '../store';
import { IconSearch } from './icons';

/** Minúsculas e sem acentos, mantendo o mesmo comprimento sempre que possível. */
function fold(s: string): string {
  const out = Array.from(s, (ch) => ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() || ch).join('');
  return out.length === s.length ? out : s.toLowerCase();
}

interface Hit { pageId: string; number: number; where: string; before: string; match: string; after: string; count: number }

export function SearchBox() {
  const book = useApp((s) => s.book)!;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const query = q.trim();
  const active = open && query.length >= 2;

  const hits = useMemo<Hit[]>(() => {
    if (!active) return [];
    const needle = fold(query);
    const out: Hit[] = [];
    for (const f of flatPages(book)) {
      const where = f.section ? `${f.chapter.title} › ${f.section.title}` : f.chapter.title;
      const text = nodeText(f.page.content, 1e7);
      const hay = fold(text);
      let i = hay.indexOf(needle);
      if (i < 0) {
        // O nome do capítulo ou da seção também conta, apontando para a primeira página.
        const first = f.section ? f.section.pages[0] : f.chapter.pages[0] ?? f.chapter.sections[0]?.pages[0];
        if (first?.id === f.page.id && fold(where).includes(needle)) out.push({ pageId: f.page.id, number: f.index + 1, where, before: '', match: '', after: 'título na estrutura do livro', count: 1 });
        continue;
      }
      let count = 0;
      for (let j = i; j >= 0; j = hay.indexOf(needle, j + needle.length)) count++;
      const start = Math.max(0, i - 28);
      out.push({
        pageId: f.page.id, number: f.index + 1, where, count,
        before: (start > 0 ? '…' : '') + text.slice(start, i), match: text.slice(i, i + needle.length), after: text.slice(i + needle.length, i + needle.length + 70),
      });
      if (out.length >= 60) break;
    }
    return out;
  }, [active, query, book]);

  useEffect(() => { setCursor(0); }, [query]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', away);
    return () => window.removeEventListener('mousedown', away);
  }, [open]);

  const go = (h: Hit | undefined) => { if (h) { goToPage(h.pageId); setOpen(false); } };

  return (
    <div className="searchbox" ref={box}>
      <label className="search-field">
        <IconSearch size={15} />
        <input
          id="book-search" value={q} placeholder="Buscar" spellCheck={false} aria-label="Buscar no livro"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(hits.length - 1, c + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
            else if (e.key === 'Enter') go(hits[cursor]);
          }}
        />
        <span className="kbd" title="Atalho: Ctrl + F">Ctrl F</span>
      </label>
      {active && (
        <div className="search-results" role="listbox">
          {hits.map((h, i) => (
            <button key={h.pageId} role="option" aria-selected={i === cursor} className={`search-item${i === cursor ? ' on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => go(h)}>
              <span className="search-where"><b>PÁG. {h.number}</b><span>{h.where}{h.count > 1 ? ` · ${h.count} ocorrências` : ''}</span></span>
              <span className="search-snippet">{h.before}{h.match && <mark>{h.match}</mark>}{h.after}</span>
            </button>
          ))}
          {!hits.length && <div className="search-empty">Nada encontrado para “{query}”.</div>}
        </div>
      )}
    </div>
  );
}
