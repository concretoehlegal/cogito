/*
 * Editor do sistema de regras da campanha: os campos da ficha (nome, sigla, ícone, tipo, função, quem tem, se aparece
 * na carta e o valor inicial), as listas (Atributos, Perícias…), os nomes de cada coisa e as rolagens de acerto.
 * Começa de um modelo pronto ou copia o sistema de outra campanha.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { ArrowDown, ArrowUp, Copy, Plus, RotateCcw, X } from 'lucide-react';
import { api, errorText } from '../api';
import { Modal, confirmDialog } from '../components/ui';
import { toast } from '../store';
import { setCardLabels } from '../game/Cards';
import { IconButton } from '../game/icons';
import type { CardType, PlanMeta } from '../game/types';
import {
  HIT_MODES, KINDS, PRESETS, ROLES, WHO, applySystem, fixSystem, newId, presetById,
  type ListDef, type RuleSystem, type StatDef, type Who,
} from '../game/system';
import { edit, usePlan } from './state';

/** Abre e fecha o editor (de qualquer lugar do Planejador). */
export const useSystemEditor = create<{ open: boolean }>(() => ({ open: false }));
export const openSystemEditor = () => useSystemEditor.setState({ open: true });

const WHO_LABEL = (sys: RuleSystem): Record<Who, string> => ({ personagem: sys.labels.personagem, npc: sys.labels.npc, inimigo: sys.labels.inimigo });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
type Tab = 'campos' | 'listas' | 'nomes' | 'rolagens';

function WhoChips({ sys, value, onChange }: { sys: RuleSystem; value: Who[]; onChange: (v: Who[]) => void }) {
  const names = WHO_LABEL(sys);
  return (
    <span className="se-who" role="group" aria-label="Quem tem">
      {WHO.map((w) => (
        <button key={w} type="button" className={value.includes(w) ? 'on' : ''} title={`${names[w]}: ${value.includes(w) ? 'tem' : 'não tem'}`}
          onClick={() => onChange(value.includes(w) ? value.filter((x) => x !== w) : WHO.filter((x) => x === w || value.includes(x)))}>{names[w]}</button>
      ))}
    </span>
  );
}

function Move({ i, n, onMove, onRemove, what }: { i: number; n: number; onMove: (d: number) => void; onRemove: () => void; what: string }) {
  return (
    <span className="se-move">
      <button type="button" className="icon-btn" title="Subir" disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></button>
      <button type="button" className="icon-btn" title="Descer" disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown size={14} /></button>
      <button type="button" className="icon-btn" title={`Remover ${what}`} onClick={onRemove}><X size={14} /></button>
    </span>
  );
}

function StatRow({ sys, s, i, n, set, move, remove }: { sys: RuleSystem; s: StatDef; i: number; n: number; set: (p: Partial<StatDef>) => void; move: (d: number) => void; remove: () => void }) {
  const role = ROLES.find((r) => r.id === s.role);
  return (
    <div className="se-row">
      <div className="se-line">
        <IconButton value={s.icon} onChange={(icon) => set({ icon })} title="Ícone do campo" />
        <input className="se-name" value={s.name} maxLength={40} placeholder="Nome do campo" aria-label="Nome do campo" onChange={(e) => set({ name: e.target.value })} />
        <input className="se-short" value={s.short} maxLength={6} placeholder="Sigla" aria-label="Sigla" title="Sigla (aparece na HUD e nos custos de cartas)" onChange={(e) => set({ short: e.target.value })} />
        <select value={s.kind} aria-label="Tipo" onChange={(e) => set({ kind: e.target.value as StatDef['kind'], ...(e.target.value === 'texto' ? { role: '', card: false } : {}) })}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <select value={s.role} aria-label="Função" title={role?.hint} disabled={s.kind === 'texto'} onChange={(e) => set({ role: e.target.value as StatDef['role'] })}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <Move i={i} n={n} onMove={move} onRemove={remove} what="o campo" />
      </div>
      <div className="se-line sub">
        <WhoChips sys={sys} value={s.who} onChange={(who) => set({ who })} />
        <label className={`check${s.kind === 'texto' ? ' disabled' : ''}`} title="Mostrar nos cantos da carta"><input type="checkbox" checked={s.card} disabled={s.kind === 'texto'} onChange={(e) => set({ card: e.target.checked })} /> Na carta</label>
        <label className="se-def">Inicial <input value={s.def} maxLength={24} onChange={(e) => set({ def: e.target.value })} /></label>
        {s.who.includes('inimigo') && <label className="se-def" title={`Valor inicial para ${sys.labels.inimigo.toLowerCase()}`}>{sys.labels.inimigo} <input value={s.defEnemy ?? ''} placeholder={s.def} maxLength={24} onChange={(e) => set({ defEnemy: e.target.value === '' ? undefined : e.target.value })} /></label>}
      </div>
    </div>
  );
}

