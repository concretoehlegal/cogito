/* Extensões do editor: texto, títulos, tabelas, imagens e blocos de RPG. */
import { Node, mergeAttributes, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { formulaResult, isFormula, tableGrid } from '../lib/formula';
import { labelSize, labelY, shapeParts, wrapStyle, type ShapeAttrs } from './shapes';
import { ShapeView } from './ShapeView';

export type RpgKind = 'ficha' | 'criatura' | 'nota' | 'leitura' | 'item';
export const RPG_KIND_LABEL: Record<RpgKind, string> = {
  ficha: 'Ficha de personagem', criatura: 'Bloco de criatura', nota: 'Nota do mestre', leitura: 'Texto para leitura', item: 'Item ou magia',
};

/** Caixa destacada que agrupa outros blocos (ficha, criatura, nota, leitura em voz alta, item). */
export const RpgBlock = Node.create({
  name: 'rpgBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      kind: {
        default: 'nota',
        parseHTML: (el) => el.getAttribute('data-kind') || 'nota',
        renderHTML: (attrs) => ({ 'data-kind': attrs.kind }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-rpg-block]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-rpg-block': '', class: 'rpg-block' }), 0];
  },
});

/** Imagem do livro, com largura e alinhamento ajustáveis. */
export const BookImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (el) => el.getAttribute('data-width') || '100%',
        renderHTML: (attrs) => ({ 'data-width': attrs.width, style: `width:${attrs.width}` }),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
      /** Texto contornando a imagem: em PNG com fundo transparente, segue o desenho; nas outras, a caixa. */
      wrap: {
        default: 'none',
        parseHTML: (el) => el.getAttribute('data-wrap') || 'none',
        // Caminho relativo (sem ":"), porque o editor separa o estilo por ":" e cortaria "cogito://…".
        renderHTML: (attrs) => (attrs.wrap === 'free' ? { 'data-wrap': 'free' } : attrs.wrap && attrs.wrap !== 'none'
          ? { 'data-wrap': attrs.wrap, style: `shape-outside:url("${String(attrs.src).replace(/^cogito:\/\/app/, '').replace(/"/g, '%22')}")` }
          : {}),
      },
      /** Posição livre (wrap = "free"): canto de cima à esquerda, em px, a partir do canto da área de texto. */
      x: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-x')) || 0,
        renderHTML: (attrs) => (attrs.wrap === 'free' ? { 'data-x': String(attrs.x), style: `left:${attrs.x}px;top:${attrs.y}px` } : {}),
      },
      y: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-y')) || 0,
        renderHTML: (attrs) => (attrs.wrap === 'free' ? { 'data-y': String(attrs.y) } : {}),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });

const SVG = 'http://www.w3.org/2000/svg';

/** Forma desenhada (retângulo, elipse, faixa, estrela…), redimensionável e com texto opcional. */
export const Shape = Node.create({
  name: 'shape',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    const a = (name: string, def: unknown, num = false) => ({
      default: def,
      parseHTML: (el: HTMLElement) => { const v = el.getAttribute(`data-${name}`); return v === null ? def : num ? Number(v) : v; },
      renderHTML: (attrs: Record<string, unknown>) => ({ [`data-${name}`]: String(attrs[name]) }),
    });
    return {
      kind: a('kind', 'rect'), width: a('width', 220, true), height: a('height', 120, true),
      fill: a('fill', '#d9d0bf'), stroke: a('stroke', '#161616'), strokeWidth: a('stroke-width', 2, true),
      label: a('label', ''), labelColor: a('label-color', '#161616'), align: a('align', 'center'), wrap: a('wrap', 'none'),
      x: a('x', 0, true), y: a('y', 0, true),
    };
  },
  parseHTML() { return [{ tag: 'div[data-shape]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    const s = node.attrs as ShapeAttrs;
    const parts = shapeParts(s.kind, s.width, s.height, s.strokeWidth).flatMap((p) => {
      const base: [string, Record<string, string>] = [`${SVG} path`, { d: p.d, fill: p.fill ? s.fill : 'none', stroke: p.stroke && s.strokeWidth > 0 ? s.stroke : 'none', 'stroke-width': String(s.strokeWidth), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }];
      return p.shade && p.fill ? [base, [`${SVG} path`, { d: p.d, fill: 'rgba(0,0,0,.25)' }] as [string, Record<string, string>]] : [base];
    });
    const label = s.label ? [[`${SVG} text`, { x: String(s.width / 2), y: String(labelY(s)), 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: s.labelColor, style: `font: 700 ${labelSize(s)}px "Cogito Chapter Bold", "Cogito Chapter", Georgia, serif` }, s.label]] : [];
    return ['div', mergeAttributes(HTMLAttributes, { 'data-shape': '', class: 'shape-node', style: `width:${s.width}px;height:${s.height}px;${wrapStyle(s)}${s.wrap === 'free' ? `left:${s.x}px;top:${s.y}px;` : ''}` }),
      [`${SVG} svg`, { width: String(s.width), height: String(s.height), viewBox: `0 0 ${s.width} ${s.height}`, style: 'display:block;overflow:visible' }, ...parts, ...label]];
  },
  addNodeView() { return ReactNodeViewRenderer(ShapeView); },
});

/** Mostra o resultado das fórmulas (células que começam com "=") e a fórmula ao editar a célula. */
export const TableFormulas = Extension.create({
  name: 'tableFormulas',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('tableFormulas'),
      props: {
        decorations: (state) => {
          const decos: Decoration[] = [];
          const { from, to } = state.selection;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'table') return true;
            const grid = tableGrid(node.toJSON());
            node.forEach((row, rowOffset) => {
              row.forEach((cell, cellOffset) => {
                const text = cell.textContent.trim();
                if (!isFormula(text)) return;
                const start = pos + 1 + rowOffset + 1 + cellOffset;
                const end = start + cell.nodeSize;
                const editing = from >= start && to <= end;
                decos.push(Decoration.node(start, end, { class: `formula-cell${editing ? ' editing' : ''}`, 'data-result': formulaResult(text, grid), title: text }));
              });
            });
            return false;
          });
          return DecorationSet.create(state.doc, decos);
        },
      },
    })];
  },
});

/** Extensões que definem o formato do documento (usadas no editor e na exportação). */
export const contentExtensions: Extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, dropcursor: { color: '#161616', width: 2 } }),
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true, cellMinWidth: 40, HTMLAttributes: { class: 'book-table' } }),
  TableRow,
  TableHeader,
  TableCell,
  BookImage,
  RpgBlock,
  Shape,
];

/**
 * Ctrl+Home / Ctrl+End levam o cursor ao começo / fim do texto mesmo com uma forma ou imagem selecionada
 * (o navegador, sozinho, às vezes deixa a seleção presa no objeto e a próxima tecla apagaria o objeto).
 */
const DocEdges = Extension.create({
  name: 'docEdges',
  addKeyboardShortcuts() {
    const go = (end: boolean) => () => {
      const { state, view } = this.editor;
      view.dispatch(state.tr.setSelection(end ? Selection.atEnd(state.doc) : Selection.atStart(state.doc)).scrollIntoView());
      return true;
    };
    return { 'Mod-End': go(true), 'Mod-Home': go(false) };
  },
});

export const editorExtensions: Extensions = [
  ...contentExtensions,
  TableFormulas,
  DocEdges,
  Placeholder.configure({
    placeholder: ({ node }) => (node.type.name === 'heading' ? 'Título' : 'Escreva aqui…'),
    showOnlyCurrent: true,
  }),
];
