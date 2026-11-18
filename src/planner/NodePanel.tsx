/* Painel à direita do quadro: edita a ficha, a ligação ou a campanha selecionada. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeftRight, Copy, Crosshair, IdCard, ImagePlus, Plus, Settings2, Trash2, X } from 'lucide-react';
import { api, errorText } from '../api';
import { toast } from '../store';
import { CardEditor, CardTile, blankCard } from '../game/Cards';
import { GameIcon, IconButton } from '../game/icons';
import type { Card, CombatAction, LinkCap, LinkDash, LinkKind, LinkSide, NodeType, PlanLink, PlanNode, Sheet } from '../game/types';
import { DEFAULT_SYSTEM, ROLES, kindLabel, listOf, listsFor, statsFor, valOf, type ListDef, type ListValue } from '../game/system';
import { statIcon } from './statIcons';
import { openSystemEditor } from './SystemEditor';
import { PRESETS, capPath, dashArray, rememberLinkStyle, styleOf, type LinkStyle } from './links';
import { startHunt } from './Ficha';
import { canvas } from './Canvas';
import { ORDER, fitCard, fitCardRoom, TYPES, backlinks, defaultSheet, findByTitle, isChar, isText, linksIn, newNode, norm, uid } from './model';
import { PLAN_COLORS } from './PlanList';
import { edit, planFileUrl, select, usePlan } from './state';

/** Campo de texto que grava a cada letra, agrupando a digitação num só passo do desfazer. */
function Text({ value, onChange, k, placeholder, multiline, rows, inputRef, onKeyDown, onSelect }: {
  value: string; onChange: (v: string, caret: number) => void; k: string; placeholder?: string; multiline?: boolean; rows?: number;
  inputRef?: React.Ref<HTMLInputElement & HTMLTextAreaElement>; onKeyDown?: (e: React.KeyboardEvent) => void; onSelect?: (e: React.SyntheticEvent) => void;
}) {
  void k;
  return multiline
    ? <textarea ref={inputRef} value={value} rows={rows ?? 8} placeholder={placeholder} onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? e.target.value.length)} onKeyDown={onKeyDown} onSelect={onSelect} className="pn-scroll" />
    : <input ref={inputRef} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? e.target.value.length)} onKeyDown={onKeyDown} />;
}
const num = (v: string, d = 0) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? Math.round(n) : d; };

/** Uma lista do sistema (Atributos, Perícias…) na ficha: cada item com ícone, nome e valor próprios. */
function ListEditor({ l, items, up }: { l: ListDef; items: ListValue[]; up: (fn: (list: ListValue[]) => void, key?: string) => void }) {
  return (
    <>
      <h4 className="pp-listhead"><GameIcon id={l.icon} size={14} /> {l.name}</h4>
      <div className="attrs">
        {items.map((a, i) => (
          <div key={i} className="attr-row with-icon">
            <IconButton value={a.icon || statIcon(a.k, 'estrela')} onChange={(icon) => up((xs) => { xs[i].icon = icon; })} title="Ícone do item" />
            <input value={a.k} placeholder="Nome" aria-label={`Nome (${l.name})`} onChange={(e) => up((xs) => { xs[i].k = e.target.value.slice(0, 40); }, `k${i}`)} />
            <input value={a.v} placeholder="Valor" aria-label={`Valor de ${a.k || 'item'}`} onChange={(e) => up((xs) => { xs[i].v = e.target.value.slice(0, 24); }, `v${i}`)} />
            <button className="icon-btn" title="Remover" onClick={() => up((xs) => { xs.splice(i, 1); })}><X size={14} /></button>
          </div>
        ))}
        {items.length < 40 && <button className="btn small" onClick={() => up((xs) => { xs.push({ k: '', v: '' }); })}><Plus size={13} /> {l.name.replace(/s$/i, '') || 'Item'}</button>}
      </div>
    </>
  );
}

