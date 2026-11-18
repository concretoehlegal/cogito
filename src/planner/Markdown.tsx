/*
 * Markdown simples para as notas do quadro (como no Obsidian): títulos (#, ##, ###), listas (- e 1.),
 * citações (>), linha (---), **negrito**, *itálico*, `código` e [[links]] para outras fichas.
 */
import type { ReactNode } from 'react';
import type { PlanNode } from '../game/types';
import { findByTitle } from './model';

type Block = { k: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string } | { k: 'ul' | 'ol'; items: string[] } | { k: 'hr' };

export function blocksOf(src: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ k: 'p', text: para.join('\n') }); para = []; } };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flush(); out.push({ k: (['h1', 'h2', 'h3'] as const)[m[1].length - 1], text: m[2] }); continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flush(); out.push({ k: 'hr' }); continue; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { flush(); const last = out[out.length - 1]; if (last && last.k === 'ul') last.items.push(m[1]); else out.push({ k: 'ul', items: [m[1]] }); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flush(); const last = out[out.length - 1]; if (last && last.k === 'ol') last.items.push(m[1]); else out.push({ k: 'ol', items: [m[1]] }); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flush(); const last = out[out.length - 1]; if (last && last.k === 'quote') (last as { text: string }).text += `\n${m[1]}`; else out.push({ k: 'quote', text: m[1] }); continue; }
    para.push(line);
  }
  flush();
  return out;
}

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[\[[^\]\n]+\]\])/g;

function Inline({ text, nodes, onLink }: { text: string; nodes: PlanNode[]; onLink: (t: string) => void }) {
  const parts: ReactNode[] = [];
  let last = 0; let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const t = m[0];
    if (t.startsWith('[[')) {
      const name = t.slice(2, -2).split('|')[0].trim();
      parts.push(<button key={i++} type="button" className={`pn-link${findByTitle(nodes, name) ? '' : ' missing'}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onLink(name); }}>{name}</button>);
    } else if (t.startsWith('**') || t.startsWith('__')) parts.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) parts.push(<code key={i++}>{t.slice(1, -1)}</code>);
    else parts.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = at + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function Markdown({ body, nodes, onLink }: { body: string; nodes: PlanNode[]; onLink: (t: string) => void }) {
  return (
    <div className="md">
      {blocksOf(body).map((b, i) => {
        if (b.k === 'hr') return <hr key={i} />;
        if (b.k === 'ul' || b.k === 'ol') {
          const L = b.k;
          return <L key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} nodes={nodes} onLink={onLink} /></li>)}</L>;
        }
        if (b.k === 'quote') return <blockquote key={i}><Inline text={b.text} nodes={nodes} onLink={onLink} /></blockquote>;
        const T = b.k as 'h1' | 'h2' | 'h3' | 'p';
        return <T key={i}><Inline text={(b as { text: string }).text} nodes={nodes} onLink={onLink} /></T>;
      })}
    </div>
  );
}
