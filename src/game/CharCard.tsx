/*
 * Cartas de personagem: como personagens, NPCs, chefes e criaturas aparecem no Planejador e no Bestiário.
 * Visual limpo e discreto: cada tipo tem só um tom suave (jogadores bronze, NPCs lilás acinzentado, chefes azul ardósia com filete duplo, criaturas ferrugem).
 * Canto superior esquerdo: Vida (gota) e Resiliência (escudo com aura). Direito: Defesa (alvo) e Pontos de alma (espírito).
 * Nome no centro, atributos abaixo e o instrumento (dano e ações para recarregar) no rodapé.
 * Criaturas mostram só Vida, Resiliência, Dano e as habilidades (2; chefes, 4).
 */
import { memo, type CSSProperties } from 'react';
import { GameIcon } from './icons';
import type { Actor, BarDef, CardSummary } from './types';

export type CardVariant = 'pc' | 'npc' | 'boss' | 'enemy';
export interface CharData {
  name: string; color: string; image: string | null; emblem: string; variant: CardVariant;
  hp: number | null; hpMax: number | null; resilience: number; defense: number; soul: number;
  attrs: { k: string; v: string }[]; instrument: { name: string; dmg: string; reload: number } | null;
  abilities: { name: string; dmg: string }[]; dead: boolean; hidden?: boolean;
}

/** Tipo de carta de um token ou ficha (nome antigo mantido: personagem, NPC, inimigo ou chefe). */
export type CryptKind = 'pc' | 'npc' | 'enemy' | 'boss';
export const cryptKind = (t: { kind?: string; boss?: boolean }): CryptKind => (t.kind === 'enemy' ? (t.boss ? 'boss' : 'enemy') : t.kind === 'npc' ? 'npc' : 'pc');
export const variantOf = (kind: string | undefined, boss?: boolean): CardVariant => (kind === 'enemy' ? (boss ? 'boss' : 'enemy') : kind === 'npc' ? 'npc' : 'pc');
const reloadOf = (txt: string) => { const m = String(txt || '').match(/(\d+)/); return m ? Math.min(99, Number(m[1])) : 0; };

/** Resumo de carta a partir de uma ficha (mesma regra do servidor). */
export function summaryOf(actor: Actor): CardSummary {
  const enemy = actor.kind === 'enemy';
  const card = actor.cards.find((k) => k.equipped && k.roll && k.type === 'item') ?? actor.cards.find((k) => k.type === 'item' && k.roll);
  const act = actor.actions.find((x) => x.dmg);
  return {
    resilience: actor.resilience ?? 0, soul: enemy ? 0 : actor.soul ?? 0, defense: enemy ? 0 : actor.defense,
    attrs: enemy ? [] : actor.attrs.filter((x) => x.k).slice(0, 6),
    instrument: enemy ? null : card ? { name: card.name, dmg: card.roll, reload: reloadOf(card.cooldown) } : act ? { name: act.name, dmg: act.dmg, reload: 0 } : null,
    abilities: enemy ? actor.actions.slice(0, actor.boss ? 4 : 2).map((x) => ({ name: x.name, dmg: x.dmg })) : [],
  };
}

export function dataFromActor(actor: Actor, bars: BarDef[], hp?: { cur: number; max: number } | null, dead = false): CharData {
  const sum = summaryOf(actor);
  const v = hp ?? (bars[0] ? actor.bars[bars[0].id] : undefined);
  return {
    name: actor.name, color: actor.color, image: actor.image, emblem: actor.emblem, variant: variantOf(actor.kind, actor.boss),
    hp: v ? v.cur : null, hpMax: v ? v.max : null, ...sum, dead,
  };
}

const abbr = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '—';
const num = (n: number | null) => (n === null ? '?' : String(n));

export const CharCard = memo(function CharCard({ d, width = 220, imgUrl, className }: { d: CharData; width?: number; imgUrl?: (n: string) => string; className?: string }) {
  const creature = d.variant === 'enemy' || d.variant === 'boss';
  const mini = width < 120;
  const mainDmg = creature ? d.abilities[0]?.dmg ?? '—' : null;
  return (
    <div className={`char-card v-${d.variant}${d.dead ? ' dead' : ''}${mini ? ' mini' : ''}${className ? ` ${className}` : ''}`} style={{ '--cw': `${width}px`, '--k': width / 220, '--tc': d.color } as CSSProperties}>
      <div className="cc-frame">
        <div className="cc-inner">
          <div className="cc-art">
            {d.image && imgUrl ? <img src={imgUrl(d.image)} alt="" draggable={false} /> : <span className="cc-emblem"><GameIcon id={d.emblem || (creature ? 'garra' : 'pessoa')} size={96} /></span>}
          </div>
          <div className="cc-tl">
            <span className="cc-stat big" title="Vida"><GameIcon id="sangue" size={20} /><b>{num(d.hp)}</b></span>
            <span className="cc-stat" title="Resiliência"><GameIcon id="resiliencia" size={15} /><b>{d.hidden ? '?' : d.resilience}</b></span>
          </div>
          <div className="cc-tr">
            {creature ? (
              <span className="cc-stat dmg" title="Dano"><GameIcon id="faca" size={14} /><b>{d.hidden ? '?' : mainDmg}</b></span>
            ) : (
              <>
                <span className="cc-stat" title="Defesa"><GameIcon id="alvo" size={15} /><b>{d.hidden ? '?' : d.defense}</b></span>
                <span className="cc-stat" title="Pontos de alma"><GameIcon id="fantasma" size={15} /><b>{d.hidden ? '?' : d.soul}</b></span>
              </>
            )}
          </div>
          {!mini && (
            <div className="cc-body">
              <div className="cc-name">{d.name}</div>
              {creature ? (
                <ul className="cc-abilities">
                  {d.abilities.map((a, i) => <li key={i}><span>{a.name}</span><b>{a.dmg || '—'}</b></li>)}
                  {!d.abilities.length && <li className="muted"><span>{d.hidden ? 'Habilidades ocultas' : 'Sem habilidades'}</span></li>}
                </ul>
              ) : (
                <div className="cc-grid">
                  {d.attrs.map((a, i) => <span key={i}><em>{abbr(a.k)}</em><b>{a.v || '—'}</b></span>)}
                  {!d.attrs.length && <span className="cc-none">{d.hidden ? 'Atributos ocultos' : 'Sem atributos'}</span>}
                </div>
              )}
              <div className="cc-foot">
                {creature
                  ? <span>{d.variant === 'boss' ? 'Chefe' : 'Criatura'}</span>
                  : d.instrument
                    ? <span className="cc-inst" title="Instrumento: dano e ações para recarregar"><em>{d.instrument.name}</em><b>{d.instrument.dmg}</b>{d.instrument.reload > 0 && <i><GameIcon id="relogio" size={11} />{d.instrument.reload}</i>}</span>
                    : <span>{d.variant === 'npc' ? 'NPC' : 'Personagem'}</span>}
              </div>
            </div>
          )}
          {mini && <div className="cc-mini-name">{d.name}</div>}
          {d.dead && <div className="cc-dead"><GameIcon id="caveira" size={mini ? 22 : 54} /><span>Caído</span></div>}
        </div>
      </div>
    </div>
  );
});
