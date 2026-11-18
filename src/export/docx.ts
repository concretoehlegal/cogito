/*
 * Exportação para DOCX (Word).
 * Converte o conteúdo das páginas em parágrafos, títulos, listas, tabelas e imagens do Word,
 * com sumário clicável (os números de página são campos que o Word atualiza ao abrir).
 * Só entra o conteúdo das páginas: anexos de consulta e a biblioteca ficam de fora.
 */
import {
  AlignmentType, Bookmark, BorderStyle, Document, Footer, HeadingLevel, HorizontalPositionRelativeFrom, ImageRun, InternalHyperlink, LeaderType, LevelFormat, LineRuleType,
  TextWrappingSide, TextWrappingType, VerticalPositionRelativeFrom,
  PageNumber, PageReference, Packer, Paragraph, SectionType, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun,
  WidthType, type IParagraphOptions, type ISectionOptions, type ParagraphChild,
} from 'docx';
import { api, errorText } from '../api';
import { FORMATS, MM_TO_PX, PAGE_MARGIN_MM, buildToc, flatPages, formatOf, type Book, type DocNode, type PageFormat } from '../model';
import { saveNow, setBusy, toast, useApp } from '../store';
import { trimDoc } from './pdf';
import { resolveFormulas } from '../lib/formula';
import { shapePng, type ShapeAttrs } from '../editor/shapes';

const twips = (mm: number) => Math.round(mm * 56.6929);
const COLUMN_GAP_MM = 8;
const BODY_FONT = 'Literata';
const TITLE_FONT = 'Bree Serif';
const HEAD_FONT = 'Archivo Black';
const TOPIC_FONT = 'Roboto Slab';
const ACCENT = '161616';

interface Img { data: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp'; w: number; h: number }
interface Ctx {
  images: Map<string, Img>;
  shapes: Map<string, Uint8Array>;
  listInstance: number;
  /** Quebra de página e marcador pendentes, aplicados ao primeiro parágrafo da página. */
  prefix: { pageBreak: boolean; bookmark: string | null } | null;
}
interface Opt { widthPx: number; depth: number; bold?: boolean; italics?: boolean; indent?: number }

/* ───────────── imagens ───────────── */

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

async function loadImage(url: string): Promise<Img | null> {
  try {
    const bytes = await api.readImage(url);
    const ext = (decodeURIComponent(url).split('.').pop() || 'png').toLowerCase();
    const blobUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: MIME[ext] ?? 'image/png' }));
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('imagem ilegível')); img.src = blobUrl; });
      const w = img.naturalWidth || 600; const h = img.naturalHeight || 400;
      const direct = ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext === 'gif' ? 'gif' : ext === 'bmp' ? 'bmp' : null;
      if (direct) return { data: bytes, type: direct, w, h };
      // WebP e SVG não são aceitos pelo Word: converte para PNG.
      const canvas = document.createElement('canvas');
      const k = Math.min(1, 2400 / Math.max(w, h)) * (ext === 'svg' ? 2 : 1);
      canvas.width = Math.max(1, Math.round(w * k)); canvas.height = Math.max(1, Math.round(h * k));
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) return null;
      return { data: new Uint8Array(await blob.arrayBuffer()), type: 'png', w, h };
    } finally { URL.revokeObjectURL(blobUrl); }
  } catch { return null; }
}

const shapeKey = (a: ShapeAttrs) => JSON.stringify([a.kind, a.width, a.height, a.fill, a.stroke, a.strokeWidth, a.label, a.labelColor]);
function collectShapes(node: DocNode, out: Map<string, ShapeAttrs>) {
  if (node.type === 'shape' && node.attrs) out.set(shapeKey(node.attrs as ShapeAttrs), node.attrs as ShapeAttrs);
  node.content?.forEach((c) => collectShapes(c, out));
}

