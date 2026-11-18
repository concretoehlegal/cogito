/*
 * Exportação para PDF.
 * Monta as páginas finais em um contêiner fora da tela (com as mesmas fontes e estilos do editor),
 * distribui o excedente de cada página em páginas extras, numera, preenche o sumário
 * e pede ao aplicativo que imprima esse contêiner em PDF.
 * Só entra o conteúdo das páginas: anexos de consulta e a biblioteca ficam de fora.
 */
import { generateHTML } from '@tiptap/core';
import { api, errorText } from '../api';
import { contentExtensions } from '../editor/extensions';
import { resolveFormulas } from '../lib/formula';
import { contentBlocks, overflowIndex } from '../lib/layout';
import { buildToc, flatPages, formatOf, type Book, type DocNode } from '../model';
import { saveNow, setBusy, toast, useApp } from '../store';

/** Remove parágrafos vazios do fim da página (o editor mantém um para facilitar a escrita). */
export function trimDoc(doc: DocNode): DocNode {
  const content = [...(doc.content ?? [])];
  while (content.length && content[content.length - 1].type === 'paragraph' && !content[content.length - 1].content?.length) content.pop();
  return { type: 'doc', content };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeSheet(book: Book, format: string, columns: 1 | 2, extra = ''): { sheet: HTMLElement; content: HTMLElement; limit: HTMLElement } {
  const sheet = el('section', `print-sheet page fmt-${format} style-${book.pageStyle}${columns === 2 ? ' cols-2' : ''}${extra}`);
  const body = el('div', 'page-body');
  const content = el('div', 'page-content');
  const limit = el('div', 'page-limit');
  body.append(content);
  sheet.append(body, limit);
  return { sheet, content, limit };
}

/** Enquanto o conteúdo não couber, passa o excedente para uma nova folha logo em seguida. */
function paginate(book: Book, first: { sheet: HTMLElement; content: HTMLElement; limit: HTMLElement }, format: string, columns: 1 | 2, extra = ''): HTMLElement[] {
  const sheets = [first.sheet];
  let cur = first;
  for (let guard = 0; guard < 500; guard++) {
    const idx = overflowIndex(cur.content, cur.limit.getBoundingClientRect().top, columns);
    if (idx < 0) break;
    const blocks = contentBlocks(cur.content);
    const at = Math.max(1, idx);
    if (at >= blocks.length) break;
    const next = makeSheet(book, format, columns, extra);
    next.content.append(...blocks.slice(at));
    cur.sheet.after(next.sheet);
    sheets.push(next.sheet);
    cur = next;
  }
  return sheets;
}

async function settle(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }))));
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

export async function buildPrintRoot(book: Book): Promise<{ root: HTMLElement; sheets: number; cleanup: () => void }> {
  document.getElementById('print-root')?.remove();
  const root = el('div');
  root.id = 'print-root';
  document.body.append(root);

  // 1) Páginas de conteúdo.
  const flat = flatPages(book);
  const made = flat.map((f) => {
    const format = formatOf(book, f.page);
    const columns: 1 | 2 = f.page.columns === 2 ? 2 : 1;
    const s = makeSheet(book, format, columns);
    s.sheet.id = `pg-${f.page.id}`;
    s.content.innerHTML = generateHTML(resolveFormulas(trimDoc(f.page.content)) as any, contentExtensions);
    root.append(s.sheet);
    return { f, s, format, columns };
  });
  await settle(root);

  const numberOf = new Map<string, number>();
  let n = 0;
  for (const m of made) {
    const sheets = paginate(book, m.s, m.format, m.columns);
    numberOf.set(m.f.page.id, n + 1);
    for (const sheet of sheets) {
      n += 1;
      if (book.showPageNumbers) sheet.append(el('div', 'page-number', String(n)));
    }
  }

  // 2) Sumário (com os ajustes manuais), no começo do livro e com links para as páginas.
  const entries = buildToc(book).filter((e) => !e.hidden);
  let tocSheets = 0;
  if (book.toc.includeInExport && entries.length) {
    const s = makeSheet(book, book.format, 1, ' toc-print');
    s.content.classList.add('toc-content');
    s.content.append(el('h1', 'toc-title', book.toc.title || 'Sumário'));
    for (const e of entries) {
      const a = el('a', `toc-entry lvl-${e.level}`);
      if (e.pageId) a.href = `#pg-${e.pageId}`;
      a.append(el('span', 'toc-label', e.label), el('span', 'toc-dots'), el('span', 'toc-num', e.pageId ? String(numberOf.get(e.pageId) ?? '') : ''));
      s.content.append(a);
    }
    root.prepend(s.sheet);
    await settle(root);
    tocSheets = paginate(book, s, book.format, 1, ' toc-print').length;
  }

  return { root, sheets: n + tocSheets, cleanup: () => root.remove() };
}

export async function exportPdf() {
  const ok = await saveNow();
  const book = useApp.getState().book;
  if (!book) return;
  if (!ok) toast('O livro não pôde ser salvo agora, mas a exportação usará o conteúdo atual.', 'info');
  if (!flatPages(book).length) { toast('O livro ainda não tem páginas para exportar.', 'info'); return; }
  let path: string | null = null;
  try { path = await api.chooseExportPath('pdf', book.title); } catch (e) { toast(errorText(e), 'error'); return; }
  if (!path) return;
  setBusy('Exportando PDF…');
  try {
    const built = await buildPrintRoot(book);
    try { await api.printPdf(path); } finally { built.cleanup(); }
    const target = path;
    toast(`PDF exportado com ${built.sheets} página(s).`, 'ok', { label: 'Mostrar na pasta', run: () => { void api.showInFolder(target); } });
  } catch (e) {
    toast(`Não foi possível exportar o PDF: ${errorText(e)}`, 'error');
  } finally {
    setBusy(null);
  }
}

