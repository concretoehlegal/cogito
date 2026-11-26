/*
 * Cartas de personagem: como personagens, NPCs, chefes e criaturas aparecem no Planejador.
 * Visual limpo e discreto: cada tipo tem só um tom suave (jogadores bronze, NPCs lilás acinzentado, chefes azul ardósia com filete duplo, criaturas ferrugem).
 * Os números dos cantos, os atributos e os nomes vêm do sistema de regras da campanha (ver dataFromActor).
 * Nome no centro, atributos abaixo e o instrumento (dano e ações para recarregar) no rodapé.
 * Criaturas mostram a vida, o dano e as habilidades (2; chefes, 4).
 */
import { memo, type CSSProperties } from 'react';
import { GameIcon } from './icons';

export { dataFromActor, variantOf, cryptKind, type CardVariant, type CharData, type Chip, type CryptKind } from './charData';
import type { CharData } from './charData';

const abbr = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '—';

export const CharCard = memo(function CharCard({ d, width = 220, imgUrl, className }: { d: CharData; width?: number; imgUrl?: (n: string) => string; className?: string }) {
  const creature = d.variant === 'enemy' || d.variant === 'boss';
  const mini = width < 120;
  return (
    <div className={`char-card v-${d.variant}${d.dead ? ' dead' : ''}${mini ? ' mini' : ''}${className ? ` ${className}` : ''}`} style={{ '--cw': `${width}px`, '--k': width / 220, '--tc': d.color } as CSSProperties}>
      <div className="cc-frame">
        <div className="cc-inner">
          <div className="cc-art">
            {d.image && imgUrl ? <img src={imgUrl(d.image)} alt="" draggable={false} /> : <span className="cc-emblem"><GameIcon id={d.emblem || (creature ? 'garra' : 'pessoa')} size={96} /></span>}
          </div>
          <div className="cc-tl">
            {d.tl.map((c, i) => <span key={i} className={`cc-stat${c.big ? ' big' : ''}`} title={c.title}><GameIcon id={c.icon} size={c.big ? 20 : 15} /><b>{d.hidden && !c.big ? '?' : c.value}</b></span>)}
          </div>
          <div className="cc-tr">
            {d.tr.map((c, i) => <span key={i} className={`cc-stat${creature ? ' dmg' : ''}`} title={c.title}><GameIcon id={c.icon} size={creature ? 14 : 15} /><b>{d.hidden ? '?' : c.value}</b></span>)}
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
                  ? <span>{d.kindLabel}</span>
                  : d.instrument
                    ? <span className="cc-inst" title="Instrumento: dano e ações para recarregar"><em>{d.instrument.name}</em><b>{d.instrument.dmg}</b>{d.instrument.reload > 0 && <i><GameIcon id="relogio" size={11} />{d.instrument.reload}</i>}</span>
                    : <span>{d.kindLabel}</span>}
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
