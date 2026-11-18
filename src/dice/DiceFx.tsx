/*
 * Dados animados do COGITO: o mesmo componente no escritor, no escudo do mestre e no site dos jogadores.
 * Cada rolagem aparece na cor de quem rolou. O maior resultado possível ganha explosão dourada;
 * o menor, tremor e rachaduras em vermelho, cada um com o seu som.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playCrit, playDice, playFumble } from '../lib/sound';
import './dice.css';

export interface FxDie { s: number; v: number }
export interface FxRoll {
  id: string; dice: FxDie[]; total: number; extreme: 'max' | 'min' | null; color: string;
  formula: string; label?: string; who?: string; detail?: string;
}

export const DIE_SHAPE: Record<number, string> = {
  4: '12,3.5 21.5,20.5 2.5,20.5',
  6: '4.5,4.5 19.5,4.5 19.5,19.5 4.5,19.5',
  8: '12,2.5 21,12 12,21.5 3,12',
  10: '12,2.5 21,10 12,21.5 3,10',
  12: '12,2.5 21.2,9.2 17.7,20.5 6.3,20.5 2.8,9.2',
  20: '12,2.5 20.6,7.2 20.6,16.8 12,21.5 3.4,16.8 3.4,7.2',
  100: '12,2.5 18.7,5.3 21.5,12 18.7,18.7 12,21.5 5.3,18.7 2.5,12 5.3,5.3',
};
export const shapeOf = (sides: number) => DIE_SHAPE[sides] ?? DIE_SHAPE[100];

/** Cor do número: escura em dados claros, clara em dados escuros. */
export function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#111';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#141414' : '#ffffff';
}

export function DieFace({ sides, value, color, size = 54, className = '', style }: { sides: number; value: number | string; color: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={`fx-die d${sides} ${className}`} style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <polygon points={shapeOf(sides)} fill={color} stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinejoin="round" />
        <polygon points={shapeOf(sides)} fill="url(#fx-shine)" strokeLinejoin="round" />
      </svg>
      <b style={{ color: inkFor(color), fontSize: size * (String(value).length > 2 ? 0.27 : 0.36) }}>{value}</b>
    </span>
  );
}

/** Definição do brilho dos dados (uma vez por página). */
export function DiceDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="fx-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const MAX_SHOWN = 12;

/**
 * Uma rolagem animada. `animate=false` mostra direto o resultado (usado no histórico).
 * `sound=false` silencia (ex.: quando outra pessoa rolou e o som já tocou num aviso).
 */
