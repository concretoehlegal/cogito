/* Modelo de dados do livro e funções puras sobre ele. */

export type PageFormat = 'A4' | 'A3';
export type PageStyle = 'cinza' | 'branco' | 'pergaminho';

/** Nó de conteúdo do editor (formato JSON do TipTap/ProseMirror). */
export interface DocNode {
  type: string;
  attrs?: Record<string, any>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
}

export interface Page {
  id: string;
  content: DocNode;
  /** Formato próprio da página; ausente = usa o formato do livro. */
  format?: PageFormat;
  columns?: 1 | 2;
}
export interface Section { id: string; title: string; pages: Page[] }
export interface Chapter { id: string; title: string; pages: Page[]; sections: Section[] }

export interface TocOverride { label?: string; hidden?: boolean }
export interface TocCustom { id: string; label: string; pageId: string | null; level: 1 | 2 }
export interface Toc {
  title: string;
  includeInExport: boolean;
  /** Ajustes manuais sobre itens automáticos, guardados pelo id do capítulo/seção. */
  overrides: Record<string, TocOverride>;
  /** Itens criados manualmente. */
  custom: TocCustom[];
}

export interface Book {
  version: 1;
  id: string;
  title: string;
  author: string;
  format: PageFormat;
  pageStyle: PageStyle;
  showPageNumbers: boolean;
  /** Formato do contador de páginas no centro inferior: "3", "3 / 12" ou "Página 3 de 12". */
  pageNumberStyle?: PageNumberStyle;
  createdAt: number;
  updatedAt: number;
  chapters: Chapter[];
  toc: Toc;
}

export interface BookMeta {
  id: string; title: string; author: string; format: PageFormat;
  createdAt: number; updatedAt: number; pageCount: number; chapterCount: number;
}

/* Dimensões em milímetros. */
export type PageNumberStyle = 'numero' | 'contador' | 'extenso';
/** Texto do contador de páginas. */
export const pageLabel = (style: PageNumberStyle | undefined, n: number, total: number) =>
  style === 'numero' ? String(n) : style === 'extenso' ? `Página ${n} de ${total}` : `${n} / ${total}`;

export const FORMATS: Record<PageFormat, { w: number; h: number; label: string }> = {
  A4: { w: 210, h: 297, label: 'A4 (210 × 297 mm)' },
  A3: { w: 297, h: 420, label: 'A3 (297 × 420 mm)' },
};
export const PAGE_MARGIN_MM = 18;
export const MM_TO_PX = 96 / 25.4;

