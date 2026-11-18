/* Área Planejador da tela inicial: as campanhas guardadas neste computador, cada uma com ícone, cor, nome, descrição e foto. */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FolderOpen, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api, errorText } from '../api';
import { Modal, confirmDialog, fmtDate } from '../components/ui';
import { toast } from '../store';
import { GameIcon, IconPicker } from '../game/icons';
import type { PlanMeta } from '../game/types';
import { openPlan, planFileUrl } from './state';
import './planner.css';

export const PLAN_COLORS = ['#b8ff2c', '#7aa7d6', '#a493c4', '#d77a6e', '#c99a62', '#d8c26a', '#6bb5ad', '#d4d4d4'];

/** Criar ou editar a capa de uma campanha. A foto pede a campanha já criada, então ela é criada na hora se preciso. */
function PlanDialog({ meta, onClose, onSaved }: { meta: PlanMeta | null; onClose: () => void; onSaved: (m: PlanMeta) => void }) {
  const [name, setName] = useState(meta?.name ?? '');
  const [description, setDescription] = useState(meta?.description ?? '');
  const [icon, setIcon] = useState(meta?.icon ?? 'mapa');
  const [color, setColor] = useState(meta?.color ?? PLAN_COLORS[0]);
  const [current, setCurrent] = useState<PlanMeta | null>(meta);
  const [createdHere, setCreatedHere] = useState(false);
  const fields = () => ({ name: name.trim() || 'Nova campanha', description, icon, color });
  const ensure = async () => {
    if (current) return current;
    const m = await api.planCreate(fields());
    setCurrent(m); setCreatedHere(true);
    return m;
  };
  const pickPhoto = async () => {
    try { const m = await ensure(); const r = await api.planPickCover(m.id); if (r) setCurrent(r); } catch (e) { toast(errorText(e), 'error'); }
  };
  const removePhoto = async () => { if (!current) return; try { setCurrent(await api.planRemoveCover(current.id)); } catch (e) { toast(errorText(e), 'error'); } };
  const save = async () => {
    try {
      const m = current ? await api.planUpdateMeta(current.id, fields()) : await api.planCreate(fields());
      onSaved(m);
    } catch (e) { toast(errorText(e), 'error'); }
  };
  const cancel = async () => {
    if (createdHere && current) await api.planDelete(current.id).catch(() => {});
    onClose();
  };
  return (
    <Modal
      title={meta ? 'Editar campanha' : 'Nova campanha'} onClose={() => { void cancel(); }} wide
      footer={<><button className="btn" onClick={() => { void cancel(); }}>Cancelar</button><button className="btn primary" onClick={() => { void save(); }}>{meta ? 'Salvar' : 'Criar campanha'}</button></>}
    >
      <div className="plan-dialog">
        <div className="plan-dialog-preview">
          <div className="plan-card preview" style={{ '--pc': color } as CSSProperties}>
            <div className="plan-cover">
              {current?.cover ? <img src={planFileUrl(current.id, current.cover)} alt="" /> : <span className="plan-cover-empty"><GameIcon id={icon} size={64} /></span>}
            </div>
            <span className="plan-badge"><GameIcon id={icon} size={22} /></span>
            <div className="plan-info"><strong>{name.trim() || 'Nova campanha'}</strong><p>{description || 'Sem descrição.'}</p></div>
          </div>
          <div className="plan-photo-actions">
            <button className="btn small" onClick={() => { void pickPhoto(); }}><ImagePlus size={14} /> {current?.cover ? 'Trocar foto' : 'Escolher foto'}</button>
            {current?.cover && <button className="btn small" onClick={() => { void removePhoto(); }}><X size={14} /> Remover</button>}
          </div>
        </div>
        <div className="plan-dialog-form">
          <label className="field"><span>Nome</span><input autoFocus value={name} maxLength={80} placeholder="Ex.: Cair da Noite — Temporada 1" onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Descrição</span><textarea value={description} maxLength={600} rows={3} placeholder="Do que trata a campanha, o tom, o grupo…" onChange={(e) => setDescription(e.target.value)} /></label>
          <div className="field"><span>Cor</span>
            <div className="color-line">
              {PLAN_COLORS.map((c) => <button key={c} type="button" className={`color-dot${color === c ? ' on' : ''}`} style={{ background: c }} aria-label={`Cor ${c}`} onClick={() => setColor(c)} />)}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Outra cor" />
            </div>
          </div>
          <div className="field"><span>Ícone</span><IconPicker value={icon} onChange={setIcon} /></div>
        </div>
      </div>
    </Modal>
  );
}