function SheetEditor({ n }: { n: PlanNode }) {
  const plan = usePlan((s) => s.plan)!;
  const sys = plan.system ?? DEFAULT_SYSTEM();
  const s = n.sheet ?? defaultSheet(n.type, sys);
  const [card, setCard] = useState<Card | null>(null);
  const up = (fn: (sh: Sheet) => void, key?: string) => edit((d) => { const m = d.nodes.find((x) => x.id === n.id); if (!m) return; if (!m.sheet) m.sheet = defaultSheet(m.type, d.system ?? sys); fn(m.sheet); }, key ? { key: `${n.id}:${key}` } : {});
  const enemy = n.type === 'inimigo';
  const maxActions = enemy ? (s.boss ? 4 : 2) : 8;
  const images = plan.nodes.flatMap((m) => (m.image ? [{ file: m.image, name: m.title || TYPES[m.type].label }] : []));
  const setAction = (i: number, p: Partial<CombatAction>, key: string) => up((sh) => { Object.assign(sh.actions[i], p); }, `a${i}${key}`);
  const fields = statsFor(sys, n.type);
  const texts = fields.filter((f) => f.kind === 'texto');
  const nums = fields.filter((f) => f.kind !== 'texto');
  const setVal = (id: string, v: string) => up((sh) => { (sh.vals ??= {})[id] = v; }, `v:${id}`);
  const percent = sys.combat.hit === 'percentual';
  return (
    <>
      <div className="pp-sys">
        <GameIcon id={sys.icon} size={15} />
        <span>Sistema: <b>{sys.name}</b></span>
        <button className="btn small" onClick={openSystemEditor} title="Mudar campos, listas, nomes, ícones e regras de combate da campanha"><Settings2 size={13} /> Editar sistema</button>
      </div>
      <h4>Ficha de jogo</h4>
      {texts.length > 0 && (
        <div className="pp-ident">
          {texts.map((f) => (
            <label key={f.id} className="field"><span><GameIcon id={f.icon} size={13} /> {f.name}</span>
              <input value={valOf(s, f, n.type)} maxLength={120} onChange={(e) => setVal(f.id, e.target.value)} />
            </label>
          ))}
        </div>
      )}
      {nums.length > 0 && (
        <div className="pp-nums">
          {nums.map((f) => (
            <label key={f.id} className="field" title={ROLES.find((r) => r.id === f.role)?.hint}>
              <span><GameIcon id={f.icon} size={13} /> {f.name}</span>
              <input value={valOf(s, f, n.type)} maxLength={24} inputMode={f.kind === 'barra' ? 'numeric' : undefined} onChange={(e) => setVal(f.id, e.target.value)} />
            </label>
          ))}
        </div>
      )}
      {enemy && <label className="check"><input type="checkbox" checked={s.boss} onChange={(e) => { const on = e.target.checked; edit((d) => { const m = d.nodes.find((x) => x.id === n.id); if (!m) return; if (!m.sheet) m.sheet = defaultSheet(m.type, d.system ?? sys); m.sheet.boss = on; if (!on) m.sheet.actions = m.sheet.actions.slice(0, 2); fitCardRoom(d.nodes, m); }); }} /> {sys.labels.chefe} (carta larga, com arte maior, e até 4 {sys.labels.habilidades.toLowerCase()})</label>}

      {listsFor(sys, n.type).map((l) => (
        <ListEditor key={l.id} l={l} items={listOf(s, l)} up={(fn, key) => up((sh) => { const lists = (sh.lists ??= {}); if (!lists[l.id]) lists[l.id] = listOf(sh, l).map((x) => ({ ...x })); fn(lists[l.id]); }, key ? `l:${l.id}:${key}` : undefined)} />
      ))}

      <h4>{enemy ? `${sys.labels.habilidades} (${s.actions.length}/${maxActions})` : sys.labels.ataques}</h4>
      <div className="combat">
        <span className="combat-head"><span>{enemy ? sys.labels.habilidades : sys.labels.ataques}</span><span>{sys.labels.acerto}</span><span>{sys.labels.dano}</span><span /></span>
        {s.actions.map((a, i) => (
          <div key={i} className="combat-row">
            <input value={a.name} placeholder="Nome" onChange={(e) => setAction(i, { name: e.target.value }, 'n')} />
            <input value={a.hit} placeholder={percent ? '50' : sys.combat.defaultHit || '1d20+3'} onChange={(e) => setAction(i, { hit: e.target.value.replace(/\s+/g, '') }, 'h')} />
            <input value={a.dmg} placeholder="1d8+2" onChange={(e) => setAction(i, { dmg: e.target.value.replace(/\s+/g, '') }, 'd')} />
            <button className="icon-btn" title="Remover" disabled={s.actions.length <= 1} onClick={() => up((sh) => { sh.actions.splice(i, 1); })}><X size={14} /></button>
          </div>
        ))}
        <button className="btn small" disabled={s.actions.length >= maxActions} onClick={() => up((sh) => { sh.actions.push({ name: enemy ? 'Nova habilidade' : 'Novo ataque', hit: sys.combat.defaultHit, dmg: '1d6' }); })}><Plus size={13} /> {enemy ? sys.labels.habilidades.replace(/s$/i, '') : sys.labels.ataques.replace(/s$/i, '')}</button>
        {percent && <small className="muted">Neste sistema o acerto é uma porcentagem: escreva a chance (ex.: 55 para Lutar 55%).</small>}
      </div>

      {!enemy && (
        <>
          <h4>Cartas ({s.cards.length})</h4>
          <div className="card-grid">
            {s.cards.map((c) => <CardTile key={c.id} card={c} size={64} fileUrl={(f) => planFileUrl(plan.id, f)} onClick={() => setCard(c)} />)}
            <button className="card-add" onClick={() => setCard(blankCard('item'))}><Plus size={18} /><span>Carta</span></button>
          </div>
        </>
      )}
      {card && (
        <CardEditor
          card={card} images={images} fileUrl={(f) => planFileUrl(plan.id, f)} onClose={() => setCard(null)}
          onDelete={card.id ? () => { up((sh) => { sh.cards = sh.cards.filter((x) => x.id !== card.id); }); setCard(null); } : undefined}
          onSave={(c) => { up((sh) => { if (card.id) { const i = sh.cards.findIndex((x) => x.id === card.id); if (i >= 0) sh.cards[i] = { ...c, id: card.id }; } else sh.cards.push({ ...c, id: uid('carta') }); }); setCard(null); }}
        />
      )}
    </>
  );
}

