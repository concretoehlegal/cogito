/* Barra de formatação do editor. */
import { useEffect, useReducer, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Minus, Redo2, Strikethrough,
  MousePointer2, TextQuote, Trash2, Underline as UnderlineIcon, Undo2,
} from 'lucide-react';
import { RPG_KIND_LABEL, type RpgKind } from '../editor/extensions';
import { SHAPES } from '../editor/shapes';
import { useApp } from '../store';

/** Redesenha o componente a cada mudança do editor (seleção, formatação…). */
export function useEditorTick(editor: Editor | null) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', tick);
    editor.on('focus', tick);
    editor.on('blur', tick);
    return () => { editor.off('transaction', tick); editor.off('focus', tick); editor.off('blur', tick); };
  }, [editor]);
}

function Btn({ on, title, onClick, disabled, children }: { on?: boolean; title: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      className={`tool-btn${on ? ' on' : ''}`} title={title} aria-label={title} aria-pressed={on} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
    >{children}</button>
  );
}

function removeRpgBlock(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'rpgBlock') {
      const pos = $from.before(d);
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      return;
    }
  }
}

export function Toolbar() {
  const editor = useApp((s) => s.activeEditor);
  useEditorTick(editor);
  const ed = editor && !editor.isDestroyed ? editor : null;
  const off = !ed;
  const c = () => ed!.chain().focus();
  const is = (name: string | Record<string, any>, attrs?: Record<string, any>) => !!ed && ed.isActive(name as any, attrs);

  const blockType = !ed ? 'p' : is('heading', { level: 1 }) ? 'h1' : is('heading', { level: 2 }) ? 'h2' : is('heading', { level: 3 }) ? 'h3' : 'p';
  const setBlock = (v: string) => {
    if (!ed) return;
    if (v === 'p') c().setParagraph().run();
    else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
  };
  const inTable = is('table');
  const moveTool = useApp((st) => st.moveTool);
  const inImage = is('image');
  const inRpg = is('rpgBlock');
  const rpgKind = inRpg ? (ed!.getAttributes('rpgBlock').kind as RpgKind) : null;
  const img = inImage ? ed!.getAttributes('image') : null;
  const inShape = is('shape');
  const shape = inShape ? ed!.getAttributes('shape') : null;
  const setShape = (attrs: Record<string, unknown>) => ed!.chain().focus().updateAttributes('shape', attrs).run();
  const freeBtn = (wrap: string | undefined, name: 'image' | 'shape') => wrap === 'free'
    ? <Btn title="Em posição livre (arrastada com a ferramenta Mover). Clique para voltar ao texto." on onClick={() => c().updateAttributes(name, { wrap: 'none' }).run()}>Livre ✥</Btn>
    : <Btn title="Posição livre: ligue a ferramenta Mover (Ctrl+M) e arraste" onClick={() => useApp.setState({ moveTool: true })}>Livre</Btn>;

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatação">
      <div className="tool-group">
        <Btn title="Desfazer (Ctrl+Z)" disabled={off || !ed!.can().undo()} onClick={() => c().undo().run()}><Undo2 size={16} /></Btn>
        <Btn title="Refazer (Ctrl+Y)" disabled={off || !ed!.can().redo()} onClick={() => c().redo().run()}><Redo2 size={16} /></Btn>
        <Btn title="Mover (Ctrl+M): arraste imagens e formas para qualquer lugar da página; segure Shift para alinhar com as guias. Esc sai." on={moveTool} onClick={() => useApp.setState({ moveTool: !moveTool })}><MousePointer2 size={16} /><span className="tool-text">Mover</span></Btn>
      </div>
      <div className="tool-group">
        <select className="tool-select" title="Estilo do parágrafo" value={blockType} disabled={off || inImage} onChange={(e) => setBlock(e.target.value)}>
          <option value="p">Texto</option>
          <option value="h1">Título</option>
          <option value="h2">Subtítulo</option>
          <option value="h3">Título menor</option>
        </select>
      </div>
      <div className="tool-group">
        <Btn title="Negrito (Ctrl+B)" on={is('bold')} disabled={off} onClick={() => c().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title="Itálico (Ctrl+I)" on={is('italic')} disabled={off} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title="Sublinhado (Ctrl+U)" on={is('underline')} disabled={off} onClick={() => c().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
        <Btn title="Tachado" on={is('strike')} disabled={off} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      </div>
      <div className="tool-group">
        <Btn title="Alinhar à esquerda" on={is({ textAlign: 'left' })} disabled={off} onClick={() => c().setTextAlign('left').run()}><AlignLeft size={16} /></Btn>
        <Btn title="Centralizar" on={is({ textAlign: 'center' })} disabled={off} onClick={() => c().setTextAlign('center').run()}><AlignCenter size={16} /></Btn>
        <Btn title="Alinhar à direita" on={is({ textAlign: 'right' })} disabled={off} onClick={() => c().setTextAlign('right').run()}><AlignRight size={16} /></Btn>
        <Btn title="Justificar" on={is({ textAlign: 'justify' })} disabled={off} onClick={() => c().setTextAlign('justify').run()}><AlignJustify size={16} /></Btn>
      </div>
      <div className="tool-group">
        <Btn title="Lista com marcadores" on={is('bulletList')} disabled={off} onClick={() => c().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title="Lista numerada" on={is('orderedList')} disabled={off} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <Btn title="Citação" on={is('blockquote')} disabled={off} onClick={() => c().toggleBlockquote().run()}><TextQuote size={16} /></Btn>
        <Btn title="Linha divisória" disabled={off} onClick={() => c().setHorizontalRule().run()}><Minus size={16} /></Btn>
      </div>

      {inTable && (
        <div className="tool-group context" aria-label="Tabela">
          <span className="tool-label">Tabela</span>
          <Btn title="Inserir linha abaixo" onClick={() => c().addRowAfter().run()}>+ linha</Btn>
          <Btn title="Inserir coluna à direita" onClick={() => c().addColumnAfter().run()}>+ coluna</Btn>
          <Btn title="Excluir linha" onClick={() => c().deleteRow().run()}>− linha</Btn>
          <Btn title="Excluir coluna" onClick={() => c().deleteColumn().run()}>− coluna</Btn>
          <Btn title="Alternar linha de cabeçalho" onClick={() => c().toggleHeaderRow().run()}>cabeçalho</Btn>
          <Btn title="Mesclar ou dividir células selecionadas" onClick={() => c().mergeOrSplit().run()}>mesclar</Btn>
          <Btn title="Fórmulas: escreva numa célula, por exemplo, =SOMA(B2:B5), =B2*C2 ou =MÉDIA(C2:C4). As colunas são A, B, C… e as linhas 1, 2, 3… Arraste a borda entre colunas para ajustar a largura." onClick={() => { const { $from } = ed!.state.selection; if (!$from.parent.textContent) ed!.chain().focus().insertContent('=').run(); else ed!.chain().focus().run(); }}>= fórmula</Btn>
          <Btn title="Excluir tabela" onClick={() => c().deleteTable().run()}><Trash2 size={15} /></Btn>
        </div>
      )}
      {inImage && img && (
        <div className="tool-group context" aria-label="Imagem">
          <span className="tool-label">Imagem</span>
          {['25%', '50%', '75%', '100%'].map((w) => (
            <Btn key={w} title={`Largura ${w}`} on={img.width === w} onClick={() => c().updateAttributes('image', { width: w }).run()}>{w}</Btn>
          ))}
          <Btn title="Imagem à esquerda" on={img.align === 'left'} onClick={() => c().updateAttributes('image', { align: 'left' }).run()}><AlignLeft size={16} /></Btn>
          <Btn title="Imagem ao centro" on={img.align === 'center'} onClick={() => c().updateAttributes('image', { align: 'center' }).run()}><AlignCenter size={16} /></Btn>
          <Btn title="Imagem à direita" on={img.align === 'right'} onClick={() => c().updateAttributes('image', { align: 'right' }).run()}><AlignRight size={16} /></Btn>
          <span className="tool-sep" />
          <Btn title="Sem contorno: a imagem fica sozinha na linha" on={!img.wrap || img.wrap === 'none'} onClick={() => c().updateAttributes('image', { wrap: 'none' }).run()}>Sem contorno</Btn>
          <Btn title="Texto contorna pela direita (em PNG transparente, segue o desenho)" on={img.wrap === 'left'} onClick={() => c().updateAttributes('image', { wrap: 'left', width: img.width === '100%' ? '50%' : img.width }).run()}>Contorno ◧</Btn>
          <Btn title="Texto contorna pela esquerda (em PNG transparente, segue o desenho)" on={img.wrap === 'right'} onClick={() => c().updateAttributes('image', { wrap: 'right', width: img.width === '100%' ? '50%' : img.width }).run()}>Contorno ◨</Btn>
          {freeBtn(img.wrap, 'image')}
          <Btn title="Excluir imagem" onClick={() => c().deleteSelection().run()}><Trash2 size={15} /></Btn>
        </div>
      )}
      {inShape && shape && (
        <div className="tool-group context" aria-label="Forma">
          <span className="tool-label">Forma</span>
          <select className="tool-select" title="Tipo de forma" value={shape.kind} onChange={(e) => setShape({ kind: e.target.value })}>
            {SHAPES.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <label className="tool-color" title="Cor de preenchimento"><input type="color" value={shape.fill === 'transparent' ? '#ffffff' : shape.fill} onChange={(e) => setShape({ fill: e.target.value })} /><span>Fundo</span></label>
          <Btn title="Sem preenchimento" on={shape.fill === 'transparent'} onClick={() => setShape({ fill: shape.fill === 'transparent' ? '#d9d0bf' : 'transparent' })}>Vazado</Btn>
          <label className="tool-color" title="Cor do contorno"><input type="color" value={shape.stroke} onChange={(e) => setShape({ stroke: e.target.value })} /><span>Borda</span></label>
          <select className="tool-select narrow" title="Espessura da borda" value={shape.strokeWidth} onChange={(e) => setShape({ strokeWidth: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 6, 8].map((w) => <option key={w} value={w}>{w ? `${w} px` : 'sem borda'}</option>)}
          </select>
          <input className="tool-input" placeholder="Texto na forma" defaultValue={shape.label} key={`${shape.label}-${shape.kind}`} onBlur={(e) => { if (e.target.value !== shape.label) setShape({ label: e.target.value }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          <label className="tool-color" title="Cor do texto"><input type="color" value={shape.labelColor} onChange={(e) => setShape({ labelColor: e.target.value })} /><span>Texto</span></label>
          <Btn title="Forma à esquerda" on={shape.align === 'left' && shape.wrap === 'none'} onClick={() => setShape({ align: 'left', wrap: 'none' })}><AlignLeft size={16} /></Btn>
          <Btn title="Forma ao centro" on={shape.align === 'center' && shape.wrap === 'none'} onClick={() => setShape({ align: 'center', wrap: 'none' })}><AlignCenter size={16} /></Btn>
          <Btn title="Forma à direita" on={shape.align === 'right' && shape.wrap === 'none'} onClick={() => setShape({ align: 'right', wrap: 'none' })}><AlignRight size={16} /></Btn>
          <Btn title="Texto contorna a forma pela direita" on={shape.wrap === 'left'} onClick={() => setShape({ wrap: 'left' })}>Contorno ◧</Btn>
          <Btn title="Texto contorna a forma pela esquerda" on={shape.wrap === 'right'} onClick={() => setShape({ wrap: 'right' })}>Contorno ◨</Btn>
          {freeBtn(shape.wrap, 'shape')}
          <Btn title="Excluir forma" onClick={() => c().deleteSelection().run()}><Trash2 size={15} /></Btn>
        </div>
      )}
      {inRpg && rpgKind && !inImage && (
        <div className="tool-group context" aria-label="Bloco">
          <span className="tool-label">{RPG_KIND_LABEL[rpgKind] ?? 'Bloco'}</span>
          <Btn title="Excluir este bloco inteiro" onClick={() => removeRpgBlock(ed!)}><Trash2 size={15} /></Btn>
        </div>
      )}
    </div>
  );
}
