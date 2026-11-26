/*
 * Cartas de personagem, NPC e criatura no quadro do Planejador: tons sóbrios e cinzentos, um filete de cor por tipo e
 * ícones em cada número, atributo e capacidade. O chefe vira uma carta larga (o espaço de duas cartas) com arte maior.
 */
import { memo, type CSSProperties } from 'react';
import { Swords } from 'lucide-react';
import { GameIcon } from '../game/icons';
import type { ActorList, PlanNode } from '../game/types';
import { tagline, type RuleSystem } from '../game/system';
import { nodeActor } from './model';
import { statIcon } from './statIcons';

/** Filete de cada tipo (discreto). */
const ACCENT: Record<string, string> = { personagem: '#c9b48a', npc: '#9fb39a', inimigo: '#b98a8a', boss: '#a4b0c4' };

function Chip({ icon, value, title, big }: { icon: string; value: string | number; title: string; big?: boolean }) {
  return <span className={`bc-chip${big ? ' big' : ''}`} title={title}><GameIcon id={icon} size={16} /><b>{value}</b></span>;
}

function Rows({ list, fallback }: { list: ActorList['items']; fallback: string }) {
  return (
    <div className="bc-rows">
      {list.map((a, i) => <span key={i} title={a.k}><GameIcon id={a.icon || statIcon(a.k, fallback)} size={12} /><em>{a.k}</em><b>{a.v || '—'}</b></span>)}
    </div>
  );
}

export const BoardCard = memo(function BoardCard({ n, width, imgUrl, sys }: { n: PlanNode; width: number; imgUrl: (f: string) => string; sys: RuleSystem }) {
  const a = nodeActor(n, sys);
  const s = n.sheet;
  const enemy = n.type === 'inimigo';
  const wide = enemy && a.boss;
  const accent = wide ? ACCENT.boss : ACCENT[n.type] ?? ACCENT.personagem;
  const shown = a.stats.filter((x) => x.card && x.kind !== 'texto');
  const life = shown.find((x) => x.role === 'vida');
  const others = shown.filter((x) => x !== life);
  const lists = a.lists.filter((l) => l.card).map((l) => ({ ...l, items: l.items.filter((x) => x.k) })).filter((l) => l.items.length).slice(0, 2);
  const acts = (s?.actions ?? []).filter((x) => x.name).slice(0, enemy ? (a.boss ? 4 : 2) : 6);
  const inst = s?.cards.find((c) => c.type === 'item' && c.equipped && c.roll) ?? s?.cards.find((c) => c.type === 'item' && c.roll);
  const sub = n.subtitle || tagline(a.stats) || a.kindLabel;
  const art = n.image ? <img src={imgUrl(n.image)} alt="" draggable={false} /> : <span className="bc-emblem"><GameIcon id={n.icon || (enemy ? 'garra' : 'pessoa')} size={80} /></span>;
  const mainDmg = acts.find((x) => x.dmg)?.dmg ?? '—';
  const k = width / (wide ? 460 : 220);
  const style = { '--k': k, '--ac': accent } as CSSProperties;
  const lifeChip = <Chip icon={life?.icon ?? 'sangue'} value={life?.value ?? a.hp} title={life?.name ?? 'Vida'} big />;

  if (wide) {
    return (
      <div className="board-card wide" style={style}>
        <div className="bc-art">
          {art}
          <span className="bc-ribbon"><GameIcon id="coroa" size={13} /> {sys.labels.chefe}</span>
        </div>
        <div className="bc-side">
          <div className="bc-head"><strong>{n.title || sys.labels.chefe}</strong><small>{n.subtitle || sys.labels.inimigo}</small></div>
          <div className="bc-stats">
            {lifeChip}
            {others.slice(0, 2).map((x) => <Chip key={x.id} icon={x.icon} value={x.value || '—'} title={x.name} />)}
            <Chip icon="faca" value={mainDmg} title={sys.labels.dano} />
          </div>
          <div className="bc-sec"><Swords size={12} /> {sys.labels.habilidades}</div>
          <ul className="bc-acts">
            {acts.map((x, i) => <li key={i}><GameIcon id={statIcon(x.name, i % 2 ? 'presas' : 'garra')} size={13} /><span>{x.name}</span><b>{x.dmg || '—'}</b></li>)}
            {!acts.length && <li className="none"><span>Sem {sys.labels.habilidades.toLowerCase()}</span></li>}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`board-card t-${n.type}${!enemy && lists.length > 1 ? ' full' : ''}`} style={style}>
      <div className="bc-art">
        {art}
        <div className="bc-corner l">
          {lifeChip}
          {others.slice(0, 1).map((x) => <Chip key={x.id} icon={x.icon} value={x.value || '—'} title={x.name} />)}
        </div>
        <div className="bc-corner r">
          {enemy ? <Chip icon="faca" value={mainDmg} title={sys.labels.dano} /> : others.slice(1, 3).map((x) => <Chip key={x.id} icon={x.icon} value={x.value || '—'} title={x.name} />)}
        </div>
      </div>
      <div className="bc-body">
        <div className="bc-head"><strong>{n.title || a.kindLabel}</strong><small>{sub}</small></div>
        {enemy ? (<>
          <div className="bc-sec"><Swords size={11} /> {sys.labels.habilidades}</div>
          <ul className="bc-acts">
            {acts.map((x, i) => <li key={i}><GameIcon id={statIcon(x.name, 'garra')} size={12} /><span>{x.name}</span><b>{x.dmg || '—'}</b></li>)}
            {!acts.length && <li className="none"><span>Sem {sys.labels.habilidades.toLowerCase()}</span></li>}
          </ul>
        </>) : (<>
          {lists.map((l, i) => <div key={l.id} className="bc-list"><div className="bc-sec"><GameIcon id={l.icon} size={11} /> {l.name}</div><Rows list={l.items.slice(0, i ? 8 : 6)} fallback={i ? 'dado' : 'estrela'} /></div>)}
          {!lists.length && <p className="bc-none">Sem {(sys.lists[0]?.name ?? 'atributos').toLowerCase()} ainda</p>}
        </>)}
        <div className="bc-foot">
          {inst ? <span title={typeOfLabel(sys)}><GameIcon id={inst.icon || 'revolver'} size={12} /><em>{inst.name}</em><b>{inst.roll}</b></span>
            : <span><GameIcon id={n.icon || 'pessoa'} size={12} /><em>{a.kindLabel}</em></span>}
        </div>
      </div>
    </div>
  );
});

const typeOfLabel = (sys: RuleSystem) => sys.cardTypes.item.label;