function ListCard({ sys, l, i, n, set, move, remove }: { sys: RuleSystem; l: ListDef; i: number; n: number; set: (p: Partial<ListDef>) => void; move: (d: number) => void; remove: () => void }) {
  const setItem = (j: number, p: Partial<ListDef['items'][number]>) => set({ items: l.items.map((x, k) => (k === j ? { ...x, ...p } : x)) });
  return (
    <div className="se-row list">
      <div className="se-line">
        <IconButton value={l.icon} onChange={(icon) => set({ icon })} title="Ícone da lista" />
        <input className="se-name" value={l.name} maxLength={40} placeholder="Nome da lista" aria-label="Nome da lista" onChange={(e) => set({ name: e.target.value })} />
        <WhoChips sys={sys} value={l.who} onChange={(who) => set({ who })} />
        <label className="check" title="Mostrar no corpo da carta"><input type="checkbox" checked={l.card} onChange={(e) => set({ card: e.target.checked })} /> Na carta</label>
        <Move i={i} n={n} onMove={move} onRemove={remove} what="a lista" />
      </div>
      <div className="se-items">
        {l.items.map((it, j) => (
          <span key={j} className="se-item">
            <IconButton value={it.icon || 'estrela'} onChange={(icon) => setItem(j, { icon })} title="Ícone do item" />
            <input value={it.k} maxLength={40} placeholder="Item" aria-label="Item da lista" onChange={(e) => setItem(j, { k: e.target.value })} />
            <button type="button" className="icon-btn" title="Remover item" onClick={() => set({ items: l.items.filter((_, k) => k !== j) })}><X size={13} /></button>
          </span>
        ))}
        <button type="button" className="btn small" onClick={() => set({ items: [...l.items, { k: '', icon: '' }] })}><Plus size={13} /> Item</button>
      </div>
      <small className="muted">Os itens são o ponto de partida das fichas novas; cada ficha pode mudar nomes, ícones e valores, e somar ou tirar itens.</small>
    </div>
  );
}