/** Texto e Caixa de texto: o conteúdo se escreve no quadro; aqui ficam tamanho, alinhamento, estilo e cor. */
function TextEditor({ n }: { n: PlanNode }) {
  const up = (fn: (m: PlanNode) => void, key?: string) => edit((d) => { const m = d.nodes.find((x) => x.id === n.id); if (m) fn(m); }, key ? { key: `${n.id}:${key}` } : {});
  const f = n.font ?? {};
  const setFont = (p: Partial<NonNullable<PlanNode['font']>>, key?: string) => up((m) => { m.font = { ...(m.font ?? {}), ...p }; }, key);
  const size = f.size ?? (n.type === 'texto' ? 26 : 16);
  const remove = () => { edit((d) => { d.nodes = d.nodes.filter((x) => x.id !== n.id); d.links = d.links.filter((l) => l.from !== n.id && l.to !== n.id); }); select([]); };
  const colors = n.type === 'texto' ? ['#f2f2f2', '#a3a3a3', '#b8ff2c', '#FF2E88', '#00C2CB', '#F4B400', '#d77a6e'] : ['#737373', '#d4d4d4', '#b8ff2c', '#FF2E88', '#00C2CB', '#F4B400', '#7aa7d6'];
  return (
    <div className="pp-body">
      <div className="pp-head"><span className="pp-type" style={{ '--nc': n.color } as CSSProperties}><GameIcon id={TYPES[n.type].icon} size={14} /> {TYPES[n.type].label}</span></div>
      <label className="field"><span>Texto <small className="muted">— ou dois cliques no quadro para escrever lá</small></span>
        <textarea rows={5} value={n.body} onChange={(e) => up((m) => { m.body = e.target.value.slice(0, 5000); }, 'body')} />
      </label>
      <label className="field"><span>Tamanho — {size}</span><input type="range" min={10} max={n.type === 'texto' ? 96 : 40} value={size} onChange={(e) => setFont({ size: Number(e.target.value) }, 'size')} /></label>
      <div className="field"><span>Alinhamento e estilo</span>
        <div className="seg tx-seg">
          {(['left', 'center', 'right'] as const).map((al) => <button key={al} type="button" className={(f.align ?? 'left') === al ? 'on' : ''} onClick={() => setFont({ align: al })}>{al === 'left' ? 'Esquerda' : al === 'center' ? 'Centro' : 'Direita'}</button>)}
          <button type="button" className={f.bold ? 'on' : ''} onClick={() => setFont({ bold: !f.bold })}><b>N</b></button>
          <button type="button" className={f.italic ? 'on' : ''} onClick={() => setFont({ italic: !f.italic })}><i>I</i></button>
        </div>
      </div>
      <div className="field"><span>{n.type === 'texto' ? 'Cor do texto' : 'Cor da borda'}</span>
        <div className="color-line">
          {colors.map((c) => <button key={c} type="button" className={`color-dot${n.color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => up((m) => { m.color = c; })} aria-label={`Cor ${c}`} />)}
          <input type="color" value={n.color} onChange={(e) => up((m) => { m.color = e.target.value; }, 'color')} aria-label="Outra cor" />
        </div>
      </div>
      <div className="pp-actions">
        <button className="btn small" onClick={() => window.dispatchEvent(new CustomEvent('plan:edit-text', { detail: n.id }))}>Escrever no quadro</button>
        <button className="btn small danger-ghost" onClick={remove}><Trash2 size={13} /> Excluir</button>
      </div>
    </div>
  );
}

function NodeEditor({ n }: { n: PlanNode }) {
  const plan = usePlan((s) => s.plan)!;
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const up = (fn: (m: PlanNode) => void, key?: string) => edit((d) => { const m = d.nodes.find((x) => x.id === n.id); if (m) fn(m); }, key ? { key: `${n.id}:${key}` } : {});
  useEffect(() => {
    const on = () => { titleRef.current?.focus(); titleRef.current?.select(); };
    window.addEventListener('plan:edit-title', on);
    return () => window.removeEventListener('plan:edit-title', on);
  }, []);
  const def = TYPES[n.type];
  const links = plan.links.filter((l) => l.from === n.id || l.to === n.id);
  const cites = useMemo(() => [...new Set(linksIn(n.body))], [n.body]);
  const back = useMemo(() => backlinks(plan.nodes, n), [plan.nodes, n]);
  // Sugestões ao digitar "[[": títulos que começam com o que já foi escrito.
  const open = n.body.lastIndexOf('[[', caret);
  const query = open >= 0 && !n.body.slice(open, caret).includes(']]') && !n.body.slice(open, caret).includes('\n') ? n.body.slice(open + 2, caret) : null;
  const sugg = query !== null ? plan.nodes.filter((m) => m.id !== n.id && m.title && norm(m.title).includes(norm(query))).slice(0, 6) : [];
  const insertLink = (title: string) => {
    const before = n.body.slice(0, open); const after = n.body.slice(caret).replace(/^[^\]\n]*\]\]/, '');
    const body = `${before}[[${title}]]${after}`;
    up((m) => { m.body = body; });
    const pos = before.length + title.length + 4;
    requestAnimationFrame(() => { bodyRef.current?.focus(); bodyRef.current?.setSelectionRange(pos, pos); setCaret(pos); });
  };
  const changeType = (t: NodeType) => up((m) => {
    m.type = t;
    if (m.color === TYPES[n.type].color) m.color = TYPES[t].color;
    if (m.icon === TYPES[n.type].icon) m.icon = TYPES[t].icon;
    if (isChar(t)) { if (!m.sheet) m.sheet = defaultSheet(t, plan.system); fitCard(m); }
  });
  const pickImage = async () => {
    try { const [img] = await api.planPickImages(plan.id); if (img) up((m) => { m.image = img.file; if (!m.title && m.type === 'imagem') m.title = ''; }); } catch (e) { toast(errorText(e), 'error'); }
  };
  const hunt = () => startHunt(plan.id, n);
  const remove = () => { edit((d) => { d.nodes = d.nodes.filter((x) => x.id !== n.id); d.links = d.links.filter((l) => l.from !== n.id && l.to !== n.id); }); select([]); };
  const duplicate = () => { const c = { ...JSON.parse(JSON.stringify(n)) as PlanNode, id: uid('n'), x: n.x + 30, y: n.y + 30 }; edit((d) => { d.nodes.push(c); }); select([c.id]); };
  const createCited = (title: string) => { const c = canvas.centerWorld(); const m = newNode('nota', c.x + 40, c.y + 40, { title }); edit((d) => { d.nodes.push(m); }); select([m.id]); };

  return (
    <div className="pp-body">
      <div className="pp-head" style={{ '--nc': n.color } as CSSProperties}>
        <span className="pp-type"><GameIcon id={def.icon} size={14} /> {isChar(n.type) ? kindLabel(plan.system ?? DEFAULT_SYSTEM(), n.type, n.sheet?.boss) : def.label}</span>
        <select value={n.type} onChange={(e) => changeType(e.target.value as NodeType)} aria-label="Tipo da ficha">
          {ORDER.map((t) => <option key={t} value={t}>{isChar(t) ? kindLabel(plan.system ?? DEFAULT_SYSTEM(), t) : TYPES[t].label}</option>)}
        </select>
      </div>
      <label className="field"><span>{n.type === 'nota' || n.type === 'imagem' ? 'Título (opcional)' : 'Nome'}</span>
        <Text inputRef={titleRef} k="title" value={n.title} placeholder={def.label} onChange={(v) => up((m) => { m.title = v.slice(0, 80); }, 'title')} />
      </label>
      {n.type !== 'nota' && n.type !== 'imagem' && n.type !== 'moldura' && (
        <label className="field"><span>Subtítulo</span><Text k="sub" value={n.subtitle} placeholder={isChar(n.type) ? 'Ex.: Detetive particular' : 'Ex.: Zona portuária'} onChange={(v) => up((m) => { m.subtitle = v.slice(0, 80); }, 'sub')} /></label>
      )}
      <div className="insp-grid">
        <div className="field"><span>Cor</span>
          <div className="color-line">
            {PLAN_COLORS.slice(0, 6).map((c) => <button key={c} type="button" className={`color-dot${n.color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => up((m) => { m.color = c; })} aria-label={`Cor ${c}`} />)}
            <input type="color" value={n.color} onChange={(e) => up((m) => { m.color = e.target.value; }, 'color')} aria-label="Outra cor" />
          </div>
        </div>
        <div className="field"><span>Ícone</span><IconButton value={n.icon} onChange={(icon) => up((m) => { m.icon = icon; })} /></div>
      </div>
      {n.type !== 'moldura' && (
        <div className="field"><span>{isChar(n.type) ? 'Retrato (arte da carta)' : 'Imagem'}</span>
          <div className="backup-actions">
            <button className="btn small" onClick={() => { void pickImage(); }}><ImagePlus size={13} /> {n.image ? 'Trocar' : 'Escolher'}</button>
            {n.image && <button className="btn small" onClick={() => up((m) => { m.image = null; })}><X size={13} /> Remover</button>}
          </div>
        </div>
      )}
      {n.type !== 'moldura' && n.type !== 'imagem' && (
        <label className="field"><span>Etiquetas (separe com vírgula)</span>
          <Text k="tags" value={n.tags.join(', ')} placeholder="Ex.: ato 1, segredo, porto" onChange={(v) => up((m) => { m.tags = v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12); }, 'tags')} />
        </label>
      )}
      {n.type !== 'moldura' && n.type !== 'imagem' && (
        <div className="field pp-text">
          <span>Texto <small className="muted">— escreva [[Nome]] para ligar a outra ficha</small></span>
          <Text inputRef={bodyRef} k="body" multiline rows={isChar(n.type) ? 6 : 10} value={n.body} placeholder={'# Título\nHistória, segredos, ganchos…\n\n- lista\n**negrito**, *itálico*, > citação'}
            onChange={(v, c) => { setCaret(c); up((m) => { m.body = v.slice(0, 20000); }, 'body'); }}
            onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onKeyDown={(e) => { if (e.key === 'Enter' && sugg.length && query !== null) { e.preventDefault(); insertLink(sugg[0].title); } }} />
          <small className="pp-md-hint"># título · ## subtítulo · **negrito** · *itálico* · - lista · 1. lista · &gt; citação · --- linha</small>
          {query !== null && (
            <div className="pp-sugg">
              {sugg.map((m) => <button key={m.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertLink(m.title)}><GameIcon id={TYPES[m.type].icon} size={13} /> {m.title}</button>)}
              {!sugg.length && <span className="muted small">{query ? `Nenhuma ficha com “${query}” — o link fica pendente até você criá-la.` : 'Comece a digitar o nome da ficha.'}</span>}
            </div>
          )}
        </div>
      )}

      {isChar(n.type) && <SheetEditor n={n} />}

      {(links.length > 0 || cites.length > 0 || back.length > 0) && <h4>Conexões</h4>}
      {links.map((l) => {
        const other = plan.nodes.find((m) => m.id === (l.from === n.id ? l.to : l.from));
        if (!other) return null;
        return (
          <button key={l.id} type="button" className="pp-conn" onClick={() => select([], l.id)}>
            <span className="pp-arrow">{l.from === n.id ? '→' : '←'}</span>
            <span className="pp-conn-name">{other.title || TYPES[other.type].label}</span>
            {l.label && <em>{l.label}</em>}
          </button>
        );
      })}
      {cites.map((t) => {
        const m = findByTitle(plan.nodes, t);
        return m
          ? <button key={`c-${t}`} type="button" className="pp-conn cite" onClick={() => canvas.focus(m.id)}><span className="pp-arrow">[[</span><span className="pp-conn-name">{m.title}</span><em>citada no texto</em></button>
          : <button key={`c-${t}`} type="button" className="pp-conn missing" onClick={() => createCited(t)} title="Criar uma nota com esse nome"><span className="pp-arrow">+</span><span className="pp-conn-name">{t}</span><em>ainda não existe — criar</em></button>;
      })}
      {back.map((m) => <button key={`b-${m.id}`} type="button" className="pp-conn back" onClick={() => canvas.focus(m.id)}><span className="pp-arrow">↩</span><span className="pp-conn-name">{m.title || TYPES[m.type].label}</span><em>cita esta ficha</em></button>)}

      <div className="pp-actions">
        {isChar(n.type) && <button className="btn small" onClick={() => window.dispatchEvent(new CustomEvent('plan:open-sheet', { detail: n.id }))}><IdCard size={13} /> Abrir ficha</button>}
        {n.type === 'inimigo' && <button className="btn small primary" onClick={hunt}><Crosshair size={13} /> Enfrentar no Bestiário</button>}
        {(n.type === 'personagem' || n.type === 'npc') && <button className="btn small primary" onClick={hunt}><Crosshair size={13} /> Caçar com esta ficha</button>}
        <button className="btn small" onClick={duplicate}><Copy size={13} /> Duplicar</button>
        <button className="btn small danger-ghost" onClick={remove}><Trash2 size={13} /> Excluir</button>
      </div>
    </div>
  );
}

/** Miniatura de uma ligação (para os botões de estilo). */
function LinkSample({ style, w = 56 }: { style: LinkStyle; w?: number }) {
  const d = style.kind === 'cotovelo' ? `M2 18L${w / 2} 18L${w / 2} 6L${w - 2} 6` : style.kind === 'curva' ? `M2 18C${w / 2} 18 ${w / 2} 6 ${w - 2} 6` : `M2 12L${w - 2} 12`;
  const end = style.kind === 'reta' ? { x: w - 2, y: 12, angle: 0 } : { x: w - 2, y: 6, angle: 0 };
  const start = style.kind === 'reta' ? { x: 2, y: 12, angle: 180 } : { x: 2, y: 18, angle: 180 };
  const sw = Math.min(2.6, style.width);
  const cap = (c: LinkCap, p: { x: number; y: number; angle: number }) => { const cp = capPath(c, sw * 0.8); return cp ? <path d={cp.d} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`} fill={cp.fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={sw * 0.8} strokeLinejoin="round" strokeLinecap="round" /> : null; };
  return (
    <svg width={w} height={24} viewBox={`-4 0 ${w + 8} 24`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={sw} strokeDasharray={dashArray(style.dash, sw)} strokeLinecap={style.dash === 'pontilhado' ? 'round' : 'butt'} />
      {cap(style.startCap, start)}{cap(style.endCap, end)}
    </svg>
  );
}

const CAPS: { id: LinkCap; label: string }[] = [
  { id: 'nenhuma', label: 'Nenhuma' }, { id: 'seta', label: 'Seta' }, { id: 'triangulo', label: 'Triângulo' },
  { id: 'circulo', label: 'Círculo' }, { id: 'losango', label: 'Losango' }, { id: 'barra', label: 'Barra' },
];
const SIDE_LABEL: Record<LinkSide, string> = { auto: 'Automático', top: 'Cima', right: 'Direita', bottom: 'Baixo', left: 'Esquerda' };

function LinkEditor({ id }: { id: string }) {
  const plan = usePlan((s) => s.plan)!;
  const l = plan.links.find((x) => x.id === id);
  if (!l) return null;
  const a = plan.nodes.find((n) => n.id === l.from); const b = plan.nodes.find((n) => n.id === l.to);
  const up = (fn: (x: PlanLink) => void, key?: string) => edit((d) => { const m = d.links.find((x) => x.id === id); if (m) fn(m); }, key ? { key: `${id}:${key}` } : {});
  const st = styleOf(l);
  const setStyle = (p: Partial<LinkStyle>, key?: string) => { const next = { ...st, ...p }; rememberLinkStyle(next); up((m) => { Object.assign(m, next); }, key); };
  return (
    <div className="pp-body">
      <div className="pp-head"><span className="pp-type"><ArrowLeftRight size={14} /> Ligação</span></div>
      <p className="pp-linkpath"><b>{a?.title || 'Ficha'}</b> → <b>{b?.title || 'Ficha'}</b></p>
      <label className="field"><span>Legenda</span><input autoFocus value={l.label} placeholder="Ex.: traiu, mora em, procura" onChange={(e) => up((m) => { m.label = e.target.value.slice(0, 60); }, 'label')} /></label>

      <div className="field"><span>Estilos prontos</span>
        <div className="lk-presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`lk-preset${JSON.stringify(p.style) === JSON.stringify(st) ? ' on' : ''}`} title={p.label} onClick={() => setStyle(p.style)}>
              <LinkSample style={p.style} /><small>{p.label}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field"><span>Formato</span>
        <div className="seg lk-seg">
          {(['reta', 'curva', 'cotovelo'] as LinkKind[]).map((k) => <button key={k} type="button" className={st.kind === k ? 'on' : ''} onClick={() => setStyle({ kind: k })}><LinkSample style={{ ...st, kind: k, startCap: 'nenhuma', endCap: 'nenhuma', dash: 'solido', width: 2 }} w={44} />{k === 'reta' ? 'Reta' : k === 'curva' ? 'Curva' : 'Cotovelo'}</button>)}
        </div>
      </div>
      <div className="field"><span>Traço</span>
        <div className="seg lk-seg">
          {(['solido', 'tracejado', 'pontilhado'] as LinkDash[]).map((k) => <button key={k} type="button" className={st.dash === k ? 'on' : ''} onClick={() => setStyle({ dash: k })}><LinkSample style={{ ...st, kind: 'reta', dash: k, startCap: 'nenhuma', endCap: 'nenhuma', width: 2 }} w={44} />{k === 'solido' ? 'Contínuo' : k === 'tracejado' ? 'Tracejado' : 'Pontilhado'}</button>)}
        </div>
      </div>
      <div className="insp-grid two-even">
        <label className="field"><span>Ponta no início</span>
          <select value={st.startCap} onChange={(e) => setStyle({ startCap: e.target.value as LinkCap })}>{CAPS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </label>
        <label className="field"><span>Ponta no fim</span>
          <select value={st.endCap} onChange={(e) => setStyle({ endCap: e.target.value as LinkCap })}>{CAPS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </label>
      </div>
      <label className="field"><span>Espessura — {st.width}</span>
        <input type="range" min={1} max={8} step={0.5} value={st.width} onChange={(e) => setStyle({ width: Number(e.target.value) }, 'width')} />
      </label>
      <div className="insp-grid two-even">
        <label className="field"><span>Sai de {a?.title ? `“${a.title}”` : ''} por</span>
          <select value={l.fromSide ?? 'auto'} onChange={(e) => up((m) => { m.fromSide = e.target.value as LinkSide; })}>{(Object.keys(SIDE_LABEL) as LinkSide[]).map((k) => <option key={k} value={k}>{SIDE_LABEL[k]}</option>)}</select>
        </label>
        <label className="field"><span>Chega em {b?.title ? `“${b.title}”` : ''} por</span>
          <select value={l.toSide ?? 'auto'} onChange={(e) => up((m) => { m.toSide = e.target.value as LinkSide; })}>{(Object.keys(SIDE_LABEL) as LinkSide[]).map((k) => <option key={k} value={k}>{SIDE_LABEL[k]}</option>)}</select>
        </label>
      </div>
      <div className="field"><span>Cor</span>
        <div className="color-line">
          {['#a3a3a3', '#e5e5e5', ...PLAN_COLORS.slice(0, 6)].map((c) => <button key={c} type="button" className={`color-dot${l.color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => up((m) => { m.color = c; })} aria-label={`Cor ${c}`} />)}
          <input type="color" value={l.color} onChange={(e) => up((m) => { m.color = e.target.value; }, 'color')} aria-label="Outra cor" />
        </div>
      </div>
      <div className="pp-actions">
        <button className="btn small" onClick={() => up((m) => { const f = m.from; m.from = m.to; m.to = f; const fs = m.fromSide; m.fromSide = m.toSide; m.toSide = fs; const sc = m.startCap; m.startCap = m.endCap ?? 'seta'; m.endCap = sc ?? 'nenhuma'; })}><ArrowLeftRight size={13} /> Inverter</button>
        <button className="btn small danger-ghost" onClick={() => { edit((d) => { d.links = d.links.filter((x) => x.id !== id); }); select([]); }}><Trash2 size={13} /> Apagar ligação</button>
      </div>
    </div>
  );
}

