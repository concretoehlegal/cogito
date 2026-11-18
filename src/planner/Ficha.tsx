/*
 * Ficha completa de um personagem, NPC ou inimigo, aberta com dois cliques na carta do quadro.
 * Estilo "neo-brutalista": blocos de cor chapada, bordas grossas, sombra dura e títulos em fonte monoespaçada.
 */
import { useEffect, type CSSProperties } from 'react';
import { ArrowLeft, Crosshair, Pencil, X } from 'lucide-react';
import { GameIcon } from '../game/icons';
import { RARITIES, cardPair, typeOf } from '../game/Cards';
import type { PlanNode } from '../game/types';
import { tagline, type RuleSystem } from '../game/system';
import { useHunt } from '../hunt/state';
import { useApp } from '../store';
import { nodeActor } from './model';
import { flushPlan, planFileUrl } from './state';


/** Leva a ficha para o Bestiário (inimigo vira presa; personagem vira caçador). */
export function startHunt(planId: string, n: PlanNode) {
  const hs = useHunt.getState();
  if (n.type === 'inimigo') useHunt.setState({ planId, prey: hs.planId === planId ? { ...hs.prey, [n.id]: (hs.prey[n.id] ?? 0) + 1 } : { [n.id]: 1 }, heroId: hs.planId === planId ? hs.heroId : null });
  else useHunt.setState({ planId, heroId: n.id, prey: hs.planId === planId ? hs.prey : {} });
  void flushPlan().then(() => useApp.setState({ screen: 'home', homeTab: 'bestiario' }));
}

const plain = (md: string) => md.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1').replace(/[*_`>#]/g, '').replace(/^\s*[-•]\s+/gm, '· ').trim();

export function Ficha({ n, planId, sys, onClose, onEdit }: { n: PlanNode; planId: string; sys: RuleSystem; onClose: () => void; onEdit: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  const sh = n.sheet;
  const a = nodeActor(n, sys);
  const enemy = n.type === 'inimigo';
  const boss = a.boss;
  const kind = a.kindLabel;
  const actions = (sh?.actions ?? []).slice(0, enemy ? (boss ? 4 : 2) : 12);
  const mainDmg = actions.find((x) => x.dmg)?.dmg ?? '—';
  const stats: [string, string, string, string][] = [
    ...a.stats.filter((x) => x.kind !== 'texto').map((x) => [x.id, x.kind === 'barra' ? `${x.value}/${x.value}` : x.value || '—', x.name, x.icon] as [string, string, string, string]),
    ...(enemy ? [['dano', mainDmg, sys.labels.dano, 'faca'] as [string, string, string, string]] : []),
  ];
  const ident: [string, string][] = a.stats.filter((x) => x.kind === 'texto' && x.value.trim()).map((x) => [x.name, x.value]);
  const lists = a.lists.filter((l) => l.items.some((x) => x.k));
  const story = plain(n.body || '');
  return (
    <div className="fi-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ficha" role="dialog" aria-label={`Ficha de ${n.title}`}>
        <header className="fi-top">
          <button className="fi-sq" title="Voltar ao quadro" onClick={onClose}><ArrowLeft size={18} /></button>
          <span className="fi-crumb">{kind}</span>
          <span className="grow" />
          <button className="fi-sq" title="Fechar (Esc)" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="fi-cols">
          <section className="fi-main">
            <h1 className="fi-h">Ficha · {kind}</h1>
            <div className="fi-hero">
              <div className="fi-photo">
                {n.image ? <img src={planFileUrl(planId, n.image)} alt="" /> : <GameIcon id={n.icon || (enemy ? 'garra' : 'pessoa')} size={120} />}
              </div>
              <div className="fi-info">
                <div className="fi-name-row">
                  <div>
                    <h2>{n.title || kind}</h2>
                    <small>{n.subtitle || tagline(a.stats) || kind}</small>
                  </div>
                  <div className="fi-tags">{[kind, ...n.tags.slice(0, 2)].map((t) => <span key={t}>{t}</span>)}</div>
                </div>
                {ident.length > 0 && <dl className="fi-ident">{ident.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
                <div className={`fi-stats${stats.length > 4 ? ' six' : ''}`}>
                  {stats.map(([id, v, label, icon]) => <div key={id}><b><GameIcon id={icon} size={16} /> {v}</b><small>{label}</small></div>)}
                </div>
                <p className="fi-story">{story || 'Sem história ainda. Escreva no painel do quadro.'}</p>
                <div className="fi-actions">
                  <button className="fi-btn dark" onClick={() => startHunt(planId, n)}><Crosshair size={16} /> {enemy ? 'Enfrentar no Bestiário' : 'Caçar com esta ficha'}</button>
                  <button className="fi-btn" onClick={onEdit}><Pencil size={15} /> Editar ficha</button>
                </div>
              </div>
            </div>

            <div className="fi-sub-head"><h1 className="fi-h">{enemy ? sys.labels.habilidades : `${sys.labels.ataques}${lists.length ? ` e ${lists.map((l) => l.name.toLowerCase()).join(', ')}` : ''}`}</h1><span className="fi-count">{actions.length} {actions.length === 1 ? 'ação' : 'ações'}</span></div>
            <div className="fi-row">
              {lists.map((l) => (
                <div key={l.id} className="fi-attrs">
                  <div className="fi-attrs-head"><GameIcon id={l.icon} size={18} /> <b>{l.name}</b></div>
                  <div className="fi-attrs-list">
                    {l.items.filter((x) => x.k).map((x, i) => <span key={i}><em>{x.icon && <GameIcon id={x.icon} size={12} />} {x.k}</em><b>{x.v || '—'}</b></span>)}
                  </div>
                </div>
              ))}
              {actions.map((x, i) => (
                <div key={i} className="fi-act">
                  <div className="fi-act-head"><b>{x.name || 'Ação'}</b><span><GameIcon id="faca" size={13} /> {x.dmg || '—'}</span></div>
                  <small>{x.hit ? `${sys.labels.acerto} ${x.hit}` : 'Sem rolagem de acerto'}</small>
                  <p>{x.dmg ? `Causa ${x.dmg} de ${sys.labels.dano.toLowerCase()} quando acerta.` : 'Ação sem dano direto.'}</p>
                </div>
              ))}
              {!actions.length && <div className="fi-act empty"><b>Nenhuma ação</b><p>Adicione ações no painel do quadro.</p></div>}
            </div>
          </section>

          {!enemy && (
            <aside className="fi-side">
              <h1 className="fi-h small">Cartas</h1>
              <div className="fi-cards">
                {(sh?.cards ?? []).map((c) => (
                  <div key={c.id} className="fi-card">
                    <span className="fi-card-icon" style={{ '--tc': cardPair(c).light, '--td': cardPair(c).dark } as CSSProperties}><GameIcon id={c.icon || typeOf(c.type).icon} size={18} /></span>
                    <div>
                      <b>{c.name}</b>
                      <small>{typeOf(c.type).label} · {RARITIES.find((r) => r.id === c.rarity)?.label ?? 'Comum'}{c.equipped ? ' · equipado' : ''}</small>
                      <small>{[c.roll && `${c.roll}`, c.cost, c.cooldown && `recarga ${c.cooldown}`].filter(Boolean).join(' · ') || (c.mode === 'passivo' ? 'Passiva' : '—')}</small>
                    </div>
                  </div>
                ))}
                {!(sh?.cards ?? []).length && <div className="fi-card empty"><small>Nenhuma carta. Armas, itens e feitiços aparecem aqui.</small></div>}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