function collectImages(node: DocNode, out: Set<string>) {
  if (node.type === 'image' && node.attrs?.src) out.add(node.attrs.src);
  node.content?.forEach((c) => collectImages(c, out));
}

/* ───────────── texto ───────────── */

function runs(nodes: DocNode[] | undefined, o: Opt): TextRun[] {
  const out: TextRun[] = [];
  for (const n of nodes ?? []) {
    if (n.type === 'hardBreak') { out.push(new TextRun({ break: 1 })); continue; }
    if (n.type !== 'text' || !n.text) continue;
    const m = new Set((n.marks ?? []).map((x) => x.type));
    out.push(new TextRun({
      text: n.text,
      bold: o.bold || m.has('bold') || undefined,
      italics: o.italics || m.has('italic') || undefined,
      underline: m.has('underline') ? {} : undefined,
      strike: m.has('strike') || undefined,
      font: m.has('code') ? 'Consolas' : undefined,
    }));
  }
  return out;
}

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED,
};
const HEADING = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

/** Cria um parágrafo; no primeiro de cada página aplica a quebra de página e o marcador do sumário. */
function para(ctx: Ctx, o: Opt, options: IParagraphOptions & { children?: ParagraphChild[] }): Paragraph {
  let children = options.children ?? [];
  let pageBreakBefore: boolean | undefined;
  if (ctx.prefix && o.depth === 0) {
    if (ctx.prefix.bookmark) children = [new Bookmark({ id: ctx.prefix.bookmark, children: [] }), ...children];
    pageBreakBefore = ctx.prefix.pageBreak || undefined;
    ctx.prefix = null;
  }
  return new Paragraph({ ...options, children, pageBreakBefore });
}
const spacer = (ctx: Ctx, o: Opt) => para(ctx, o, { spacing: { before: 0, after: 0, line: 100, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 4 })] });

/* ───────────── blocos ───────────── */

type Block = Paragraph | Table;

function listBlocks(node: DocNode, ctx: Ctx, o: Opt, level: number, instance?: number): Block[] {
  const ordered = node.type === 'orderedList';
  const inst = ordered ? instance ?? ++ctx.listInstance : undefined;
  const out: Block[] = [];
  for (const li of node.content ?? []) {
    let first = true;
    for (const child of li.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') { out.push(...listBlocks(child, ctx, o, Math.min(level + 1, 3), child.type === 'orderedList' ? inst : undefined)); continue; }
      if (child.type === 'paragraph') {
        out.push(para(ctx, o, {
          children: runs(child.content, o), spacing: { after: 60 },
          ...(first
            ? (ordered ? { numbering: { reference: 'cogito-num', level, instance: inst } } : { bullet: { level } })
            : { indent: { left: 720 * (level + 1) } }),
        }));
        first = false;
      } else {
        out.push(...blocks([child], ctx, { ...o, depth: o.depth + 1, indent: 720 * (level + 1) }));
      }
    }
  }
  return out;
}