const ago = (ts: number) => {
  if (!ts) return '—';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'agora'; if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24); if (d < 30) return d === 1 ? 'ontem' : `há ${d} dias`;
  return fmtDate(ts).slice(0, 10);
};
type Sort = 'recentes' | 'nome' | 'fichas';
const SORTS: { id: Sort; label: string }[] = [{ id: 'recentes', label: 'Recentes' }, { id: 'nome', label: 'Nome' }, { id: 'fichas', label: 'Mais fichas' }];

/** Rosto de uma ficha (foto, ou o ícone na cor da ficha). */
function Face({ f, planId, size = 30 }: { f: NonNullable<PlanMeta['faces']>[number]; planId: string; size?: number }) {
  return (
    <span className="pd-face" title={f.name} style={{ '--fc': f.color, width: size, height: size } as CSSProperties}>
      {f.image ? <img src={planFileUrl(planId, f.image)} alt="" /> : <GameIcon id={f.icon} size={Math.round(size * .55)} />}
    </span>
  );
}
function Thumb({ m, size = 40 }: { m: PlanMeta; size?: number }) {
  return (
    <span className="pd-thumb" style={{ '--pc': m.color, width: size, height: size } as CSSProperties}>
      {m.cover ? <img src={planFileUrl(m.id, m.cover)} alt="" /> : <GameIcon id={m.icon} size={Math.round(size * .5)} />}
    </span>
  );
}

