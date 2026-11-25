/*
 * Tela do Bestiário (Caçada): a mesa de um investigador ao fundo, com as criaturas sobre ela, e a HUD do jogador por cima.
 * - Esquerda: painel da ficha com Habilidades de Origem, Habilidades, Itens, Atributos e Capacidades (o que pode ser
 *   usado mostra a tecla 1–9 e é clicável). Acima dele, Sair, rodada, de quem é a vez e Recuar.
 * - Topo, no meio: o inimigo na mira (retrato, PV e PA). Topo, à direita: nome e subtítulo do caçador, Defesa e Ações.
 * - Embaixo: atalhos numerados; "O que você faz?" com o Histórico de Ações logo abaixo; à direita, PV e PA do caçador
 *   e o cartão do Instrumento (a arma em mãos).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Footprints, Image as ImageIcon, CornerDownLeft, Flag, Flame, Heart, Layers, MessageSquareMore, RotateCcw, Shield, Star, Swords, Zap } from 'lucide-react';
import { playClick, playCrit, playDice, playFumble } from '../lib/sound';
import { useApp } from '../store';
import { GameCard, cardPair, typeOf } from '../game/Cards';
import { CharCard, dataFromActor, type CharData } from '../game/CharCard';
import type { Actor, Card } from '../game/types';
import { tagline } from '../game/system';
import { GameIcon } from '../game/icons';
import type { CardPair } from '../game/palette';
import { canUse, enemyTurns, flee, heroAct, newHunt, type Combatant, type HuntAction, type HuntState, type LogLine } from './engine';
import { interpret } from './interpret';
import { preyList, useHunt } from './state';
import { Backdrop } from './Desk';
import { BackdropPicker, huntBgUrl } from './BackdropPicker';
import './hunt.css';

const STEP_MS = 900;
const fileUrl = (campId: string, name: string) => `cogito://app/__plan/${campId}/${encodeURIComponent(name)}`;

function Bar({ cur, max, color, label, big }: { cur: number; max: number; color: string; label?: string; big?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return (
    <div className={`hb-bar${big ? ' big' : ''}`} style={{ '--bc': color } as CSSProperties} title={label ? `${label}: ${cur}/${max}` : undefined}>
      <i style={{ width: `${pct * 100}%` }} />
      <b>{cur} / {max}{label ? ` ${label}` : ''}</b>
    </div>
  );
}

/** Barra fina com o número ao lado (inimigo no topo). */
function SlimBar({ cur, max, color, label }: { cur: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return (
    <div className="slim-bar" title={`${label}: ${cur}/${max}`}>
      <span className="sb-track"><i style={{ width: `${pct * 100}%`, background: color }} /></span>
      <b>{cur} / {max} {label}</b>
    </div>
  );
}

interface Pop { id: number; target: string; text: string; kind: 'hurt' | 'heal' | 'miss' | 'crit' }

function EnemyView({ e, actor, width, imgUrl, target, hit, acting, onPick, pops, tilt = 0 }: {
  e: Combatant; actor: Actor | undefined; width: number; imgUrl: (n: string) => string;
  target: boolean; hit: boolean; acting: boolean; onPick: () => void; pops: Pop[]; tilt?: number;
}) {
  const down = e.hp <= 0;
  const data: CharData | null = actor ? { ...dataFromActor(actor, { cur: e.hp, max: e.max }, down), name: e.name } : null;
  return (
    <button
      className={`hunt-enemy${target ? ' target' : ''}${hit ? ' hit' : ''}${acting ? ' acting' : ''}${down ? ' down' : ''}${e.boss ? ' boss' : ''}`}
      style={{ '--tc': down ? '#8a8a8a' : e.color, '--tilt': `${tilt}deg` } as CSSProperties} onClick={onPick} disabled={down} data-silent
      title={down ? `${e.name} caiu` : `Mirar em ${e.name} (Tab troca o alvo)`}
    >
      <Bar cur={e.hp} max={e.max} color="#FF2E88" />
      <span className="he-figure">{data && <CharCard d={data} width={width} imgUrl={imgUrl} />}</span>
      {target && !down && <span className="he-aim"><GameIcon id="alvo" size={16} /></span>}
      {pops.map((p) => <span key={p.id} className={`hunt-pop ${p.kind}`}>{p.text}</span>)}
    </button>
  );
}

/* ───────────── painel da esquerda ───────────── */

/** Uma linha do painel: ícone quadrado, título e texto. Com `onUse`, é clicável e mostra a tecla. */
function HudItem({ icon, pair, title, text, keyNum, onUse, off, cd, big, value, onHover }: {
  icon?: string; pair?: CardPair; title: string; text: string; keyNum?: number; onUse?: () => void; off?: boolean; cd?: number;
  big?: boolean; value?: string; onHover?: (on: boolean) => void;
}) {
  const style = pair ? ({ '--tc': pair.light, '--td': pair.dark } as CSSProperties) : undefined;
  const body = (
    <>
      <span className="hi-icon">
        {value !== undefined ? <b>{value || '—'}</b> : <GameIcon id={icon || 'estrela'} size={big ? 26 : 18} />}
        {keyNum !== undefined && <i className="hi-key">{keyNum}</i>}
        {cd !== undefined && cd > 0 && <i className="hi-cd">{cd >= 900 ? '—' : cd}</i>}
      </span>
      <span className="hi-text"><strong>{title}</strong><small>{text}</small></span>
    </>
  );
  return onUse
    ? <button type="button" className={`hud-item usable${big ? ' big' : ''}${off ? ' off' : ''}`} style={style} onClick={onUse} data-silent
        onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>{body}</button>
    : <div className={`hud-item${big ? ' big' : ''}`} style={style} onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>{body}</div>;
}

function Section({ title, icon, children, cols = 3, empty }: { title: string; icon: ReactNode; children: ReactNode[]; cols?: number; empty: string }) {
  return (
    <section className="hud-sec">
      <header className="hud-sec-head"><span className="hsh-icon">{icon}</span><h3>{title}</h3></header>
      {children.length ? <div className={`hud-grid c${cols}`}>{children}</div> : <p className="hud-none">{empty}</p>}
    </section>
  );
}

const cardText = (c: Card) => {
  const bits = [c.roll, c.cost, c.cooldown && `recarga ${c.cooldown}`, c.mode === 'passivo' ? 'passiva' : ''].filter(Boolean);
  return c.description ? c.description : bits.join(' · ') || typeOf(c.type).label;
};

/* ───────────── caixa de ação + histórico ───────────── */

function LogView({ log }: { log: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [log.length]);
  let lastRound = 0;
  return (
    <div className="hunt-log-list" ref={ref}>
      {log.map((l) => {
        const sep = l.round !== lastRound; lastRound = l.round;
        return (
          <div key={l.id} className="hl-wrap">
            {sep && <div className="hl-round-sep"><span>Rodada {l.round}</span></div>}
            <div className={`hl ${l.side} ${l.kind}`}>
              <span className="hl-who">{l.actor}</span>
              <span className="hl-text">{l.kind === 'fala' ? `“${l.text.replace(/^[“"]|[”"]$/g, '')}”` : l.text}</span>
              {l.detail && <small>{l.detail}</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "O que você faz?": o jogador descreve a ação e o Bestiário interpreta com as capacidades da ficha. Abaixo, o histórico. */
function Command({ game, target, onDo, onFlee, onTarget }: {
  game: HuntState; target: string | null;
  onDo: (a: HuntAction, targetId: string | null, said: string) => void; onFlee: (said: string) => void; onTarget: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const myTurn = game.phase === 'heroi';
  const reading = useMemo(() => (text.trim() ? interpret(text, game, target) : null), [text, game, target]);
  const submit = () => {
    if (!reading || !myTurn) return;
    if (reading.flee) { onFlee(text.trim()); setText(''); return; }
    if (!reading.ok || !reading.action) return;
    if (reading.target) onTarget(reading.target.id);
    onDo(reading.action, reading.target?.id ?? target, text.trim());
    setText('');
  };
  return (
    <div className={`hud-command action-box${myTurn ? '' : ' waiting'}${text ? ' typing' : ''}`}>
      <label className="hc-line">
        <MessageSquareMore className="hc-icon" size={22} strokeWidth={1.8} />
        <input
          id="action-text" value={text} disabled={!myTurn} maxLength={240} autoComplete="off" aria-label="O que você faz?"
          placeholder={myTurn ? 'O que você faz?' : 'Aguarde a sua vez…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') setText(''); }}
        />
        <button type="button" className="hc-go ab-go" disabled={!myTurn || !reading || !reading.ok} onClick={submit} title="Agir (Enter)"><CornerDownLeft size={15} /> Agir</button>
      </label>
      <div className="hc-panel">
        {reading ? (
          <div className={`ab-reading${reading.ok ? ' ok' : ' bad'}`}>
            {reading.action && <GameIcon id={reading.action.icon} size={15} />}<span>{reading.message}</span>
            {reading.alternatives.length > 0 && (
              <span className="ab-alts">
                {reading.alternatives.map((a) => (
                  <button key={a.id} type="button" className="ab-alt" onClick={() => { onDo(a, a.effect === 'dano' ? reading.target?.id ?? target : null, text.trim() || a.name); setText(''); }}>
                    <GameIcon id={a.icon} size={12} /> {a.name}
                  </button>
                ))}
              </span>
            )}
          </div>
        ) : <div className="hc-title">Histórico de Ações</div>}
        <LogView log={game.log} />
      </div>
    </div>
  );
}

/* ───────────── tela ───────────── */

export function HuntScreen() {
  const game = useHunt((s) => s.game);
  const campaign = useHunt((s) => s.campaign);
  const [target, setTarget] = useState<string | null>(null);
  const [hover, setHover] = useState<{ card: Card | null; action: HuntAction | null } | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [, setTick] = useState(0);
  const [bgOpen, setBgOpen] = useState(false);
  const prefs = useApp((st) => st.prefs);
  const busy = useRef(false);
  const popSeq = useRef(0);

  useEffect(() => { document.documentElement.classList.add('noir'); return () => document.documentElement.classList.remove('noir'); }, []);
  useEffect(() => { const r = () => setTick((t) => t + 1); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);

  /** Efeitos visuais e sons das linhas novas do registro. */
  const react = useCallback((before: HuntState, after: HuntState) => {
    const fresh = after.log.filter((l) => l.id > before.seq);
    const born: Pop[] = [];
    for (const l of fresh) {
      if (l.kind === 'intencao') { const e = after.enemies.find((x) => x.name === l.actor); setActing(e?.id ?? null); continue; }
      if (!l.target && l.kind !== 'cura' && l.kind !== 'defesa') continue;
      const where = l.kind === 'cura' || l.kind === 'defesa' ? 'heroi' : l.target!;
      if (l.kind === 'acerto' || l.kind === 'critico') {
        born.push({ id: ++popSeq.current, target: where, text: `-${l.dmg}`, kind: l.kind === 'critico' ? 'crit' : 'hurt' });
        setHits((h) => ({ ...h, [where]: Date.now() }));
        if (l.kind === 'critico') playCrit();
      } else if (l.kind === 'erro') { born.push({ id: ++popSeq.current, target: where, text: 'Errou', kind: 'miss' }); playFumble(); }
      else if (l.kind === 'cura') { const m = l.text.match(/(\d+)/); born.push({ id: ++popSeq.current, target: 'heroi', text: `+${m ? m[1] : ''}`, kind: 'heal' }); }
      else if (l.kind === 'defesa') { const m = l.text.match(/\+(\d+)/); born.push({ id: ++popSeq.current, target: 'heroi', text: `+${m ? m[1] : ''} DEF`, kind: 'heal' }); }
    }
    if (born.length) {
      setPops((p) => [...p, ...born]);
      const ids = new Set(born.map((b) => b.id));
      window.setTimeout(() => setPops((p) => p.filter((x) => !ids.has(x.id))), 1400);
    }
  }, []);

  // Vez das criaturas: um passo de cada vez (intenção, depois o golpe).
  useEffect(() => {
    if (!game || game.phase !== 'inimigos' || busy.current) return undefined;
    busy.current = true;
    const frames = enemyTurns(game);
    let i = 0; let prev = game; let timer = 0;
    const step = () => {
      const next = frames[i++];
      if (!next) { busy.current = false; setActing(null); return; }
      react(prev, next); prev = next;
      useHunt.setState({ game: next });
      if (next.phase === 'heroi' || next.phase === 'derrota') { busy.current = false; setActing(null); return; }
      timer = window.setTimeout(step, STEP_MS);
    };
    timer = window.setTimeout(step, 500);
    return () => { window.clearTimeout(timer); busy.current = false; };
  }, [game?.phase, game?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const alive = useMemo(() => game?.enemies.filter((e) => e.hp > 0) ?? [], [game]);
  useEffect(() => { if (!alive.some((e) => e.id === target)) setTarget(alive[0]?.id ?? null); }, [alive, target]);

  const use = useCallback((a: HuntAction, targetId?: string | null, said?: string) => {
    const g = useHunt.getState().game;
    if (!g || g.phase !== 'heroi') return;
    const check = canUse(g, a);
    if (!check.ok) { setErr(check.why ?? ''); return; }
    setErr('');
    playDice(500, 1);
    try {
      const next = heroAct(g, a.id, targetId === undefined ? target : targetId, undefined, said);
      react(g, next);
      useHunt.setState({ game: next });
    } catch (e) { setErr((e as Error).message); }
  }, [target, react]);

  // Atalhos: 1–9 usam as ações, Tab troca o alvo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('textarea, input')) return;
      const g = useHunt.getState().game; if (!g) return;
      if (/^[1-9]$/.test(e.key)) { const a = g.hero.actionsList[Number(e.key) - 1]; if (a) { e.preventDefault(); use(a); } }
      if (e.key === 'Tab') {
        e.preventDefault();
        const live = g.enemies.filter((x) => x.hp > 0); if (!live.length) return;
        const i = live.findIndex((x) => x.id === target);
        setTarget(live[(i + 1) % live.length].id); playClick('soft');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [use, target]);

  if (!game || !campaign) return null;
  const { hero } = game;
  const actor = campaign.actors.find((a) => a.id === hero.actorId);
  const cards = actor?.cards ?? [];
  const over = game.phase === 'vitoria' || game.phase === 'derrota' || game.phase === 'fuga';
  const leave = () => { useHunt.setState({ game: null }); useApp.setState({ screen: 'home', homeTab: 'bestiario' }); };
  const again = () => {
    const s = useHunt.getState(); const h = s.campaign?.actors.find((a) => a.id === s.heroId);
    if (s.campaign && h) useHunt.setState({ game: newHunt(s.campaign, h, preyList(s)) });
  };
  const heroHit = (hits.heroi ?? 0) > Date.now() - 500;
  const tgt = game.enemies.find((e) => e.id === target);
  const heroTag = actor?.subtitle || (actor ? tagline(actor.stats) : '');
  const foeActor = tgt ? campaign.actors.find((a) => a.id === tgt.actorId) : undefined;
  const mood = game.phase === 'inimigos' ? 'danger' : game.phase === 'heroi' ? 'ready' : game.phase === 'vitoria' ? 'win' : 'idle';
  const last = [...game.log].reverse().find((l) => l.kind !== 'info' || l.side !== 'sistema') ?? game.log[game.log.length - 1];
  const alma = hero.bars[0];
  const rules = game.rules;
  const sys = campaign.system;

  // Ações da ficha ligadas às linhas do painel (tecla, recarga, se dá para usar agora).
  const list = hero.actionsList;
  const actOfCard = (c: Card) => list.find((a) => a.card?.id === c.id) ?? null;
  const itemProps = (a: HuntAction | null) => {
    if (!a) return {};
    const i = list.indexOf(a);
    return { keyNum: i < 9 ? i + 1 : undefined, onUse: () => use(a), off: !canUse(game, a).ok, cd: game.cooldowns[a.id] ?? 0 };
  };
  const cardItem = (c: Card) => {
    const a = actOfCard(c);
    const left = a?.consumable ? game.uses[a.id] ?? 0 : null;
    return (
      <HudItem key={c.id} icon={c.icon || typeOf(c.type).icon} pair={cardPair(c)} title={left !== null ? `${c.name} ×${left}` : c.name} text={cardText(c)}
        {...itemProps(a)} onHover={(on) => setHover(on ? { card: c, action: a } : null)} />
    );
  };
  const origin = cards.filter((c) => c.type === 'habilidade' && c.origin);
  const skills = cards.filter((c) => c.type === 'habilidade' && !c.origin);
  const spells = cards.filter((c) => c.type === 'feitico');
  const items = cards.filter((c) => c.type === 'item');
  const attacks = list.filter((a) => a.source === 'ataque');

  // Instrumento: a arma em mãos (item equipado com rolagem), senão o primeiro item com rolagem, senão o 1º ataque.
  const inst = items.find((c) => c.equipped && c.roll && c.hunt === 'dano') ?? items.find((c) => c.equipped && c.roll) ?? items.find((c) => c.roll) ?? null;
  const instAct = inst ? actOfCard(inst) : attacks[0] ?? null;
  const instTags = inst ? inst.tags.split(/[·|\n]/).map((x) => x.trim()).filter(Boolean) : [];
  const findStat = (re: RegExp) => inst?.stats.find((s) => re.test(s.l)) ?? null;
  const range = findStat(/alcance/i)?.v ?? instTags.find((t) => /\d+\s*m\b|alcance|dist[aâ]ncia|corpo a corpo/i.test(t)) ?? (inst ? '—' : 'Corpo a corpo');
  const upgrades = (inst?.stats ?? []).filter((s) => !/alcance|dano|recarga/i.test(s.l)).slice(0, 3).map((s) => ({ t: s.l, v: s.v }));
  for (const t of instTags) { if (upgrades.length >= 3) break; if (t !== range) upgrades.push({ t: 'Melhoria', v: t }); }
  const instCd = instAct ? game.cooldowns[instAct.id] ?? 0 : 0;
  const instKey = instAct ? list.indexOf(instAct) : -1;

  // Criaturas: tamanho conforme o espaço livre no meio da mesa.
  const vw = window.innerWidth; const vh = window.innerHeight;
  const areaW = vw * 0.7 - 60; const areaH = vh * 0.54;
  const n = Math.max(1, game.enemies.length);
  const hasBoss = game.enemies.some((e) => e.boss);
  const cardW = Math.round(Math.max(96, Math.min((areaH - 34) / 1.36 / (hasBoss ? 1.12 : 1), (areaW - 52 * n) / n, 240)));

  return (
    <div className={`hunt hunt-hud ${mood} bg-${prefs.huntBg}`}>
      <Backdrop kind={prefs.huntBg} imageUrl={huntBgUrl(prefs.huntBgImage)} circle={prefs.huntCircle} dim={prefs.huntBgDim} />

      <div className="hunt-enemies">
        {game.enemies.map((e, i) => (
          <EnemyView key={e.id} e={e} actor={campaign.actors.find((a) => a.id === e.actorId)}
            width={Math.round(cardW * (e.boss ? 1.12 : 1))} imgUrl={(nm) => fileUrl(campaign.id, nm)}
            target={e.id === target} hit={(hits[e.id] ?? 0) > Date.now() - 500} acting={acting === e.id}
            onPick={() => { setTarget(e.id); playClick('soft'); }} pops={pops.filter((p) => p.target === e.id)}
            tilt={(i % 2 ? 1 : -1) * (1.5 + (i % 3))} />
        ))}
      </div>
      {last && <div key={last.id} className={`ht-narration ${last.side} ${last.kind}`}>{last.text.startsWith(last.actor) ? <><b>{last.actor}</b>{last.text.slice(last.actor.length)}</> : <><b>{last.actor}</b> {last.text}</>}</div>}

      <div className="hud-topbar">
        <button className="hud-btn" onClick={leave} title="Sair do confronto"><ArrowLeft size={15} /> Sair</button>
        <span className="hud-round">Rodada {game.round}</span>
        <span className={`hunt-turn ${game.phase}`}>{game.phase === 'heroi' ? 'Sua vez' : game.phase === 'inimigos' ? 'Vez das criaturas' : game.phase === 'vitoria' ? 'Vitória' : game.phase === 'derrota' ? 'Derrota' : 'Encerrada'}</span>
        {!over && <button className="hud-btn" onClick={() => useHunt.setState({ game: flee(game) })} title="Recuar e encerrar"><Flag size={14} /> Recuar</button>}
        <button className={`hud-btn${bgOpen ? ' on' : ''}`} onClick={() => setBgOpen((o) => !o)} title="Trocar o fundo" aria-expanded={bgOpen}><ImageIcon size={14} /> Fundo</button>
        {bgOpen && (
          <div className="hud-pop" role="dialog" aria-label="Fundo do Bestiário">
            <div className="hud-pop-head"><strong>Fundo</strong><button className="icon-btn" onClick={() => setBgOpen(false)} aria-label="Fechar">×</button></div>
            <BackdropPicker compact />
          </div>
        )}
      </div>

      <aside className="hud-left" aria-label="Ficha do caçador">
        <div className="hud-scroll">
          <Section title={sys.labels.origem} icon={<Star size={22} strokeWidth={1.8} />} empty={`Nenhuma. Marque “${sys.labels.origem}” numa carta de ${typeOf('habilidade').label.toLowerCase()}.`}>{origin.map(cardItem)}</Section>
          <Section title={typeOf('habilidade').plural} icon={<Zap size={22} strokeWidth={1.8} />} empty={`Nenhuma ${typeOf('habilidade').label.toLowerCase()}.`}>{skills.map(cardItem)}</Section>
          {spells.length > 0 && <Section title={typeOf('feitico').plural} icon={<GameIcon id={typeOf('feitico').icon} size={22} />} empty="">{spells.map(cardItem)}</Section>}
          <Section title={typeOf('item').plural} icon={<Layers size={22} strokeWidth={1.8} />} empty={`Nenhum ${typeOf('item').label.toLowerCase()}.`}>{items.map(cardItem)}</Section>
          <Section title={sys.labels.ataques} icon={<Swords size={22} strokeWidth={1.8} />} cols={2} empty="Sem ataques na ficha.">
            {attacks.map((x) => <HudItem key={x.id} icon="faca" title={x.name} text={`${sys.labels.dano} ${x.value}${x.hit ? ` · ${sys.labels.acerto.toLowerCase()} ${x.hit}` : ''}`} {...itemProps(x)} onHover={(on) => setHover(on ? { card: null, action: x } : null)} />)}
          </Section>
          {(actor?.lists ?? []).map((l) => (
            <Section key={l.id} title={l.name} icon={<GameIcon id={l.icon} size={22} />} cols={2} empty={`Sem ${l.name.toLowerCase()}. Adicione no painel da ficha, no Planejador.`}>
              {l.items.filter((x) => x.k).map((x, i) => <HudItem key={i} value={x.v} title={x.k} text={l.name} icon={x.icon} />)}
            </Section>
          ))}
        </div>
      </aside>

      {tgt && (
        <div className={`hud-foe${tgt.hp <= 0 ? ' down' : ''}${(hits[tgt.id] ?? 0) > Date.now() - 500 ? ' hit' : ''}`}>
          <span className="hf-portrait">
            {tgt.image ? <img src={fileUrl(campaign.id, tgt.image)} alt="" /> : <GameIcon id={tgt.emblem || 'garra'} size={40} />}
          </span>
          <div className="hf-info">
            <strong title="Inimigo na mira (clique numa criatura ou Tab para trocar)">{tgt.name}</strong>
            <SlimBar cur={tgt.hp} max={tgt.max} color="var(--hg)" label={rules.hpShort} />
            <span className="hf-stats">
              {rules.hit === 'contra-defesa' && <><GameIcon id="alvo" size={13} /> {rules.defName} <b>{tgt.defense + tgt.guard}</b></>}
              {(foeActor?.stats ?? []).filter((x) => x.card && x.kind !== 'texto' && x.role !== 'vida' && x.role !== 'defesa').slice(0, 2).map((x) => <span key={x.id} className="hf-stat"><GameIcon id={x.icon} size={14} /> {x.short || x.name} <b>{x.value}</b></span>)}
            </span>
          </div>
        </div>
      )}

      <div className={`hud-id${heroHit ? ' hit' : ''}`}>
        <div className="hid-name">
          <h1 title={hero.name}>{hero.name}</h1>
          {heroTag && <small>{heroTag}</small>}
        </div>
        <div className="hid-stats">
          {rules.hit === 'contra-defesa' ? <span title={rules.defName}><Shield size={18} strokeWidth={1.8} /> {rules.defShort} <b>{hero.defense + hero.guard}</b></span> : hero.guard > 0 && <span title="Proteção até o próximo turno"><Shield size={18} strokeWidth={1.8} /> Proteção <b>{hero.guard}</b></span>}
          <span title="Ações de combate restantes neste turno"><Swords size={18} strokeWidth={1.8} /> Ações <b>{game.phase === 'heroi' ? (game.left ?? hero.combatActions ?? 1) : 0}/{hero.combatActions ?? 1}</b></span>
          {(hero.moveActions ?? 0) > 0 && <span title="Ações de movimento por turno"><Footprints size={18} strokeWidth={1.8} /> Movimento <b>{hero.moveActions}</b></span>}
        </div>
      </div>

      <div className="hud-hotbar" role="toolbar" aria-label="Atalhos" style={{ '--n': Math.max(1, Math.min(9, list.length)) } as CSSProperties}>
        {list.slice(0, 9).map((x, i) => {
          const ok = canUse(game, x).ok;
          const cd = game.cooldowns[x.id] ?? 0;
          const left = x.consumable ? game.uses[x.id] ?? 0 : null;
          return (
            <button key={x.id} type="button" className={`hk-slot${ok ? '' : ' off'}`} data-silent onClick={() => use(x)}
              onMouseEnter={() => setHover({ card: x.card, action: x })} onMouseLeave={() => setHover(null)} title={x.name}>
              <span className="hk-box">
                <GameIcon id={x.icon} size={24} />
                {cd > 0 && <i className="hk-cd">{cd >= 900 ? '—' : cd}</i>}
                {left !== null && <i className="hk-qty">×{left}</i>}
                {x.cost > 0 && <i className="hk-cost">{x.cost}</i>}
              </span>
              <span className="hk-key">{i + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="hud-center">
        <Command game={game} target={target} onTarget={setTarget}
          onDo={(x, t, said) => use(x, t, said)}
          onFlee={(said) => { const g = useHunt.getState().game; if (g) useHunt.setState({ game: flee(g) }); void said; }} />
        <div className="hunt-hint">
          {err ? <span className="dice-error">{err}</span>
            : game.phase === 'heroi' ? <>Alvo: <b>{tgt?.name ?? '—'}</b> · clique numa criatura ou Tab · teclas 1–{Math.min(9, list.length)}</>
              : game.phase === 'inimigos' ? 'As criaturas estão agindo…' : ''}
        </div>
      </div>

      <div className={`hud-hero${heroHit ? ' hit' : ''}${hero.hp <= 0 ? ' down' : ''}`}>
        <div className="hh-row"><span className="hh-chip pv"><Heart size={16} strokeWidth={2} /></span><Bar big cur={hero.hp} max={hero.max} color="var(--hg)" label={rules.hpShort} /></div>
        {alma && <div className="hh-row"><span className="hh-chip"><Flame size={16} strokeWidth={2} /></span><Bar big cur={alma.cur} max={alma.max} color="#9a9a9a" label={alma.short || alma.name} /></div>}
        {hero.guard > 0 && <span className="hh-guard"><GameIcon id="escudo" size={14} /> +{hero.guard}</span>}
        {pops.filter((p) => p.target === 'heroi').map((p) => <span key={p.id} className={`hunt-pop ${p.kind}`}>{p.text}</span>)}
        <section className={`hud-instrument${instAct && !canUse(game, instAct).ok ? ' off' : ''}`}
          onMouseEnter={() => setHover(inst || instAct ? { card: inst, action: instAct } : null)} onMouseLeave={() => setHover(null)}>
          <button type="button" className="hin-art" disabled={!instAct} onClick={() => { if (instAct) use(instAct); }} data-silent title={instAct ? `Usar ${instAct.name}` : 'Sem instrumento'}>
            {inst?.image ? <img src={fileUrl(campaign.id, inst.image)} alt="" /> : <GameIcon id={inst?.icon || instAct?.icon || 'revolver'} size={72} />}
            {instKey >= 0 && instKey < 9 && <i className="hi-key">{instKey + 1}</i>}
            {instCd > 0 && <i className="hin-cd">{instCd >= 900 ? '—' : instCd}</i>}
          </button>
          <span className="hin-sep" />
          <div className="hin-text">
            <strong>Instrumento</strong>
            <span className="hin-name">{inst?.name ?? instAct?.name ?? 'Nada em mãos'}</span>
            <small>{[`Dano ${inst?.roll || instAct?.value || '—'}`, inst?.cooldown ? `recarga ${inst.cooldown}` : '', range !== '—' ? `alcance ${range}` : '', ...upgrades.map((u) => u.v)].filter(Boolean).join(' · ')}</small>
          </div>
        </section>
      </div>

      {hover && (hover.card || hover.action) && (
        <div className="hunt-tip">
          {hover.card ? <GameCard card={hover.card} width={250} /> : hover.action && (
            <div className="tip-basic"><strong>{hover.action.name}</strong><span>{sys.labels.ataques}</span><span>{sys.labels.acerto} <b>{hover.action.hit || 'automático'}</b> · {sys.labels.dano} <b>{hover.action.value}</b></span></div>
          )}
          {hover.action && (
            <div className="tip-meta">
              {hover.action.effect === 'dano' ? `${sys.labels.dano} ${hover.action.value} · ${sys.labels.acerto.toLowerCase()} ${rules.hit === 'automatico' ? 'automático' : hover.action.hit || 'automático'}` : hover.action.effect === 'cura' ? `Cura ${hover.action.value}` : rules.hit === 'contra-defesa' ? `+${hover.action.value} de ${rules.defName} até o próximo turno` : `Segura ${hover.action.value} de dano até o próximo turno`}
              {hover.action.cooldown > 0 && ` · recarga ${hover.action.cooldown >= 999 ? 'uma vez por confronto' : `${hover.action.cooldown} turno(s)`}`}
              {hover.action.cost > 0 && ` · custa ${hover.action.cost} ${hover.action.costBar}`}
            </div>
          )}
        </div>
      )}

      {over && (
        <div className="hunt-end">
          <div className={`hunt-end-card ${game.phase}`}>
            <h2>{game.phase === 'vitoria' ? 'Criaturas abatidas' : game.phase === 'derrota' ? 'Você caiu' : 'Confronto encerrado'}</h2>
            <div className="hunt-end-stats">
              <span><b>{game.round}</b> rodadas</span>
              <span><b>{game.stats.dealt}</b> de dano causado</span>
              <span><b>{game.stats.taken}</b> de dano sofrido</span>
              <span><b>{game.stats.healed}</b> curado</span>
              <span><b>{game.stats.crits}</b> críticos</span>
            </div>
            <div className="hunt-end-actions">
              <button className="btn primary big" onClick={again}><RotateCcw size={16} /> Enfrentar de novo</button>
              <button className="btn big" onClick={leave}><Swords size={16} /> Trocar caçador ou criaturas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