const cellBorder = (color: string, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

function tableBlock(node: DocNode, ctx: Ctx, o: Opt): Table {
  const rows = node.content ?? [];
  const cols = Math.max(1, ...rows.map((r) => (r.content ?? []).reduce((a, c) => a + (c.attrs?.colspan ?? 1), 0)));
  // Larguras das colunas ajustadas arrastando no editor (em px); colunas sem largura dividem o resto.
  const first = rows[0]?.content ?? [];
  const px: (number | null)[] = first.flatMap((c) => { const w = c.attrs?.colwidth as number[] | null | undefined; const span = c.attrs?.colspan ?? 1; return Array.from({ length: span }, (_, i) => (w && w[i] ? w[i] : null)); });
  const known = px.reduce<number>((a, w) => a + (w ?? 0), 0);
  const missing = px.filter((w) => !w).length;
  const total = Math.max(o.widthPx, known + missing * 60);
  const columnWidths = px.some(Boolean) ? px.map((w) => Math.round(((w ?? (total - known) / Math.max(1, missing)) / total) * o.widthPx * 15)) : undefined;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    ...(columnWidths ? { columnWidths } : {}),
    borders: { top: cellBorder(ACCENT, 8), bottom: cellBorder(ACCENT, 8), left: cellBorder('B5B5B5'), right: cellBorder('B5B5B5'), insideHorizontal: cellBorder('B5B5B5'), insideVertical: cellBorder('B5B5B5') },
    rows: rows.map((r) => new TableRow({
      tableHeader: (r.content ?? []).every((c) => c.type === 'tableHeader'),
      children: (r.content ?? []).map((c) => {
        const header = c.type === 'tableHeader';
        const span = c.attrs?.colspan ?? 1;
        const inner = blocks(c.content ?? [], ctx, { widthPx: (o.widthPx / cols) * span - 16, depth: o.depth + 1, bold: header });
        return new TableCell({
          children: inner.length && inner[inner.length - 1] instanceof Paragraph ? inner : [...inner, new Paragraph({})],
          columnSpan: span > 1 ? span : undefined,
          rowSpan: (c.attrs?.rowspan ?? 1) > 1 ? c.attrs!.rowspan : undefined,
          shading: header ? { type: ShadingType.CLEAR, fill: 'D2D2D2', color: 'auto' } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
        });
      }),
    })),
  });
}

const RPG_STYLE: Record<string, { fill: string; border: string; italics?: boolean }> = {
  ficha: { fill: 'E9E9E9', border: ACCENT },
  criatura: { fill: 'E9E9E9', border: ACCENT },
  item: { fill: 'EFEFEF', border: '4A4A4A' },
  nota: { fill: 'E4E4E4', border: '4A4A4A' },
  leitura: { fill: 'F4F4F4', border: '7A7A7A', italics: true },
};

function rpgBlock(node: DocNode, ctx: Ctx, o: Opt): Table {
  const st = RPG_STYLE[node.attrs?.kind] ?? RPG_STYLE.nota;
  const inner = blocks(node.content ?? [], ctx, { ...o, widthPx: o.widthPx - 24, depth: o.depth + 1, italics: st.italics });
  const edge = cellBorder(st.border, 12);
  const side = cellBorder(st.border, 4);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: edge, bottom: edge, left: side, right: side, insideHorizontal: side, insideVertical: side },
    rows: [new TableRow({
      children: [new TableCell({
        children: inner.length && inner[inner.length - 1] instanceof Paragraph ? inner : [...inner, new Paragraph({})],
        shading: { type: ShadingType.CLEAR, fill: st.fill, color: 'auto' },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
      })],
    })],
  });
}

