/*
 * Tela do Bestiário (Caçada): a mesa de um investigador ao fundo, com as criaturas sobre ela, e a HUD do jogador por cima.
 * - Esquerda: painel da ficha (barra preta com Sair, rodada e Recuar; Habilidades de Origem, Habilidades, Itens,
 *   Atributos e Capacidades). Itens que podem ser usados mostram a tecla (1–9) e são clicáveis.
 * - Topo: retrato quadrado; à direita, nome, PV, PA, Defesa, Resiliência e Ações do turno.
 * - Centro de baixo: "O que você faz?" (a peça principal) e o Histórico de Ações logo abaixo.
 * - Canto de baixo à direita: o Instrumento (a arma em mãos), com melhorias, dano, recarga e alcance.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, CornerDownLeft, Flag, RotateCcw, Swords } from 'lucide-react';
import { playClick, playCrit, playDice, playFumble } from '../lib/sound';
import { useApp } from '../store';
import { GameCard, cardPair, typeOf } from '../game/Cards';
import { CharCard, dataFromActor, type CharData } from '../game/CharCard';
import type { Actor, BarDef, Card } from '../game/types';
import { GameIcon } from '../game/icons';
import { pairById, type CardPair } from '../game/palette';
import { canUse, enemyTurns, flee, heroAct, newHunt, type Combatant, type HuntAction, type HuntState, type LogLine } from './engine';
import { interpret } from './interpret';
import { preyList, useHunt } from './state';
import { Desk } from './Desk';
import './hunt.css';

const STEP_MS = 900;
const fileUrl = (campId: string, name: string) => `cogito://app/__plan/${campId}/${encodeURIComponent(name)}`;

function Bar({ cur, max, color, label, big }: { cur: number; max: number; color: string; label?: string; big?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return (
    <div className={`hb-bar${big ? ' big' : ''}`} style={{ '--bc': color } as CSSProperties} title={label ? `${label}: ${cur}/${max}` : undefined}>
      <i style={{ width: `${pct * 100}%` }} />
      <b>{cur}/{max}{label ? ` ${label}` : ''}</b>
    </div>
  );
}

interface Pop { id: number; target: string; text: string; kind: 'hurt' | 'heal' | 'miss' | 'crit' }

function EnemyView({ e, actor, bars, width, imgUrl, target, hit, acting, onPick, pops, tilt = 0 }: {
  e: Combatant; actor: Actor | undefined; bars: BarDef[]; width: number; imgUrl: (n: string) => string;
  target: boolean; hit: boolean; acting: boolean; onPick: () => void; pops: Pop[]; tilt?: number;
}) {
  const down = e.hp <= 0;
  const data: CharData | null = actor ? { ...dataFromActor(actor, bars, { cur: e.hp, max: e.max }, down), name: e.name } : null;
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

function Section({ title, sub, children, cols = 3, empty }: { title: string; sub?: string; children: ReactNode[]; cols?: number; empty: string }) {
  return (
    <section className="hud-sec">
      <h3>{title}</h3>
      {sub && <span className="hud-sub">{sub}</span>}
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
    <div className={`hud-command action-box${myTurn ? '' : ' waiting'}`}>
      <label className="hc-pill">
        <input
          id="action-text" value={text} disabled={!myTurn} maxLength={240} autoComplete="off" aria-label="O que você faz?"
          placeholder={myTurn ? 'O que você faz?' : 'Aguarde a sua vez…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') setText(''); }}
        />
        <button type="button" className="hc-go ab-go" disabled={!myTurn || !reading || !reading.ok} onClick={submit} title="Agir (Enter)"><CornerDownLeft size={16} /> Agir</button>
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
  const mood = game.phase === 'inimigos' ? 'danger' : game.phase === 'heroi' ? 'ready' : game.phase === 'vitoria' ? 'win' : 'idle';
  const last = [...game.log].reverse().find((l) => l.kind !== 'info' || l.side !== 'sistema') ?? game.log[game.log.length - 1];
  const alma = hero.bars.find((b) => b.id === 'alma') ?? hero.bars[0];

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
  const skills = cards.filter((c) => (c.type === 'habilidade' && !c.origin) || c.type === 'feitico');
  const items = cards.filter((c) => c.type === 'item');
  const attacks = list.filter((a) => a.source === 'ataque');
  const charcoal = pairById('charcoal');

  // Instrumento: a arma em mãos (item equipado com rolagem), senão o primeiro item com rolagem, senão o 1º ataque.
  const inst = items.find((c) => c.equipped && c.roll && c.hunt === 'dano') ?? items.find((c) => c.equipped && c.roll) ?? items.find((c) => c.roll) ?? null;
  const instAct = inst ? actOfCard(inst) : attacks[0] ?? null;
  const instTags = inst ? inst.tags.split(/[·|\n]/).map((x) => x.trim()).filter(Boolean) : [];
  const findStat = (re: RegExp) => inst?.stats.find((s) => re.test(s.l)) ?? null;
  const range = findStat(/alcance/i)?.v ?? instTags.find((t) => /\d+\s*m\b|alcance|dist[aâ]ncia|corpo a corpo/i.test(t)) ?? (inst ? '—' : 'Corpo a corpo');
  const upgrades = (inst?.stats ?? []).filter((s) => !/alcance|dano|recarga/i.test(s.l)).slice(0, 3).map((s) => ({ t: s.l, v: s.v }));
  for (const t of instTags) { if (upgrades.length >= 3) break; if (t !== range) upgrades.push({ t: 'Melhoria', v: t }); }
  const instPair = inst ? cardPair(inst) : charcoal;
  const instCd = instAct ? game.cooldowns[instAct.id] ?? 0 : 0;
  const instKey = instAct ? list.indexOf(instAct) : -1;

  // Criaturas: tamanho conforme o espaço livre no meio da mesa.
  const vw = window.innerWidth; const vh = window.innerHeight;
  const areaW = vw * 0.66; const areaH = vh * 0.32;
  const n = Math.max(1, game.enemies.length);
  const hasBoss = game.enemies.some((e) => e.boss);
  const cardW = Math.round(Math.max(96, Math.min((areaH - 34) / 1.36 / (hasBoss ? 1.12 : 1), (areaW - 44 * n) / n, 210)));
  const heroTitle = actor?.subtitle ? `${hero.name}, ${actor.subtitle.charAt(0).toLowerCase()}${actor.subtitle.slice(1)}` : hero.name;

  return (
    <div className={`hunt hunt-hud ${mood}`}>
      <Desk />

      <div className="hunt-enemies">
        {game.enemies.map((e, i) => (
          <EnemyView key={e.id} e={e} actor={campaign.actors.find((a) => a.id === e.actorId)} bars={campaign.bars}
            width={Math.round(cardW * (e.boss ? 1.12 : 1))} imgUrl={(nm) => fileUrl(campaign.id, nm)}
            target={e.id === target} hit={(hits[e.id] ?? 0) > Date.now() - 500} acting={acting === e.id}
            onPick={() => { setTarget(e.id); playClick('soft'); }} pops={pops.filter((p) => p.target === e.id)}
            tilt={(i % 2 ? 1 : -1) * (1.5 + (i % 3))} />
        ))}
      </div>
      {last && <div key={last.id} className={`ht-narration ${last.side} ${last.kind}`}>{last.text.startsWith(last.actor) ? <><b>{last.actor}</b>{last.text.slice(last.actor.length)}</> : <><b>{last.actor}</b> {last.text}</>}</div>}

      <aside className="hud-left" aria-label="Ficha do caçador">
        <header className="hud-bar">
          <button className="hud-btn" onClick={leave} title="Sair do confronto"><ArrowLeft size={15} /> Sair</button>
          <span className="hud-round">Rodada {game.round}</span>
          <span className={`hunt-turn ${game.phase}`}>{game.phase === 'heroi' ? 'Sua vez' : game.phase === 'inimigos' ? 'Vez das criaturas' : game.phase === 'vitoria' ? 'Vitória' : game.phase === 'derrota' ? 'Derrota' : 'Encerrada'}</span>
          <span className="grow" />
          {!over && <button className="hud-btn" onClick={() => useHunt.setState({ game: flee(game) })} title="Recuar e encerrar"><Flag size={14} /> Recuar</button>}
        </header>
        <div className="hud-scroll">
          <Section title="Habilidades de Origem" empty="Nenhuma. Marque “Habilidade de origem” numa carta de habilidade.">{origin.map(cardItem)}</Section>
          <Section title="Habilidades" empty="Nenhuma habilidade ou poder oculto.">{skills.map(cardItem)}</Section>
          <Section title="Itens" sub="Itens e equipamentos" empty="Nenhum item.">{items.map(cardItem)}</Section>
          <Section title="Atributos" cols={2} empty="Sem atributos.">
            {(actor?.attrs ?? []).filter((a) => a.k).map((a, i) => <HudItem key={i} big value={a.v} title={a.k} text="Atributo" />)}
          </Section>
          <Section title="Capacidades" empty="Sem capacidades. Adicione no painel da ficha, no Planejador.">
            {[
              ...attacks.map((a) => <HudItem key={a.id} icon="faca" pair={charcoal} title={a.name} text={`Dano ${a.value}${a.hit ? ` · acerto ${a.hit}` : ''}`} {...itemProps(a)} onHover={(on) => setHover(on ? { card: null, action: a } : null)} />),
              ...(actor?.caps ?? []).filter((c) => c.k).map((c, i) => <HudItem key={`c${i}`} value={c.v} title={c.k} text="Capacidade" />),
            ]}
          </Section>
        </div>
      </aside>

      <div className={`hud-portrait${heroHit ? ' hit' : ''}${hero.hp <= 0 ? ' down' : ''}`} style={{ '--tc': hero.color } as CSSProperties}>
        <span className="hp-frame">
          {hero.image ? <img src={fileUrl(campaign.id, hero.image)} alt="" /> : <GameIcon id={hero.emblem || 'pessoa'} size={110} />}
        </span>
        {hero.guard > 0 && <span className="hh-guard"><GameIcon id="escudo" size={14} /> +{hero.guard}</span>}
        {pops.filter((p) => p.target === 'heroi').map((p) => <span key={p.id} className={`hunt-pop ${p.kind}`}>{p.text}</span>)}
      </div>

      <div className="hud-name">
        <h1 title={heroTitle}>{heroTitle}</h1>
        <Bar big cur={hero.hp} max={hero.max} color="#ff2020" label="PV" />
        {alma && <Bar big cur={alma.cur} max={alma.max} color="#00e65f" label="PA" />}
        <div className="hn-stats">
          <span>Defesa: <b>{hero.defense + hero.guard}</b></span>
          <span>Resiliência: <b>{hero.resilience}</b></span>
          <span>Ações: <b>{game.phase === 'heroi' ? 1 : 0}/1</b></span>
        </div>
        {tgt && <div className="hn-target"><GameIcon id="alvo" size={14} /> Na mira: <b>{tgt.name}</b> · {tgt.hp}/{tgt.max} · Defesa {tgt.defense}</div>}
      </div>

      <div className="hud-center">
        <Command game={game} target={target} onTarget={setTarget}
          onDo={(a, t, said) => use(a, t, said)}
          onFlee={(said) => { const g = useHunt.getState().game; if (g) useHunt.setState({ game: flee(g) }); void said; }} />
        <div className="hunt-hint">
          {err ? <span className="dice-error">{err}</span>
            : game.phase === 'heroi' ? <>Alvo: <b>{tgt?.name ?? '—'}</b> · clique numa criatura ou Tab · teclas 1–{Math.min(9, list.length)} usam a ficha</>
              : game.phase === 'inimigos' ? 'As criaturas estão agindo…' : ''}
        </div>
      </div>

      <section className={`hud-instrument${instAct && !canUse(game, instAct).ok ? ' off' : ''}`} style={{ '--tc': instPair.light, '--td': instPair.dark } as CSSProperties}
        onMouseEnter={() => setHover(inst || instAct ? { card: inst, action: instAct } : null)} onMouseLeave={() => setHover(null)}>
        <div className="hin-body">
          <div className="hin-col">
            {upgrades.map((u, i) => <HudItem key={i} icon="estrela" pair={instPair} title={u.t} text={u.v} />)}
            {!upgrades.length && <p className="hud-none">Sem melhorias.</p>}
          </div>
          <button type="button" className="hin-art" disabled={!instAct} onClick={() => { if (instAct) use(instAct); }} data-silent title={instAct ? `Usar ${instAct.name}` : 'Sem instrumento'}>
            {inst?.image ? <img src={fileUrl(campaign.id, inst.image)} alt="" /> : <GameIcon id={inst?.icon || instAct?.icon || 'revolver'} size={120} />}
            {instKey >= 0 && instKey < 9 && <i className="hi-key">{instKey + 1}</i>}
            {instCd > 0 && <i className="hin-cd">{instCd >= 900 ? '—' : instCd}</i>}
          </button>
          <div className="hin-col">
            <HudItem icon="faca" pair={instPair} title="Dano" text={inst?.roll || instAct?.value || '—'} />
            <HudItem icon="relogio" pair={instPair} title="Ações para recarga" text={inst?.cooldown || 'Sem recarga'} />
            <HudItem icon="alvo" pair={instPair} title="Alcance" text={range} />
          </div>
        </div>
        <footer className="hin-foot">Instrumento{inst ? ` · ${inst.name}` : instAct ? ` · ${instAct.name}` : ''}</footer>
      </section>

      {hover && (hover.card || hover.action) && (
        <div className="hunt-tip">
          {hover.card ? <GameCard card={hover.card} width={250} /> : hover.action && (
            <div className="tip-basic"><strong>{hover.action.name}</strong><span>Ataque da ficha</span><span>Acerto <b>{hover.action.hit || 'automático'}</b> · Dano <b>{hover.action.value}</b></span></div>
          )}
          {hover.action && (
            <div className="tip-meta">
              {hover.action.effect === 'dano' ? `Dano ${hover.action.value} · acerto ${hover.action.hit || 'automático'}` : hover.action.effect === 'cura' ? `Cura ${hover.action.value}` : `+${hover.action.value} de Defesa até o próximo turno`}
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