function MultiEditor({ ids }: { ids: string[] }) {
  return (
    <div className="pp-body">
      <div className="pp-head"><span className="pp-type">{ids.length} fichas selecionadas</span></div>
      <div className="field"><span>Cor de todas</span>
        <div className="color-line">
          {PLAN_COLORS.map((c) => <button key={c} type="button" className="color-dot" style={{ background: c }} onClick={() => edit((d) => { for (const m of d.nodes) if (ids.includes(m.id)) m.color = c; })} aria-label={`Cor ${c}`} />)}
        </div>
      </div>
      <p className="panel-note">Arraste qualquer uma para mover todas. Shift + clique soma ou tira da seleção. Ctrl + D duplica.</p>
      <div className="pp-actions">
        <button className="btn small danger-ghost" onClick={() => { edit((d) => { d.nodes = d.nodes.filter((x) => !ids.includes(x.id)); d.links = d.links.filter((l) => !ids.includes(l.from) && !ids.includes(l.to)); }); select([]); }}><Trash2 size={13} /> Excluir {ids.length}</button>
      </div>
    </div>
  );
}

function PlanInfo() {
  const plan = usePlan((s) => s.plan)!;
  const counts = ORDER.map((t) => [t, plan.nodes.filter((n) => n.type === t).length] as const).filter(([, c]) => c > 0);
  return (
    <div className="pp-body">
      <div className="pp-head"><span className="pp-type"><GameIcon id={plan.icon} size={14} /> Campanha</span></div>
      <label className="field"><span>Nome</span><input value={plan.name} onChange={(e) => edit((d) => { d.name = e.target.value.slice(0, 80); }, { key: 'plan:name' })} /></label>
      <label className="field"><span>Descrição</span><textarea className="pn-scroll" rows={4} value={plan.description} onChange={(e) => edit((d) => { d.description = e.target.value.slice(0, 600); }, { key: 'plan:desc' })} /></label>
      <h4>Sistema de regras</h4>
      <div className="pp-sys big">
        <GameIcon id={(plan.system ?? DEFAULT_SYSTEM()).icon} size={18} />
        <span><b>{(plan.system ?? DEFAULT_SYSTEM()).name}</b><small>{(plan.system ?? DEFAULT_SYSTEM()).stats.length} campos · {(plan.system ?? DEFAULT_SYSTEM()).lists.map((l) => l.name).join(', ') || 'sem listas'}</small></span>
        <button className="btn small" onClick={openSystemEditor}><Settings2 size={13} /> Editar</button>
      </div>
      <h4>No quadro</h4>
      <div className="pp-counts">
        {counts.map(([t, c]) => <span key={t}><GameIcon id={TYPES[t].icon} size={13} /> {c} {isChar(t) ? kindLabel(plan.system ?? DEFAULT_SYSTEM(), t) : c === 1 ? TYPES[t].label : TYPES[t].plural}</span>)}
        {!counts.length && <span className="muted">Nada ainda.</span>}
        {plan.links.length > 0 && <span><ArrowLeftRight size={13} /> {plan.links.length} ligação(ões)</span>}
      </div>
      <h4>Atalhos</h4>
      <ul className="pp-help">
        <li><b>Rolagem</b> move · <b>Ctrl + rolagem</b> aproxima</li>
        <li><b>Arrastar no fundo</b> seleciona vários · <b>Espaço/botão direito + arrastar</b> move a visão</li>
        <li><b>Dois cliques</b> no fundo cria uma nota · em uma ficha, edita o nome</li>
        <li><b>Bolinha da borda</b>: arraste até outra ficha para ligar</li>
        <li><b>[[Nome]]</b> no texto liga fichas · <b>Ctrl + F</b> busca</li>
        <li><b>Ctrl + Z / Y</b> desfaz e refaz · <b>Delete</b> apaga · <b>Ctrl + D</b> duplica</li>
        <li>Arraste ou cole imagens direto no quadro</li>
      </ul>
    </div>
  );
}

export function NodePanel() {
  const plan = usePlan((s) => s.plan);
  const sel = usePlan((s) => s.sel);
  const selLink = usePlan((s) => s.selLink);
  if (!plan) return null;
  if (selLink) return <LinkEditor key={selLink} id={selLink} />;
  if (sel.length > 1) return <MultiEditor ids={sel} />;
  const n = sel.length === 1 ? plan.nodes.find((x) => x.id === sel[0]) : null;
  if (n) return isText(n.type) ? <TextEditor key={n.id} n={n} /> : <NodeEditor key={n.id} n={n} />;
  return <PlanInfo />;
}
