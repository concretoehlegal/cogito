/*
 * Cartas de personagem, NPC e criatura no quadro do Planejador: tons sóbrios e cinzentos, um filete de cor por tipo e
 * ícones em cada número, atributo e capacidade. O chefe vira uma carta larga (o espaço de duas cartas) com arte maior.
 * (O Bestiário continua usando as cartas coloridas de src/game/CharCard.tsx.)
 */
import { memo, type CSSProperties } from 'react';
import { ChartColumn, Settings as Gear, Swords } from 'lucide-react';
import { GameIcon } from '../game/icons';
import type { PlanNode } from '../game/types';
import { defaultSheet } from './model';
import { statIcon } from './statIcons';

/** Filete de cada tipo (discreto). */
const ACCENT: Record<string, string> = { personagem: '#c9b48a', npc: '#9fb39a', inimigo: '#b98a8a', boss: '#a4b0c4' };
const KIND: Record<string, string> = { personagem: 'Personagem', npc: 'NPC', inimigo: 'Criatura' };

function Chip({ icon, value, title, big }: { icon: string; value: string | number; title: string; big?: boolean }) {
  return <span className={`bc-chip${big ? ' big' : ''}`} title={title}><GameIcon id={icon} size={16} /><b>{value}</b></span>;
}

function Rows({ list, fallback }: { list: { k: string; v: string }[]; fallback: string }) {
  return (
    <div className="bc-rows">
      {list.map((a, i) => <span key={i} title={a.k}><GameIcon id={statIcon(a.k, fallback)} size={12} /><em>{a.k}</em><b>{a.v || '—'}</b></span>)}
    </div>
  );
}

export const BoardCard = memo(function BoardCard({ n, width, imgUrl }: { n: PlanNode; width: number; imgUrl: (f: string) => string }) {
  const s = n.sheet ?? defaultSheet(n.type);
  const enemy = n.type === 'inimigo';
  const wide = enemy && s.boss;
  const accent = wide ? ACCENT.boss : ACCENT[n.type] ?? ACCENT.personagem;
  const attrs = (s.attrs ?? []).filter((a) => a.k);
  const caps = (s.caps ?? []).filter((a) => a.k);
  const acts = (s.actions ?? []).filter((a) => a.name).slice(0, enemy ? (s.boss ? 4 : 2) : 6);
  const inst = s.cards.find((c) => c.type === 'item' && c.equipped && c.roll) ?? s.cards.find((c) => c.type === 'item' && c.roll);
  const sub = n.subtitle || s.cliche || (wide ? 'Chefe' : KIND[n.type]);
  const art = n.image ? <img src={imgUrl(n.image)} alt="" draggable={false} /> : <span className="bc-emblem"><GameIcon id={n.icon || (enemy ? 'garra' : 'pessoa')} size={80} /></span>;
  const mainDmg = acts.find((a) => a.dmg)?.dmg ?? '—';
  const k = width / (wide ? 460 : 220);
  const style = { '--k': k, '--ac': accent } as CSSProperties;

  if (wide) {
    return (
      <div className="board-card wide" style={style}>
        <div className="bc-art">
          {art}
          <span className="bc-ribbon"><GameIcon id="coroa" size={13} /> Chefe</span>
        </div>
        <div className="bc-side">
          <div className="bc-head"><strong>{n.title || 'Chefe'}</strong><small>{n.subtitle || 'Criatura'}</small></div>
          <div className="bc-stats">
            <Chip icon="sangue" value={s.life} title="Vida" big />
            <Chip icon="resiliencia" value={s.resilience} title="Resiliência" />
            <Chip icon="alvo" value={s.defense} title="Defesa" />
            <Chip icon="faca" value={mainDmg} title="Dano" />
          </div>
          <div className="bc-sec"><Swords size={12} /> Habilidades</div>
          <ul className="bc-acts">
            {acts.map((a, i) => <li key={i}><GameIcon id={statIcon(a.name, i % 2 ? 'presas' : 'garra')} size={13} /><span>{a.name}</span><b>{a.dmg || '—'}</b></li>)}
            {!acts.length && <li className="none"><span>Sem habilidades</span></li>}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`board-card t-${n.type}${!enemy && attrs.length > 0 && caps.length > 0 ? ' full' : ''}`} style={style}>
      <div className="bc-art">
        {art}
        <div className="bc-corner l">
          <Chip icon="sangue" value={s.life} title={enemy ? 'Vida' : 'Vitalidade (PV)'} big />
          <Chip icon="resiliencia" value={s.resilience} title="Resiliência" />
        </div>
        <div className="bc-corner r">
          {enemy ? <Chip icon="faca" value={mainDmg} title="Dano" /> : <>
            <Chip icon="alvo" value={s.defense} title="Defesa" />
            <Chip icon="fantasma" value={s.soul} title="Alma" />
          </>}
        </div>
      </div>
      <div className="bc-body">
        <div className="bc-head"><strong>{n.title || KIND[n.type]}</strong><small>{sub}</small></div>
        {enemy ? (<>
          <div className="bc-sec"><Swords size={11} /> Habilidades</div>
          <ul className="bc-acts">
            {acts.map((a, i) => <li key={i}><GameIcon id={statIcon(a.name, 'garra')} size={12} /><span>{a.name}</span><b>{a.dmg || '—'}</b></li>)}
            {!acts.length && <li className="none"><span>Sem habilidades</span></li>}
          </ul>
        </>) : (<>
          {attrs.length > 0 && <><div className="bc-sec"><ChartColumn size={11} /> Atributos</div><Rows list={attrs.slice(0, 6)} fallback="estrela" /></>}
          {caps.length > 0 && <><div className="bc-sec"><Gear size={11} /> Capacidades</div><Rows list={caps.slice(0, 8)} fallback="dado" /></>}
          {!attrs.length && !caps.length && <p className="bc-none">Sem atributos ainda</p>}
        </>)}
        <div className="bc-foot">
          {inst ? <span title="Instrumento"><GameIcon id={inst.icon || 'revolver'} size={12} /><em>{inst.name}</em><b>{inst.roll}</b></span>
            : <span><GameIcon id={n.icon || 'pessoa'} size={12} /><em>{KIND[n.type]}</em></span>}
        </div>
      </div>
    </div>
  );
});