export function PlanList() {
  const [items, setItems] = useState<PlanMeta[] | null>(null);
  const [dialog, setDialog] = useState<{ meta: PlanMeta | null } | null>(null);
  const [sort, setSort] = useState<Sort>('recentes');
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const refresh = () => api.planList().then(setItems, (e) => { setItems([]); toast(errorText(e), 'error'); });
  useEffect(() => { void refresh(); }, []);
  const remove = async (m: PlanMeta) => {
    if (!(await confirmDialog({ title: 'Excluir campanha', message: `Excluir “${m.name}” com o quadro e as imagens? A pasta vai para a lixeira do computador.`, confirmText: 'Excluir', danger: true }))) return;
    try { await api.planDelete(m.id); if (selId === m.id) setSelId(null); void refresh(); } catch (e) { toast(errorText(e), 'error'); }
  };
  const all = items ?? [];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const l = all.filter((m) => !q || `${m.name} ${m.description}`.toLowerCase().includes(q));
    return l.sort((a, b) => (sort === 'nome' ? a.name.localeCompare(b.name, 'pt-BR') : sort === 'fichas' ? b.nodes - a.nodes : b.updatedAt - a.updatedAt));
  }, [all, sort, query]);
  const sel = list.find((m) => m.id === selId) ?? list[0] ?? null;
  const recent = [...all].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const total = (k: 'nodes' | 'characters' | 'enemies') => all.reduce((n, m) => n + (m[k] || 0), 0);
  const maxNodes = Math.max(1, ...all.map((m) => m.nodes));
  const counts = sel?.counts ?? {};
  const tiles: { k: string; label: string; n: number; icon: string }[] = sel ? [
    { k: 'personagem', label: 'Personagens', n: counts.personagem ?? 0, icon: 'detetive' },
    { k: 'npc', label: 'NPCs', n: counts.npc ?? 0, icon: 'pessoa' },
    { k: 'inimigo', label: 'Inimigos', n: counts.inimigo ?? 0, icon: 'garra' },
    { k: 'local', label: 'Locais', n: counts.local ?? 0, icon: 'mapa' },
    { k: 'nota', label: 'Notas', n: (counts.nota ?? 0) + (counts.sessao ?? 0), icon: 'pergaminho' },
    { k: 'faccao', label: 'Facções e itens', n: (counts.faccao ?? 0) + (counts.item ?? 0), icon: 'sigilo' },
  ] : [];

  return (
    <div className="plan-dash">
      <div className="home-head pd-head">
        <h1>Campanhas</h1>
        <button className="btn primary big" onClick={() => setDialog({ meta: null })}><Plus size={17} /> Nova campanha</button>
      </div>

      {items && !items.length ? (
        <div className="empty-state home-empty">
          <GameIcon id="mapa" size={44} />
          <h3>Nenhuma campanha ainda</h3>
          <p>Um quadro livre para cada campanha: personagens, inimigos, locais, ganchos e anotações ligados entre si. Tudo fica neste computador.</p>
          <button className="btn primary" onClick={() => setDialog({ meta: null })}><Plus size={15} /> Nova campanha</button>
        </div>
      ) : (<>
        <div className="pd-top">
          <section className="pd-box pd-metrics">
            {([['Campanhas', all.length, 'nodes'], ['Fichas no total', total('nodes'), 'nodes'], ['Personagens e inimigos', total('characters') + total('enemies'), 'characters']] as const).map(([label, n], i) => (
              <div key={label} className="pd-metric">
                <span className="pd-label">{label}</span>
                <b className="pd-big">{n}</b>
                <div className="pd-bars">
                  {i === 0 ? all.slice(0, 8).map((m) => <i key={m.id} className="on" style={{ flex: 1 }} title={m.name} />)
                    : i === 1 ? all.slice(0, 4).map((m) => <i key={m.id} className={m.nodes ? 'on' : ''} style={{ flex: Math.max(.15, m.nodes / maxNodes) }} title={`${m.name}: ${m.nodes}`} />)
                    : all.slice(0, 4).map((m) => <i key={m.id} className={m.characters + m.enemies ? 'on' : ''} style={{ flex: Math.max(.15, (m.characters + m.enemies) / Math.max(1, total('characters') + total('enemies'))) }} />)}
                </div>
                <div className="pd-faces">
                  {i === 2 ? all.flatMap((m) => (m.faces ?? []).map((f) => ({ f, id: m.id }))).slice(0, 6).map(({ f, id }, j) => <Face key={j} f={f} planId={id} />)
                    : i === 0 ? all.slice(0, 5).map((m) => <Thumb key={m.id} m={m} size={30} />)
                    : <span className="muted small">{all.reduce((n, m) => n + (m.links ?? 0), 0)} ligação(ões) entre fichas</span>}
                </div>
              </div>
            ))}
          </section>
          <section className="pd-box pd-recent">
            <div className="pd-recent-head"><span className="pd-label">Abertas por último</span></div>
            <b className="pd-big">{recent[0]?.name ?? '—'}</b>
            <div className="pd-recent-tiles">
              {recent.map((m, i) => (
                <button key={m.id} className={`pd-rtile${i === 0 ? ' on' : ''}`} onClick={() => { void openPlan(m.id); }} title={`Abrir ${m.name}`}>
                  <small>{ago(m.updatedAt)}</small>
                  <span>{m.name}</span>
                </button>
              ))}
              {recent[0] && <button className="pd-pill-btn" onClick={() => { void openPlan(recent[0].id); }}>Continuar</button>}
            </div>
          </section>
        </div>

        <div className="pd-filters">
          <span className="pd-filters-label">Ordenar</span>
          <div className="pd-pills">
            {SORTS.map((o) => <button key={o.id} className={sort === o.id ? 'on' : ''} onClick={() => setSort(o.id)}>{o.label}{o.id === 'recentes' && <i>{all.length}</i>}</button>)}
          </div>
          <span className="grow" />
          <label className="pd-search"><Search size={14} /><input value={query} placeholder="Buscar campanha" onChange={(e) => setQuery(e.target.value)} /></label>
        </div>

        <section className="pd-panel">
          <div className="pd-list">
            <h3>Suas campanhas</h3>
            {list.map((m) => (
              <div key={m.id} className={`pd-row${sel?.id === m.id ? ' on' : ''}`} role="button" tabIndex={0}
                onClick={() => setSelId(m.id)} onDoubleClick={() => { void openPlan(m.id); }} onKeyDown={(e) => { if (e.key === 'Enter') void openPlan(m.id); }}>
                <Thumb m={m} />
                <span className="pd-row-name"><strong title={m.name}>{m.name}</strong><small>{ago(m.updatedAt)}</small></span>
                <span className="pd-chip">{m.nodes} ficha{m.nodes === 1 ? '' : 's'}</span>
                <span className="pd-row-n">{m.characters + m.enemies}<small> pers.</small></span>
              </div>
            ))}
            {!list.length && <p className="muted small" style={{ padding: 12 }}>Nenhuma campanha com esse nome.</p>}
          </div>
          {sel && (
            <div className="pd-detail" style={{ '--pc': sel.color } as CSSProperties}>
              <div className="pd-detail-top">
                <div className="pd-detail-name">
                  <span className="pd-label">Campanha</span>
                  <h2><GameIcon id={sel.icon} size={22} /> {sel.name}</h2>
                  <span className="pd-chip dark">{ago(sel.updatedAt)}</span>
                </div>
                <div className="pd-cover">
                  {sel.cover ? <img src={planFileUrl(sel.id, sel.cover)} alt="" /> : <GameIcon id={sel.icon} size={44} />}
                </div>
              </div>
              <p className="pd-desc">{sel.description || 'Sem descrição.'}</p>
              <div className="pd-tiles">
                {tiles.map((t) => (
                  <div key={t.k} className="pd-tile"><span><GameIcon id={t.icon} size={14} /> <b>{t.n}</b></span><small>{t.label}</small></div>
                ))}
              </div>
              <div className="pd-faces big">{(sel.faces ?? []).map((f, j) => <Face key={j} f={f} planId={sel.id} size={34} />)}{!(sel.faces ?? []).length && <span className="muted small">Nenhum personagem no quadro ainda.</span>}</div>
              <div className="pd-detail-foot">
                <span><small>Fichas</small><b>{sel.nodes}</b></span>
                <span><small>Ligações</small><b>{sel.links ?? 0}</b></span>
                <span><small>Criada em</small><b>{fmtDate(sel.createdAt).slice(0, 10)}</b></span>
                <span className="grow" />
                <button className="pd-round" title="Editar capa" onClick={() => setDialog({ meta: sel })}><Pencil size={15} /></button>
                <button className="pd-round" title="Abrir pasta" onClick={() => { void api.planOpenFolder(sel.id); }}><FolderOpen size={15} /></button>
                <button className="pd-round danger" title="Excluir" onClick={() => { void remove(sel); }}><Trash2 size={15} /></button>
                <button className="pd-pill-btn lime" onClick={() => { void openPlan(sel.id); }}>Abrir quadro</button>
              </div>
            </div>
          )}
        </section>
      </>)}
      {dialog && <PlanDialog meta={dialog.meta} onClose={() => { setDialog(null); void refresh(); }} onSaved={(m) => { setDialog(null); void refresh(); if (!dialog.meta) void openPlan(m.id); }} />}
    </div>
  );
}