function blocks(nodes: DocNode[], ctx: Ctx, o: Opt): Block[] {
  const out: Block[] = [];
  const indent = o.indent ? { left: o.indent } : undefined;
  for (const n of nodes) {
    switch (n.type) {
      case 'paragraph':
        out.push(para(ctx, o, { children: runs(n.content, o), alignment: ALIGN[n.attrs?.textAlign], indent }));
        break;
      case 'heading':
        out.push(para(ctx, o, { heading: HEADING[Math.min(3, Math.max(1, n.attrs?.level ?? 1)) - 1], children: runs(n.content, { ...o, bold: undefined }), alignment: ALIGN[n.attrs?.textAlign], indent }));
        break;
      case 'bulletList':
      case 'orderedList':
        if (ctx.prefix && o.depth === 0) out.push(spacer(ctx, o));
        out.push(...listBlocks(n, ctx, { ...o, depth: o.depth + 1 }, 0));
        break;
      case 'blockquote':
        if (ctx.prefix && o.depth === 0) out.push(spacer(ctx, o));
        out.push(...blocks(n.content ?? [], ctx, { ...o, depth: o.depth + 1, italics: true, indent: (o.indent ?? 0) + 480 }));
        break;
      case 'horizontalRule':
        out.push(para(ctx, o, { border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 1 } }, spacing: { after: 160 } }));
        break;
      case 'codeBlock': {
        const lines = (n.content ?? []).map((t) => t.text ?? '').join('').split('\n');
        out.push(para(ctx, o, { children: lines.map((l, i) => new TextRun({ text: l, font: 'Consolas', size: 19, break: i ? 1 : undefined })), indent }));
        break;
      }
      case 'image': {
        const img = ctx.images.get(n.attrs?.src);
        if (!img) { out.push(para(ctx, o, { children: [new TextRun({ text: '[imagem não encontrada]', italics: true, color: '888888' })] })); break; }
        const pct = Math.min(100, Math.max(5, parseFloat(n.attrs?.width) || 100)) / 100;
        const w = Math.max(16, Math.round(o.widthPx * pct));
        const wrap = n.attrs?.wrap;
        if (wrap === 'free') {
          // Posição livre: imagem flutuante na mesma posição da página, por cima do texto.
          const fw = String(n.attrs?.width).endsWith('px') ? Math.max(16, Math.round(parseFloat(String(n.attrs?.width)))) : w;
          out.push(para(ctx, o, { children: [freeRun(img.type, img.data, fw, Math.max(1, Math.round((fw * img.h) / img.w)), n.attrs?.x, n.attrs?.y, n.attrs?.alt || 'Imagem')] }));
          break;
        }
        if (wrap === 'left' || wrap === 'right') {
          // No Word, o texto contorna a caixa da imagem (o contorno pelo desenho do PNG existe só no PDF).
          out.push(para(ctx, o, {
            children: [new ImageRun({
              type: img.type, data: img.data, transformation: { width: w, height: Math.max(1, Math.round((w * img.h) / img.w)) },
              floating: {
                horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: wrap === 'left' ? 'left' : 'right' },
                verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
                wrap: { type: TextWrappingType.SQUARE, side: wrap === 'left' ? TextWrappingSide.RIGHT : TextWrappingSide.LEFT },
                margins: { left: wrap === 'right' ? 114300 : 0, right: wrap === 'left' ? 114300 : 0, top: 0, bottom: 57150 },
              },
              altText: { name: n.attrs?.alt || 'Imagem', description: n.attrs?.alt || '', title: n.attrs?.alt || '' },
            })],
          }));
          break;
        }
        out.push(para(ctx, o, {
          alignment: ALIGN[n.attrs?.align] ?? AlignmentType.CENTER,
          spacing: { line: 240, lineRule: LineRuleType.AUTO, after: 120 },
          children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: Math.max(1, Math.round((w * img.h) / img.w)) }, altText: { name: n.attrs?.alt || 'Imagem', description: n.attrs?.alt || '', title: n.attrs?.alt || '' } })],
        }));
        break;
      }
      case 'table':
        if (ctx.prefix && o.depth === 0) out.push(spacer(ctx, o));
        out.push(tableBlock(n, ctx, o), spacer(ctx, { ...o, depth: o.depth + 1 }));
        break;
      case 'shape': {
        const a = n.attrs as ShapeAttrs;
        const png = ctx.shapes.get(shapeKey(a));
        if (!png) break;
        if (a.wrap === 'free') { out.push(para(ctx, o, { children: [freeRun('png', png, a.width, a.height, a.x, a.y, a.label || 'Forma')] })); break; }
        const scale = Math.min(1, o.widthPx / a.width);
        const run = new ImageRun({ type: 'png', data: png, transformation: { width: Math.round(a.width * scale), height: Math.round(a.height * scale) }, altText: { name: a.label || 'Forma', description: a.label || '', title: a.label || '' } });
        out.push(para(ctx, o, { alignment: a.wrap === 'left' ? AlignmentType.LEFT : a.wrap === 'right' ? AlignmentType.RIGHT : ALIGN[a.align] ?? AlignmentType.CENTER, spacing: { line: 240, lineRule: LineRuleType.AUTO, after: 120 }, children: [run] }));
        break;
      }
      case 'rpgBlock':
        if (ctx.prefix && o.depth === 0) out.push(spacer(ctx, o));
        out.push(rpgBlock(n, ctx, o), spacer(ctx, { ...o, depth: o.depth + 1 }));
        break;
      default:
        if (n.content) out.push(...blocks(n.content, ctx, o));
    }
  }
  return out;
}