export function SystemEditor({ onClose }: { onClose: () => void }) {
  const plan = usePlan((s) => s.plan)!;
  const [sys, setSys] = useState<RuleSystem>(() => clone(fixSystem(plan.system)));
  const [tab, setTab] = useState<Tab>('campos');
  const [camps, setCamps] = useState<PlanMeta[]>([]);
  useEffect(() => { api.planList().then((l) => setCamps(l.filter((c) => c.id !== plan.id)), () => {}); }, [plan.id]);
  const up = (fn: (s: RuleSystem) => void) => setSys((cur) => { const next = clone(cur); fn(next); return next; });
  const swap = <T,>(arr: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  const fromPreset = async (id: string) => {
    if (!id) return;
    const p = PRESETS.find((x) => x.id === id);
    if (!(await confirmDialog({ title: `Usar o modelo ${p?.name}?`, message: 'Os campos, listas, nomes e rolagens deste editor serão trocados pelos do modelo. Os valores já preenchidos nas fichas continuam guardados.', confirmText: 'Usar o modelo' }))) return;
    setSys(presetById(id));
  };
  const fromCampaign = async (id: string) => {
    if (!id) return;
    try { const other = await api.planLoad(id); setSys(clone(fixSystem(other.system))); toast(`Sistema copiado de “${other.name}”. Salve para usar nesta campanha.`, 'info'); } catch (e) { toast(errorText(e), 'error'); }
  };
  const save = () => {
    edit((d) => { applySystem(d, clone(sys)); });
    setCardLabels(sys);
    toast('Sistema de regras salvo. As fichas e cartas já usam os campos novos.', 'ok');
    onClose();
  };
  const hit = HIT_MODES.find((h) => h.id === sys.combat.hit);

  return (
    <Modal title="Sistema de regras da campanha" onClose={onClose} wide
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar sistema</button></>}>
      <div className="sys-editor">
        <div className="se-top">
          <IconButton value={sys.icon} onChange={(icon) => up((s) => { s.icon = icon; })} title="Ícone do sistema" />
          <label className="field se-sysname"><span>Nome do sistema</span><input value={sys.name} maxLength={60} onChange={(e) => up((s) => { s.name = e.target.value; })} /></label>
          <label className="field"><span><RotateCcw size={12} /> Começar de um modelo</span>
            <select value="" onChange={(e) => { void fromPreset(e.target.value); }}>
              <option value="">Escolher…</option>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="field"><span><Copy size={12} /> Copiar de outra campanha</span>
            <select value="" disabled={!camps.length} onChange={(e) => { void fromCampaign(e.target.value); }}>
              <option value="">{camps.length ? 'Escolher…' : 'Nenhuma outra campanha'}</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <div className="seg se-tabs" role="tablist">
          {([['campos', `Campos (${sys.stats.length})`], ['listas', `Listas (${sys.lists.length})`], ['nomes', 'Nomes'], ['rolagens', 'Rolagens']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'campos' && (
          <div className="se-pane">
            <p className="muted small">Números, barras e textos de cada ficha. A <b>função</b> diz o que o número significa na ficha: a vida (a barra em destaque na carta), a defesa, o recurso que as cartas gastam (“2 {sys.stats.find((x) => x.role === 'recurso')?.short || 'PE'}”), a armadura, as ações e o movimento.</p>
            {sys.stats.map((s, i) => (
              <StatRow key={s.id} sys={sys} s={s} i={i} n={sys.stats.length}
                set={(p) => up((x) => { Object.assign(x.stats[i], p); if (p.defEnemy === undefined && 'defEnemy' in p) delete x.stats[i].defEnemy; })}
                move={(d) => up((x) => swap(x.stats, i, d))} remove={() => up((x) => { x.stats.splice(i, 1); })} />
            ))}
            <div className="se-add">
              <button type="button" className="btn small" onClick={() => up((x) => { x.stats.push({ id: newId('campo', x.stats.map((s) => s.id)), name: 'Novo campo', short: '', icon: 'estrela', kind: 'numero', role: '', who: [...WHO], card: false, def: '0' }); })}><Plus size={13} /> Número</button>
              <button type="button" className="btn small" onClick={() => up((x) => { x.stats.push({ id: newId('barra', x.stats.map((s) => s.id)), name: 'Nova barra', short: '', icon: 'coracao', kind: 'barra', role: '', who: [...WHO], card: true, def: '10' }); })}><Plus size={13} /> Barra</button>
              <button type="button" className="btn small" onClick={() => up((x) => { x.stats.push({ id: newId('texto', x.stats.map((s) => s.id)), name: 'Novo texto', short: '', icon: 'pergaminho', kind: 'texto', role: '', who: ['personagem', 'npc'], card: false, def: '' }); })}><Plus size={13} /> Texto</button>
            </div>
          </div>
        )}

        {tab === 'listas' && (
          <div className="se-pane">
            <p className="muted small">Grupos de nome e valor, como Atributos, Perícias, Características ou Salvamentos. As listas marcadas “na carta” aparecem no corpo da carta do quadro.</p>
            {sys.lists.map((l, i) => (
              <ListCard key={l.id} sys={sys} l={l} i={i} n={sys.lists.length}
                set={(p) => up((x) => { Object.assign(x.lists[i], p); })}
                move={(d) => up((x) => swap(x.lists, i, d))} remove={() => up((x) => { x.lists.splice(i, 1); })} />
            ))}
            <div className="se-add"><button type="button" className="btn small" onClick={() => up((x) => { x.lists.push({ id: newId('lista', x.lists.map((l) => l.id)), name: 'Nova lista', icon: 'estrela', who: ['personagem', 'npc'], card: false, items: [] }); })}><Plus size={13} /> Lista</button></div>
          </div>
        )}

        {tab === 'nomes' && (
          <div className="se-pane">
            <h4>Tipos de ficha</h4>
            <div className="se-grid">
              {([['personagem', 'Personagem'], ['npc', 'NPC'], ['inimigo', 'Inimigo'], ['chefe', 'Chefe (carta larga)']] as const).map(([k, l]) => (
                <label key={k} className="field"><span>{l}</span><input value={sys.labels[k]} maxLength={30} onChange={(e) => up((x) => { x.labels[k] = e.target.value; })} /></label>
              ))}
            </div>
            <h4>Ações e textos</h4>
            <div className="se-grid">
              {([['ataques', 'Ataques (personagens)'], ['habilidades', 'Habilidades (criaturas)'], ['acerto', 'Rolagem de acerto'], ['dano', 'Dano'], ['origem', 'Habilidades de origem']] as const).map(([k, l]) => (
                <label key={k} className="field"><span>{l}</span><input value={sys.labels[k]} maxLength={40} onChange={(e) => up((x) => { x.labels[k] = e.target.value; })} /></label>
              ))}
            </div>
            <h4>Tipos de carta</h4>
            {(['item', 'habilidade', 'feitico'] as CardType[]).map((t) => (
              <div key={t} className="se-line">
                <IconButton value={sys.cardTypes[t].icon} onChange={(icon) => up((x) => { x.cardTypes[t].icon = icon; })} title="Ícone do tipo" />
                <input className="se-name" value={sys.cardTypes[t].label} maxLength={30} placeholder="Nome" aria-label="Nome do tipo de carta" onChange={(e) => up((x) => { x.cardTypes[t].label = e.target.value; })} />
                <input className="se-name" value={sys.cardTypes[t].plural} maxLength={30} placeholder="Plural" aria-label="Plural" onChange={(e) => up((x) => { x.cardTypes[t].plural = e.target.value; })} />
              </div>
            ))}
          </div>
        )}

        {tab === 'rolagens' && (
          <div className="se-pane">
            <label className="field"><span>Como o ataque acerta</span>
              <select value={sys.combat.hit} onChange={(e) => up((x) => { x.combat.hit = e.target.value as RuleSystem['combat']['hit']; if (x.combat.hit === 'percentual' && x.combat.crit !== 'nenhum') x.combat.crit = 'extremo'; if (x.combat.hit === 'contra-defesa' && x.combat.crit === 'extremo') x.combat.crit = 'max'; })}>
                {HIT_MODES.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
              <small className="muted">{hit?.hint}</small>
            </label>
            <label className="field"><span>Rolagem de acerto das ações novas</span><input value={sys.combat.defaultHit} maxLength={20} placeholder={sys.combat.hit === 'percentual' ? 'Ex.: 50' : 'Ex.: 1d20+5'} onChange={(e) => up((x) => { x.combat.defaultHit = e.target.value.replace(/\s+/g, ''); })} /></label>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Coloca o editor na tela quando pedido. */
export function SystemEditorHost() {
  const open = useSystemEditor((s) => s.open);
  return open ? <SystemEditor onClose={() => useSystemEditor.setState({ open: false })} /> : null;
}