export function uid(prefix: string): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return `${prefix}-${Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export const emptyDoc = (): DocNode => ({ type: 'doc', content: [{ type: 'paragraph' }] });
export const headingDoc = (level: 1 | 2, text: string): DocNode => ({
  type: 'doc',
  content: [{ type: 'heading', attrs: { level }, content: text ? [{ type: 'text', text }] : undefined }, { type: 'paragraph' }],
});

export const newPage = (content: DocNode = emptyDoc(), extra: Partial<Page> = {}): Page => ({ id: uid('pag'), content, ...extra });
export const newSection = (title: string): Section => ({ id: uid('sec'), title, pages: [newPage(headingDoc(2, title))] });
export const newChapter = (title: string): Chapter => ({ id: uid('cap'), title, pages: [newPage(headingDoc(1, title))], sections: [] });

export function newBook(title: string, format: PageFormat): Book {
  return {
    version: 1, id: 'novo', title, author: '', format, pageStyle: 'cinza', showPageNumbers: true,
    createdAt: 0, updatedAt: 0,
    chapters: [newChapter('Capítulo 1')],
    toc: { title: 'Sumário', includeInExport: true, overrides: {}, custom: [] },
  };
}

/** Garante que um livro lido do disco tenha todos os campos esperados. */
export function normalizeBook(b: any): Book {
  const pages = (list: any): Page[] => (Array.isArray(list) ? list : []).map((p: any) => ({
    id: typeof p?.id === 'string' ? p.id : uid('pag'),
    content: p?.content?.type === 'doc' ? p.content : emptyDoc(),
    ...(p?.format === 'A4' || p?.format === 'A3' ? { format: p.format } : {}),
    ...(p?.columns === 2 ? { columns: 2 as const } : {}),
  }));
  return {
    version: 1,
    id: b.id,
    title: typeof b.title === 'string' ? b.title : 'Sem título',
    author: typeof b.author === 'string' ? b.author : '',
    format: b.format === 'A3' ? 'A3' : 'A4',
    pageStyle: b.pageStyle === 'branco' || b.pageStyle === 'cinza' ? b.pageStyle : b.pageStyle === 'pergaminho' ? 'pergaminho' : 'cinza',
    showPageNumbers: b.showPageNumbers !== false,
    pageNumberStyle: b.pageNumberStyle === 'numero' || b.pageNumberStyle === 'extenso' ? b.pageNumberStyle : 'contador',
    createdAt: b.createdAt || Date.now(),
    updatedAt: b.updatedAt || Date.now(),
    chapters: (Array.isArray(b.chapters) ? b.chapters : []).map((c: any) => ({
      id: typeof c?.id === 'string' ? c.id : uid('cap'),
      title: typeof c?.title === 'string' ? c.title : 'Capítulo',
      pages: pages(c?.pages),
      sections: (Array.isArray(c?.sections) ? c.sections : []).map((s: any) => ({
        id: typeof s?.id === 'string' ? s.id : uid('sec'),
        title: typeof s?.title === 'string' ? s.title : 'Seção',
        pages: pages(s?.pages),
      })),
    })),
    toc: {
      title: typeof b.toc?.title === 'string' ? b.toc.title : 'Sumário',
      includeInExport: b.toc?.includeInExport !== false,
      overrides: b.toc?.overrides && typeof b.toc.overrides === 'object' ? b.toc.overrides : {},
      custom: Array.isArray(b.toc?.custom) ? b.toc.custom : [],
    },
  };
}

/* ───────────── navegação pela estrutura ───────────── */

export interface FlatPage { page: Page; chapter: Chapter; section: Section | null; index: number }

export function flatPages(book: Book): FlatPage[] {
  const out: FlatPage[] = [];
  for (const chapter of book.chapters) {
    for (const page of chapter.pages) out.push({ page, chapter, section: null, index: out.length });
    for (const section of chapter.sections) for (const page of section.pages) out.push({ page, chapter, section, index: out.length });
  }
  return out;
}

export const formatOf = (book: Book, page: Page): PageFormat => page.format ?? book.format;

export function firstPageOfChapter(c: Chapter): Page | null {
  if (c.pages[0]) return c.pages[0];
  for (const s of c.sections) if (s.pages[0]) return s.pages[0];
  return null;
}

/** Texto plano de um nó (usado para rótulos na árvore). */
export function nodeText(node: DocNode | undefined, max = 200): string {
  let out = '';
  const walk = (n: DocNode) => {
    if (out.length >= max) return;
    if (n.text) out += n.text;
    n.content?.forEach(walk);
    if (n.type !== 'text' && n.content && !out.endsWith(' ')) out += ' ';
  };
  if (node) walk(node);
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}
export function pageSnippet(page: Page): string {
  for (const n of page.content.content ?? []) {
    const t = nodeText(n, 60);
    if (t) return t;
    if (n.type === 'image') return 'Imagem';
  }
  return '';
}

/* ───────────── sumário ───────────── */

export interface TocEntry {
  id: string;
  kind: 'chapter' | 'section' | 'custom';
  level: 1 | 2;
  /** Texto gerado automaticamente a partir da estrutura. */
  autoLabel: string;
  /** Texto exibido (manual, se houver). */
  label: string;
  hidden: boolean;
  /** Verdadeiro quando o usuário alterou este item manualmente. */
  edited: boolean;
  pageId: string | null;
  /** Posição da página de destino no livro (0 = primeira), ou -1 se não houver. */
  pageIndex: number;
}

/**
 * Monta o sumário: itens automáticos (capítulos e seções) + ajustes manuais.
 * Os ajustes ficam guardados por id, então sobrevivem a renomeações e reordenações.
 */
export function buildToc(book: Book): TocEntry[] {
  const flat = flatPages(book);
  const indexOf = new Map(flat.map((f) => [f.page.id, f.index]));
  const auto: TocEntry[] = [];
  const add = (id: string, kind: 'chapter' | 'section', level: 1 | 2, title: string, page: Page | null) => {
    const ov = book.toc.overrides[id] ?? {};
    const hasLabel = typeof ov.label === 'string' && ov.label !== title;
    auto.push({
      id, kind, level, autoLabel: title, label: hasLabel ? ov.label! : title,
      hidden: !!ov.hidden, edited: hasLabel || !!ov.hidden,
      pageId: page?.id ?? null, pageIndex: page ? indexOf.get(page.id) ?? -1 : -1,
    });
  };
  for (const c of book.chapters) {
    add(c.id, 'chapter', 1, c.title, firstPageOfChapter(c));
    for (const s of c.sections) add(s.id, 'section', 2, s.title, s.pages[0] ?? null);
  }
  const customs: TocEntry[] = book.toc.custom.map((c) => ({
    id: c.id, kind: 'custom', level: c.level === 1 ? 1 : 2, autoLabel: c.label, label: c.label, hidden: false, edited: true,
    pageId: c.pageId && indexOf.has(c.pageId) ? c.pageId : null,
    pageIndex: c.pageId ? indexOf.get(c.pageId) ?? -1 : -1,
  }));

  // Itens manuais entram logo depois do último item automático que aponta para a mesma página ou anterior.
  const out = [...auto];
  for (const c of customs.filter((x) => x.pageIndex >= 0).sort((a, b) => a.pageIndex - b.pageIndex)) {
    let pos = 0;
    out.forEach((e, i) => { if (e.pageIndex >= 0 && e.pageIndex <= c.pageIndex) pos = i + 1; });
    out.splice(pos, 0, c);
  }
  out.push(...customs.filter((x) => x.pageIndex < 0));
  return out;
}

/* ───────────── localização de itens ───────────── */

export function findPageContainer(book: Book, pageId: string): { list: Page[]; index: number; chapter: Chapter; section: Section | null } | null {
  for (const chapter of book.chapters) {
    let index = chapter.pages.findIndex((p) => p.id === pageId);
    if (index >= 0) return { list: chapter.pages, index, chapter, section: null };
    for (const section of chapter.sections) {
      index = section.pages.findIndex((p) => p.id === pageId);
      if (index >= 0) return { list: section.pages, index, chapter, section };
    }
  }
  return null;
}
export function findSection(book: Book, sectionId: string): { chapter: Chapter; index: number; section: Section } | null {
  for (const chapter of book.chapters) {
    const index = chapter.sections.findIndex((s) => s.id === sectionId);
    if (index >= 0) return { chapter, index, section: chapter.sections[index] };
  }
  return null;
}
export function pagesOf(book: Book, containerId: string): Page[] | null {
  for (const c of book.chapters) {
    if (c.id === containerId) return c.pages;
    for (const s of c.sections) if (s.id === containerId) return s.pages;
  }
  return null;
}
