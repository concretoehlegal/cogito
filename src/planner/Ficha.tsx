/*
 * Ficha completa de um personagem, NPC ou inimigo, aberta com dois cliques na carta do quadro.
 * Estilo "neo-brutalista": blocos de cor chapada, bordas grossas, sombra dura e títulos em fonte monoespaçada.
 */
import { useEffect, type CSSProperties } from 'react';
import { ArrowLeft, Crosshair, Pencil, X } from 'lucide-react';
import { GameIcon } from '../game/icons';
import { RARITIES, cardPair, typeOf } from '../game/Cards';
import type { PlanNode } from '../game/types';
import { useHunt } from '../hunt/state';
import { useApp } from '../store';
import { TYPES } from './model';
import { flushPlan, planFileUrl } from './state';


/** Leva a ficha para o Bestiário (inimigo vira presa; personagem vira caçador). */
export function startHunt(planId: string, n: PlanNode) {
  const hs = useHunt.getState();
  if (n.type === 'inimigo') useHunt.setState({ planId, prey: hs.planId === planId ? { ...hs.prey, [n.id]: (hs.prey[n.id] ?? 0) + 1 } : { [n.id]: 1 }, heroId: hs.planId === planId ? hs.heroId : null });
  else useHunt.setState({ planId, heroId: n.id, prey: hs.planId === planId ? hs.prey : {} });
  void flushPlan().then(() => useApp.setState({ screen: 'home', homeTab: 'bestiario' }));
}

const plain = (md: string) => md.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1').replace(/[*_`>#]/g, '').replace(/^\s*[-•]\s+/gm, '· ').trim();

export function Ficha({ n, planId, onClose, onEdit }: { n: PlanNode; planId: string; onClose: () => void; onEdit: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  const sh = n.sheet;
  const enemy = n.type === 'inimigo';
  const boss = enemy && !!sh?.boss;
  const kind = enemy ? (boss ? 'Chefe' : 'Criatura') : TYPES[n.type].label;
  const actions = (sh?.actions ?? []).slice(0, enemy ? (boss ? 4 : 2) : 12);
  const mainDmg = actions.find((a) => a.dmg)?.dmg ?? '—';
  const stats: [string, string | number, string][] = enemy
    ? [['vida', sh?.life ?? 0, 'Vida'], ['resiliência', sh?.resilience ?? 0, 'Resiliência'], ['defesa', sh?.defense ?? 0, 'Defesa'], ['dano', mainDmg, 'Dano']]
    : [['vida', sh?.life ?? 0, 'Vida'], ['resiliência', sh?.resilience ?? 0, 'Resiliência'], ['defesa', sh?.defense ?? 0, 'Defesa'], ['alma', sh?.soul ?? 0, 'Pontos de alma']];
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
            <h1 className="fi-h">{enemy ? 'Ficha da criatura' : 'Ficha do personagem'}</h1>
            <div className="fi-hero">
              <div className="fi-photo">
                {n.image ? <img src={planFileUrl(planId, n.image)} alt="" /> : <GameIcon id={n.icon || (enemy ? 'garra' : 'pessoa')} size={120} />}
              </div>
              <div className="fi-info">
                <div className="fi-name-row">
                  <div>
                    <h2>{n.title || TYPES[n.type].label}</h2>
                    <small>{n.subtitle || kind}</small>
                  </div>
                  <div className="fi-tags">{[kind, ...n.tags.slice(0, 2)].map((t) => <span key={t}>{t}</span>)}</div>
                </div>
                <div className="fi-stats">
                  {stats.map(([id, v, label]) => <div key={id}><b>{v}</b><small>{label}</small></div>)}
                </div>
                <p className="fi-story">{story || 'Sem história ainda. Escreva no painel do quadro.'}</p>
                <div className="fi-actions">
                  <button className="fi-btn dark" onClick={() => startHunt(planId, n)}><Crosshair size={16} /> {enemy ? 'Enfrentar no Bestiário' : 'Caçar com esta ficha'}</button>
                  <button className="fi-btn" onClick={onEdit}><Pencil size={15} /> Editar ficha</button>
                </div>
              </div>
            </div>

            <div className="fi-sub-head"><h1 className="fi-h">{enemy ? 'Habilidades' : 'Ações e atributos'}</h1><span className="fi-count">{actions.length} {actions.length === 1 ? 'ação' : 'ações'}</span></div>
            <div className="fi-row">
              {!enemy && (
                <div className="fi-attrs">
                  <div className="fi-attrs-head"><GameIcon id="estrela" size={18} /> <b>Atributos</b></div>
                  <div className="fi-attrs-list">
                    {(sh?.attrs ?? []).filter((a) => a.k).map((a, i) => <span key={i}><em>{a.k}</em><b>{a.v || '—'}</b></span>)}
                    {!(sh?.attrs ?? []).some((a) => a.k) && <span className="none">Nenhum atributo</span>}
                  </div>
                </div>
              )}
              {!enemy && (sh?.caps ?? []).some((c) => c.k) && (
                <div className="fi-attrs caps">
                  <div className="fi-attrs-head"><GameIcon id="olho" size={18} /> <b>Capacidades</b></div>
                  <div className="fi-attrs-list">
                    {(sh?.caps ?? []).filter((c) => c.k).map((c, i) => <span key={i}><em>{c.k}</em><b>{c.v || '—'}</b></span>)}
                  </div>
                </div>
              )}
              {actions.map((a, i) => (
                <div key={i} className="fi-act">
                  <div className="fi-act-head"><b>{a.name || 'Ação'}</b><span><GameIcon id="faca" size={13} /> {a.dmg || '—'}</span></div>
                  <small>{a.hit ? `Acerto ${a.hit}` : 'Sem rolagem de acerto'}</small>
                  <p>{a.dmg ? `Causa ${a.dmg} de dano quando acerta.` : 'Ação sem dano direto.'}</p>
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