/* ───────────── documento ───────────── */

const bookmarkOf = (pageId: string) => `pg_${pageId.replace(/[^A-Za-z0-9]/g, '_')}`.slice(0, 40);

function pageSetup(format: PageFormat) {
  const f = FORMATS[format];
  const m = twips(PAGE_MARGIN_MM);
  return { size: { width: twips(f.w), height: twips(f.h) }, margin: { top: m, bottom: m, left: m, right: m } };
}

/** Imagem flutuante presa a um ponto da página (x/y em px a partir do canto da área de texto; 1 px = 9525 EMU). */
function freeRun(type: any, data: Uint8Array, w: number, h: number, x: unknown, y: unknown, name: string) {
  return new ImageRun({
    type, data, transformation: { width: w, height: h },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round(((Number(x) || 0) + PAGE_MARGIN_MM * MM_TO_PX) * 9525) },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round(((Number(y) || 0) + PAGE_MARGIN_MM * MM_TO_PX) * 9525) },
      allowOverlap: true, wrap: { type: TextWrappingType.NONE },
    },
    altText: { name, description: name, title: name },
  });
}

export async function buildDocx(book: Book): Promise<Uint8Array> {
  const flat = flatPages(book);
  const srcs = new Set<string>();
  flat.forEach((f) => collectImages(f.page.content, srcs));
  const images = new Map<string, Img>();
  for (const src of srcs) { const img = await loadImage(src); if (img) images.set(src, img); }
  const shapeAttrs = new Map<string, ShapeAttrs>();
  flat.forEach((f) => collectShapes(f.page.content, shapeAttrs));
  const shapes = new Map<string, Uint8Array>();
  for (const [k, a] of shapeAttrs) { const png = await shapePng(a); if (png) shapes.set(k, png); }

  const ctx: Ctx = { images, shapes, listInstance: 0, prefix: null };
  const entries = buildToc(book).filter((e) => !e.hidden);
  const withToc = book.toc.includeInExport && entries.length > 0;
  const targets = new Set(withToc ? entries.map((e) => e.pageId).filter(Boolean) as string[] : []);
  const sections: ISectionOptions[] = [];

  if (withToc) {
    const f = FORMATS[book.format];
    const right = twips(f.w - 2 * PAGE_MARGIN_MM);
    sections.push({
      properties: { page: pageSetup(book.format) },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(book.toc.title || 'Sumário')] }),
        ...entries.map((e) => new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: right, leader: LeaderType.DOT }],
          indent: e.level === 2 ? { left: 360 } : undefined,
          spacing: { after: e.level === 1 ? 100 : 60, before: e.level === 1 ? 80 : 0 },
          children: e.pageId
            ? [
              new InternalHyperlink({ anchor: bookmarkOf(e.pageId), children: [new TextRun({ text: e.label, bold: e.level === 1 })] }),
              new TextRun({ text: '\t' }),
              new PageReference(bookmarkOf(e.pageId), { hyperlink: true }),
            ]
            : [new TextRun({ text: e.label, bold: e.level === 1 })],
        })),
      ],
    });
  }

  // Páginas seguidas com o mesmo formato e número de colunas formam uma "seção" do Word.
  interface Group { format: PageFormat; columns: 1 | 2; children: Block[] }
  const groups: Group[] = [];
  for (const f of flat) {
    const format = formatOf(book, f.page);
    const columns: 1 | 2 = f.page.columns === 2 ? 2 : 1;
    const last = groups[groups.length - 1];
    const fresh = !last || last.format !== format || last.columns !== columns;
    if (fresh) groups.push({ format, columns, children: [] });
    const group = groups[groups.length - 1];
    const widthMm = FORMATS[format].w - 2 * PAGE_MARGIN_MM;
    const widthPx = (columns === 2 ? (widthMm - COLUMN_GAP_MM) / 2 : widthMm) * MM_TO_PX;
    ctx.prefix = { pageBreak: !fresh, bookmark: targets.has(f.page.id) ? bookmarkOf(f.page.id) : null };
    const o: Opt = { widthPx, depth: 0 };
    const made = blocks(resolveFormulas(trimDoc(f.page.content)).content ?? [], ctx, o);
    if (ctx.prefix) made.unshift(spacer(ctx, o)); // página vazia: ainda assim ocupa uma folha
    group.children.push(...made);
  }
  groups.forEach((g, i) => sections.push({
    properties: {
      type: SectionType.NEXT_PAGE,
      page: { ...pageSetup(g.format), ...(i === 0 ? { pageNumbers: { start: 1 } } : {}) },
      ...(g.columns === 2 ? { column: { count: 2, space: twips(COLUMN_GAP_MM) } } : {}),
    },
    footers: book.showPageNumbers
      ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: book.pageNumberStyle === 'numero' ? [PageNumber.CURRENT] : book.pageNumberStyle === 'extenso' ? ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES] : [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 18, color: '4A4A4A', font: 'Rajdhani' })] })] }) }
      : undefined,
    children: g.children.length ? g.children : [new Paragraph({})],
  }));

  const headingStyle = (id: string, name: string, font: string, size: number, before: number, after: number, bold: boolean) => ({
    id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
    run: { font, size, bold, color: ACCENT },
    paragraph: { spacing: { before, after }, keepNext: true },
  });

  const doc = new Document({
    title: book.title,
    creator: book.author || 'COGITO',
    description: 'Livro criado no COGITO',
    features: withToc ? { updateFields: true } : undefined,
    styles: {
      default: { document: { run: { font: BODY_FONT, size: 21 }, paragraph: { spacing: { after: 120, line: 288, lineRule: LineRuleType.AUTO } } } },
      paragraphStyles: [
        headingStyle('Heading1', 'Heading 1', TITLE_FONT, 52, 120, 220, true),
        headingStyle('Heading2', 'Heading 2', HEAD_FONT, 30, 200, 120, false),
        headingStyle('Heading3', 'Heading 3', TOPIC_FONT, 24, 160, 80, true),
      ],
    },
    numbering: {
      config: [{
        reference: 'cogito-num',
        levels: [0, 1, 2, 3].map((l) => ({
          level: l, format: LevelFormat.DECIMAL, text: `%${l + 1}.`, alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
        })),
      }],
    },
    sections: sections.length ? sections : [{ children: [new Paragraph({})] }],
  });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportDocx() {
  const ok = await saveNow();
  const book = useApp.getState().book;
  if (!book) return;
  if (!ok) toast('O livro não pôde ser salvo agora, mas a exportação usará o conteúdo atual.', 'info');
  if (!flatPages(book).length) { toast('O livro ainda não tem páginas para exportar.', 'info'); return; }
  let path: string | null = null;
  try { path = await api.chooseExportPath('docx', book.title); } catch (e) { toast(errorText(e), 'error'); return; }
  if (!path) return;
  setBusy('Exportando DOCX…');
  try {
    const bytes = await buildDocx(book);
    await api.writeExport(path, bytes);
    const target = path;
    toast('DOCX exportado.', 'ok', { label: 'Mostrar na pasta', run: () => { void api.showInFolder(target); } });
  } catch (e) {
    toast(`Não foi possível exportar o DOCX: ${errorText(e)}`, 'error');
  } finally {
    setBusy(null);
  }
}