export function DiceFx({ roll, animate = true, sound = true, size = 54, onDone }: { roll: FxRoll; animate?: boolean; sound?: boolean; size?: number; onDone?: () => void }) {
  const [phase, setPhase] = useState<'rolling' | 'landed'>(animate ? 'rolling' : 'landed');
  const [spin, setSpin] = useState<number[]>(() => roll.dice.map((d) => d.v));
  const done = useRef(onDone); done.current = onDone;
  const shown = roll.dice.slice(0, MAX_SHOWN);

  useEffect(() => {
    if (!animate) { setPhase('landed'); return undefined; }
    setPhase('rolling');
    if (sound) playDice(900, Math.max(1, roll.dice.length));
    const tick = setInterval(() => setSpin(roll.dice.map((d) => 1 + Math.floor(Math.random() * d.s))), 70);
    const land = setTimeout(() => {
      clearInterval(tick);
      setPhase('landed');
      if (sound && roll.extreme === 'max') playCrit();
      if (sound && roll.extreme === 'min') playFumble();
      setTimeout(() => done.current?.(), roll.extreme ? 2200 : 1500);
    }, 950);
    return () => { clearInterval(tick); clearTimeout(land); };
  }, [roll.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fx = phase === 'landed' && roll.extreme ? roll.extreme : null;
  return (
    <div className={`dice-fx${fx ? ` ${fx}` : ''}${phase === 'rolling' ? ' rolling' : ''}`} style={{ '--die': roll.color } as CSSProperties}>
      <DiceDefs />
      {(roll.who || roll.label) && <div className="fx-who"><i style={{ background: roll.color }} />{roll.who}{roll.label ? <span> · {roll.label}</span> : null}</div>}
      <div className={`fx-row${shown.length > 4 ? ' many' : ''}`}>
        {shown.map((d, i) => (
          <DieFace
            key={`${roll.id}-${i}`} sides={d.s} value={phase === 'rolling' ? spin[i] ?? d.v : d.v} color={roll.color}
            size={shown.length > 4 ? size * 0.74 : size}
            className={phase === 'rolling' ? 'tumbling' : 'landed'}
            style={{ '--dx': `${(i % 2 ? 1 : -1) * (24 + ((i * 37) % 40))}px`, '--dur': `${0.75 + ((i * 53) % 20) / 100}s` } as CSSProperties}
          />
        ))}
        {roll.dice.length > MAX_SHOWN && <span className="fx-more">+{roll.dice.length - MAX_SHOWN}</span>}
      </div>
      <div className="fx-total-row">
        <span className="fx-formula">{roll.formula}</span>
        <span className={`fx-total${phase === 'landed' ? ' pop' : ''}`}>{phase === 'rolling' ? '…' : roll.total}</span>
      </div>
      {fx === 'max' && <div className="fx-banner max">Máximo!</div>}
      {fx === 'min' && <div className="fx-banner min">Falha!</div>}
      {fx === 'max' && <div className="fx-burst" aria-hidden>{Array.from({ length: 14 }, (_, k) => <i key={k} style={{ '--a': `${(k * 360) / 14}deg`, '--d': `${60 + (k % 3) * 22}px` } as CSSProperties} />)}</div>}
      {fx === 'min' && <svg className="fx-cracks" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden><path d="M50 0 L46 18 L54 26 L44 40 L50 60 M46 18 L30 22 L22 34 M54 26 L72 30 L80 44" /></svg>}
      {phase === 'landed' && roll.detail && <div className="fx-detail">{roll.detail}</div>}
    </div>
  );
}

/** Fila de rolagens que aparecem por cima da mesa (todos veem as rolagens de todos). */
export function DiceOverlay({ queue, onShift, position = 'bottom' }: { queue: FxRoll[]; onShift: () => void; position?: 'bottom' | 'top' }) {
  const cur = queue[0];
  if (!cur) return null;
  return (
    <div className={`dice-overlay ${position}`} role="status" aria-live="polite">
      <DiceFx key={cur.id} roll={cur} onDone={onShift} />
      {queue.length > 1 && <span className="overlay-more">+{queue.length - 1}</span>}
    </div>
  );
}

/** Calcula mínimo e máximo possíveis de uma fórmula (para rolagens feitas no próprio app). */
export function extremeOf(parts: { text: string; rolls: number[]; subtotal: number }[], total: number): 'max' | 'min' | null {
  let min = 0; let max = 0;
  for (const p of parts) {
    const m = /^(-?)(\d+)d(\d+)$/.exec(p.text);
    if (m) { const n = Number(m[2]); const s = Number(m[3]); if (m[1]) { min -= n * s; max -= n; } else { min += n; max += n * s; } }
    else { min += p.subtotal; max += p.subtotal; }
  }
  return max === min ? null : total === max ? 'max' : total === min ? 'min' : null;
}

export const DICE_PALETTE = ['#f2f2f2', '#e0b84a', '#d94848', '#5fa8e8', '#6ebf94', '#b07be8', '#e88fc4', '#2b2b2b'];

/** Escolha da cor dos dados: paleta pronta ou qualquer cor. */
export function DiceColors({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="dice-colors" role="radiogroup" aria-label="Cor dos dados">
      {DICE_PALETTE.map((c) => <button key={c} type="button" className={value.toLowerCase() === c ? 'on' : ''} style={{ background: c }} title={c} aria-label={`Dados na cor ${c}`} onClick={() => onChange(c)} />)}
      <label title="Outra cor">+<input type="color" value={value} onChange={(e) => onChange(e.target.value)} /></label>
    </div>
  );
}
