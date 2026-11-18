/* Área Bestiário da tela inicial: escolher a campanha, o caçador e as criaturas. */
import { useEffect, useState, type CSSProperties } from 'react';
import { Crosshair, Minus, Plus, Swords } from 'lucide-react';
import { api, errorText } from '../api';
import { toast, useApp } from '../store';
import { CharCard, dataFromActor } from '../game/CharCard';
import { setCardLabels } from '../game/Cards';
import { normalizePlan } from '../game/system';
import { GameIcon } from '../game/icons';
import type { Actor, PlanMeta } from '../game/types';
import { isChar, nodeActor } from '../planner/model';
import { planFileUrl } from '../planner/state';
import { AI, heroActions, newHunt, rulesOf } from './engine';
import { preyList, useHunt } from './state';
import { BackdropPicker } from './BackdropPicker';
import './hunt.css';

const MAX_PREY = 4;

function Portrait({ a, campId }: { a: Actor; campId: string }) {
  return <CharCard d={dataFromActor(a, null)} width={150} imgUrl={(n) => planFileUrl(campId, n)} className="hh-cardart" />;
}

export function HuntHome() {
  const [camps, setCamps] = useState<PlanMeta[] | null>(null);
  const { campaign, heroId, prey, planId } = useHunt();
  useEffect(() => { api.planList().then(setCamps, (e) => { setCamps([]); toast(errorText(e), 'error'); }); }, []);
  /** Lê as fichas da campanha do Planejador. `keep` mantém caçador e criaturas já escolhidos (vindo do quadro). */
  const pick = async (id: string, keep = false) => {
    try {
      const plan = normalizePlan(await api.planLoad(id));
      const sys = plan.system!;
      setCardLabels(sys);
      const c = { id: plan.id, name: plan.name, system: sys, actors: plan.nodes.filter((n) => isChar(n.type)).map((n) => nodeActor(n, sys)) };
      useHunt.setState(keep ? { planId: id, campaign: c } : { planId: id, campaign: c, heroId: null, prey: {} });
    } catch (e) { toast(errorText(e), 'error'); }
  };
  useEffect(() => {
    if (planId && campaign?.id !== planId) void pick(planId, true);
    else if (!planId && camps?.length) void pick(camps[0].id);
    else if (campaign && planId === campaign.id) void pick(planId, true); // atualiza com o que mudou no quadro
  }, [camps]); // eslint-disable-line react-hooks/exhaustive-deps

  const rules = campaign ? rulesOf(campaign.system) : null;
  const showDef = !!campaign && rules?.hit === 'contra-defesa' && campaign.system.stats.some((x) => x.role === 'defesa');
  const hunters = campaign?.actors.filter((a) => a.kind !== 'enemy') ?? [];
  const beasts = campaign?.actors.filter((a) => a.kind === 'enemy') ?? [];
  const total = Object.values(prey).reduce((a, b) => a + b, 0);
  const setPrey = (id: string, d: number) => {
    const n = Math.max(0, (prey[id] ?? 0) + d);
    if (d > 0 && total >= MAX_PREY) { toast(`No máximo ${MAX_PREY} criaturas por confronto.`, 'info'); return; }
    const next = { ...prey, [id]: n }; if (!n) delete next[id];
    useHunt.setState({ prey: next });
  };
  const hero = hunters.find((a) => a.id === heroId) ?? null;
  const start = () => {
    if (!campaign || !hero || !total) return;
    useHunt.setState({ game: newHunt(campaign, hero, preyList(useHunt.getState())) });
    useApp.setState({ screen: 'bestiario' });
  };

  return (
    <div className="hunt-home">
      <div className="hh-head">
        <div>
          <h1 className="hh-title">Bestiário</h1>
          <p className="muted">Escolha o caçador e as criaturas de uma campanha do Planejador e lute em turnos, como num RPG de computador. Diga o que seu personagem faz e o Bestiário interpreta com as armas, itens e habilidades dele. As fichas do quadro não mudam.</p>
        </div>
        <label className="field hh-camp"><span>Campanha</span>
          <select value={campaign?.id ?? ''} onChange={(e) => { void pick(e.target.value); }}>
            {!camps?.length && <option value="">(nenhuma campanha)</option>}
            {camps?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      {camps && !camps.length && <div className="empty-state home-empty"><Crosshair size={40} strokeWidth={1.2} /><h3>Nenhuma campanha ainda</h3><p>Crie personagens e inimigos no quadro de uma campanha (área Planejador) para enfrentá-los aqui.</p></div>}

      {campaign && (
        <>
          <h2 className="hh-step"><span>1</span> Caçador</h2>
          <div className="hh-grid">
            {hunters.map((a) => {
              const acts = heroActions(a);
              return (
                <button key={a.id} className={`hh-card${heroId === a.id ? ' on' : ''}`} style={{ '--tc': a.color } as CSSProperties} onClick={() => useHunt.setState({ heroId: a.id })}>
                  <Portrait a={a} campId={campaign.id} />
                  <strong>{a.name}</strong>
                  <small>{a.subtitle || a.kindLabel}</small>
                  <span className="hh-stats"><b>{a.hp}</b> {rules?.hpShort}{showDef && <> · <b>{a.defense}</b> {rules?.defShort}</>} · <b>{acts.length}</b> ações</span>
                  <span className="hh-acts">{acts.slice(0, 7).map((x) => <GameIcon key={x.id} id={x.icon} size={16} title={x.name} />)}</span>
                </button>
              );
            })}
            {!hunters.length && <p className="panel-empty">Esta campanha ainda não tem personagens.</p>}
          </div>

          <h2 className="hh-step"><span>2</span> Criaturas <small className="muted">({total}/{MAX_PREY})</small></h2>
          <div className="hh-grid">
            {beasts.map((a) => {
              const n = prey[a.id] ?? 0;
              return (
                <div key={a.id} className={`hh-card prey${n ? ' on' : ''}`} style={{ '--tc': a.color } as CSSProperties}>
                  <Portrait a={a} campId={campaign.id} />
                  <strong>{a.name}{a.boss && <em className="hh-boss">{campaign.system.labels.chefe}</em>}</strong>
                  <small>{a.actions.map((x) => x.name).join(' · ') || 'Ataque'}</small>
                  <span className="hh-stats"><b>{a.hp}</b> {rules?.hpShort}{showDef && <> · <b>{a.defense}</b> {rules?.defShort}</>}</span>
                  <span className="hh-ai" title="Comportamento da IA">IA: {(AI[a.ai ?? 'agressiva'] ?? AI.agressiva).name}</span>
                  <span className="hh-count">
                    <button className="icon-btn" onClick={() => setPrey(a.id, -1)} disabled={!n} aria-label="Menos"><Minus size={15} /></button>
                    <b>{n}</b>
                    <button className="icon-btn" onClick={() => setPrey(a.id, 1)} aria-label="Mais"><Plus size={15} /></button>
                  </span>
                </div>
              );
            })}
            {!beasts.length && <p className="panel-empty">Esta campanha ainda não tem inimigos.</p>}
          </div>

          <h2 className="hh-step"><span>3</span> Fundo da mesa</h2>
          <BackdropPicker />

          <div className="hh-go">
            <button className="btn primary big" disabled={!hero || !total} onClick={start}><Swords size={17} /> Começar o confronto</button>
            <span className="muted">{!hero ? 'Escolha um caçador.' : !total ? 'Escolha ao menos uma criatura.' : `${hero.name} contra ${total} criatura(s).`}</span>
          </div>
        </>
      )}
    </div>
  );
}
