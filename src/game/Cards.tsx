/*
 * Cartas de equipamento, habilidade e poder oculto.
 * Duas formas: o ladrilho (vitrine, como numa loja de jogo) e a ficha completa da carta,
 * com cabeçalho na cor do tipo, faixa Ativo/Passivo com recarga e quadros de números.
 */
import { useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../components/ui';
import type { Card, CardType, Rarity } from './types';
import { GameIcon, IconPicker } from './icons';
import { CARD_PAIRS, pairOf } from './palette';

export const CARD_TYPES: { id: CardType; label: string; plural: string; icon: string; color: string }[] = [
  { id: 'item', label: 'Equipamento', plural: 'Equipamentos', icon: 'revolver', color: '#FF8C00' },
  { id: 'habilidade', label: 'Habilidade', plural: 'Habilidades', icon: 'raio', color: '#00C2CB' },
  { id: 'feitico', label: 'Oculto', plural: 'Ocultos', icon: 'vela', color: '#E6D6FF' },
];
/** Níveis da vitrine (o campo continua se chamando "raridade" no arquivo da campanha). */
export const RARITIES: { id: Rarity; label: string; short: string; color: string }[] = [
  { id: 'comum', label: 'Nível I', short: 'I', color: '#D7B899' },
  { id: 'incomum', label: 'Nível II', short: 'II', color: '#A7C957' },
  { id: 'raro', label: 'Nível III', short: 'III', color: '#00C2CB' },
  { id: 'epico', label: 'Nível IV', short: 'IV', color: '#FF6B6B' },
  { id: 'lendario', label: 'Relíquia', short: 'R', color: '#F4B400' },
];
/** Nomes e ícones dos tipos de carta no sistema de regras da campanha aberta (Magia, Ritual, Talento…). */
let named: Partial<Record<CardType, { label: string; plural: string; icon: string }>> = {};
let originName = 'Habilidades de Origem';
export function setCardLabels(sys: { cardTypes: Record<CardType, { label: string; plural: string; icon: string }>; labels?: { origem?: string } } | null) {
  named = sys ? { ...sys.cardTypes } : {};
  originName = sys?.labels?.origem || 'Habilidades de Origem';
}
export const typeOf = (t: CardType) => { const base = CARD_TYPES.find((x) => x.id === t) ?? CARD_TYPES[0]; return { ...base, ...(named[base.id] ?? {}) }; };
export const rarityOf = (r: Rarity) => RARITIES.find((x) => x.id === r) ?? RARITIES[0];

export const blankCard = (type: CardType = 'item'): Card => ({
  id: '', type, name: type === 'feitico' ? 'Novo poder oculto' : type === 'habilidade' ? 'Nova habilidade' : 'Novo equipamento',
  icon: typeOf(type).icon, image: null, color: typeOf(type).color,
  rarity: 'comum', cost: '', roll: '', tags: '', description: '', qty: 1, consumable: false, equipped: false,
  mode: type === 'item' ? 'passivo' : 'ativo', cooldown: '', stats: [], hunt: '',
});

/** Cores antigas padrão de cada tipo (antes da paleta): passam a usar o par novo do tipo. */
const OLD_DEFAULTS: Record<string, CardType> = { '#c27a33': 'item', '#7d9a3e': 'habilidade', '#8d5aa3': 'feitico' };
export const cardPair = (card: Pick<Card, 'color' | 'type'>) => {
  const c = (card.color || '').toLowerCase();
  return pairOf(OLD_DEFAULTS[c] ? typeOf(OLD_DEFAULTS[c]).color : card.color || typeOf(card.type).color);
};
const tint = (card: Card) => { const p = cardPair(card); return { '--tc': p.light, '--td': p.dark, '--rar': rarityOf(card.rarity).color } as CSSProperties; };
const statusOf = (card: Card) => (card.consumable && card.qty <= 0 ? 'Acabou' : card.equipped ? 'Equipado' : rarityOf(card.rarity).label);

function Art({ card, fileUrl }: { card: Card; fileUrl?: (n: string) => string }) {
  return card.image && fileUrl
    ? <img src={fileUrl(card.image)} alt="" draggable={false} />
    : <span className="ct-ink"><GameIcon id={card.icon || typeOf(card.type).icon} size={64} /></span>;
}

/** Ladrilho da vitrine: arte em papel claro, faixa de modo e nome embaixo. */
export function CardTile({ card, fileUrl, size = 92, onClick, selected }: {
  card: Card; fileUrl?: (n: string) => string; size?: number; onClick?: () => void; selected?: boolean;
}) {
  const empty = card.consumable && card.qty <= 0;
  return (
    <button
      type="button" className={`card-tile t-${card.type}${selected ? ' selected' : ''}${empty ? ' dim' : ''}`}
      style={{ ...tint(card), '--sz': `${size}px` } as CSSProperties} onClick={onClick} title={card.name}
    >
      <span className="ct-art">
        <Art card={card} fileUrl={fileUrl} />
        {card.mode === 'ativo' && <i className="ct-mode">Ativo</i>}
        {card.equipped && <i className="ct-eq" title="Equipado"><Check size={12} strokeWidth={3.5} /></i>}
        {(card.consumable || card.qty !== 1) && <i className="ct-qty">×{card.qty}</i>}
      </span>
      <span className="ct-name">{card.name}</span>
    </button>
  );
}

/** Ficha completa da carta. `width` em px. */
export function GameCard({ card, fileUrl, width = 300, onClick }: { card: Card; fileUrl?: (n: string) => string; width?: number; onClick?: () => void }) {
  const t = typeOf(card.type);
  const lines = card.tags.split(/[·|\n]/).map((x) => x.trim()).filter(Boolean);
  const big = card.stats.slice(0, 4);
  const small = card.stats.slice(4);
  return (
    <div className={`game-card t-${card.type}${card.consumable && card.qty <= 0 ? ' dim' : ''}${onClick ? ' clickable' : ''}`} style={{ ...tint(card), '--cw': `${width}px` } as CSSProperties} onClick={onClick}>
      <header className="gc-head">
        <div className="gc-head-text">
          <strong className="gc-name">{card.name}</strong>
          <span className="gc-status">{statusOf(card)}{card.equipped && <i className="gc-check"><Check size={10} strokeWidth={3.5} /></i>}<em>{t.label}</em></span>
        </div>
        <span className="gc-tile"><Art card={card} fileUrl={fileUrl} /></span>
      </header>
      {lines.length > 0 && <ul className="gc-lines">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
      {(card.mode || card.cooldown) && (
        <div className="gc-mode">
          <span>{card.mode === 'ativo' ? 'Ativo' : card.mode === 'passivo' ? 'Passivo' : ''}</span>
          {card.cooldown && <b className="gc-cd" title="Recarga"><GameIcon id="relogio" size={13} />{card.cooldown}</b>}
        </div>
      )}
      {card.description && <p className="gc-desc">{card.description}</p>}
      {big.length > 0 && (
        <div className={`gc-stats n${big.length}`}>
          {big.map((s, i) => <div key={i}><b>{s.v}</b><small>{s.l}</small></div>)}
        </div>
      )}
      {small.length > 0 && <div className="gc-stats-small">{small.map((s, i) => <span key={i}><b>{s.v}</b> {s.l}</span>)}</div>}
      {(card.roll || card.cost || card.consumable || card.qty !== 1) && (
        <footer className="gc-foot">
          {card.roll ? <span className="gc-roll"><GameIcon id="dado" size={14} /> {card.roll}</span> : <span />}
          <span className="gc-foot-right">
            {card.cost && <span className="gc-cost">{card.cost}</span>}
            {(card.consumable || card.qty !== 1) && <span className="gc-qty">×{card.qty}</span>}
          </span>
        </footer>
      )}
    </div>
  );
}

/** Editor completo de uma carta. `images`: imagens disponíveis para a arte (só o mestre tem biblioteca). */
export function CardEditor({ card, onSave, onClose, onDelete, images, fileUrl, title }: {
  card: Card; onSave: (c: Card) => void; onClose: () => void; onDelete?: () => void;
  images?: { file: string; name: string }[]; fileUrl?: (n: string) => string; title?: string;
}) {
  const [c, setC] = useState<Card>({ ...blankCard(card.type), ...card, stats: card.stats ?? [] });
  const up = (p: Partial<Card>) => setC((x) => ({ ...x, ...p }));
  const setType = (type: CardType) => setC((x) => ({ ...x, type, color: x.color === typeOf(x.type).color ? typeOf(type).color : x.color, icon: x.icon === typeOf(x.type).icon ? typeOf(type).icon : x.icon }));
  const setStat = (i: number, p: Partial<{ v: string; l: string }>) => up({ stats: c.stats.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  return (
    <Modal
      title={title ?? (card.id ? 'Editar carta' : 'Nova carta')} onClose={onClose} wide
      footer={<>
        {onDelete && <button className="btn danger-ghost" style={{ marginRight: 'auto', marginTop: 0 }} onClick={onDelete}>Excluir carta</button>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(c)}>Salvar carta</button>
      </>}
    >
      <div className="card-editor">
        <div className="card-editor-preview">
          <GameCard card={c} fileUrl={fileUrl} width={260} />
          <CardTile card={c} fileUrl={fileUrl} size={84} />
        </div>
        <div className="card-editor-form">
          <div className="seg card-type-seg">
            {CARD_TYPES.map((b) => typeOf(b.id)).map((t) => <button key={t.id} type="button" className={c.type === t.id ? 'on' : ''} onClick={() => setType(t.id)}><GameIcon id={t.icon} size={15} /> {t.label}</button>)}
          </div>
          <div className="insp-grid">
            <label className="field"><span>Nome</span><input value={c.name} maxLength={40} onChange={(e) => up({ name: e.target.value })} /></label>
            <label className="field"><span>Custo ou preço</span><input value={c.cost} maxLength={24} placeholder="Ex.: $800, 2 Alma, 1 ação" onChange={(e) => up({ cost: e.target.value })} /></label>
          </div>
          <div className="insp-grid card-three">
            <div className="field">
              <span>Modo</span>
              <div className="seg mini-seg">
                {([['', '—'], ['ativo', 'Ativo'], ['passivo', 'Passivo']] as const).map(([k, l]) => <button key={k} type="button" className={c.mode === k ? 'on' : ''} onClick={() => up({ mode: k })}>{l}</button>)}
              </div>
            </div>
            <label className="field"><span>Recarga</span><input value={c.cooldown} maxLength={12} placeholder="Ex.: 1 cena, 3 turnos" onChange={(e) => up({ cooldown: e.target.value })} /></label>
            <label className="field"><span>Rolagem ao usar</span><input value={c.roll} maxLength={40} placeholder="Ex.: 2d6+3" onChange={(e) => up({ roll: e.target.value })} /></label>
          </div>
          <div className="field">
            <span>No Bestiário</span>
            <div className="seg mini-seg hunt-seg">
              {([['', 'Nenhum'], ['dano', 'Dano'], ['cura', 'Cura'], ['defesa', 'Defesa']] as const).map(([k, l]) => <button key={k} type="button" className={(c.hunt ?? '') === k ? 'on' : ''} onClick={() => up({ hunt: k })}>{l}</button>)}
            </div>
            <small className="muted">{c.hunt === 'dano' ? 'A rolagem é o dano; o acerto usa o primeiro ataque da ficha.' : c.hunt === 'cura' ? 'A rolagem é a vida recuperada.' : c.hunt === 'defesa' ? 'A rolagem soma à Defesa até o próximo turno.' : 'A carta não vira ação no Bestiário.'} Cartas passivas não viram ação; custo como “2 Alma” gasta da barra.</small>
          </div>
          {c.type === 'habilidade' && <label className="check"><input type="checkbox" checked={!!c.origin} onChange={(e) => up({ origin: e.target.checked })} /> Vai em “{originName}” (vem da origem do personagem)</label>}
          <label className="field"><span>Bônus em linhas (separe com ·)</span><input value={c.tags} maxLength={60} placeholder="Ex.: +2 em Furtividade · Silenciosa · 9 m" onChange={(e) => up({ tags: e.target.value })} /></label>
          <label className="field"><span>Descrição</span><textarea value={c.description} maxLength={800} rows={3} onChange={(e) => up({ description: e.target.value })} /></label>
          <div className="field">
            <span>Quadros de números <small className="muted">(valor + legenda, até 6)</small></span>
            <div className="stat-rows">
              {c.stats.map((s, i) => (
                <div key={i} className="stat-row">
                  <input value={s.v} maxLength={12} placeholder="+3" onChange={(e) => setStat(i, { v: e.target.value })} />
                  <input value={s.l} maxLength={30} placeholder="Dano" onChange={(e) => setStat(i, { l: e.target.value })} />
                  <button type="button" className="icon-btn" title="Remover" onClick={() => up({ stats: c.stats.filter((_, j) => j !== i) })}>×</button>
                </div>
              ))}
              {c.stats.length < 6 && <button type="button" className="btn small" onClick={() => up({ stats: [...c.stats, { v: '', l: '' }] })}>+ Quadro</button>}
            </div>
          </div>
          <div className="field">
            <span>Nível na vitrine</span>
            <div className="rarity-row">
              {RARITIES.map((r) => <button key={r.id} type="button" className={c.rarity === r.id ? 'on' : ''} style={{ '--rar': r.color } as CSSProperties} onClick={() => up({ rarity: r.id })}>{r.label}</button>)}
            </div>
          </div>
          <div className="insp-grid">
            <div className="field">
              <span>Ícone</span>
              <IconPicker value={c.icon} onChange={(id) => up({ icon: id, image: null })} />
            </div>
            <div className="field">
              <span>Cores da carta</span>
              <div className="color-line">
                <input type="color" value={c.color} onChange={(e) => up({ color: e.target.value })} />
                {CARD_PAIRS.map((p) => <button key={p.id} type="button" className={`color-dot pair${cardPair(c).id === p.id ? ' on' : ''}`} style={{ background: `linear-gradient(135deg, ${p.dark} 50%, ${p.light} 50%)` }} title={p.name} onClick={() => up({ color: p.light })} />)}
              </div>
              {images && images.length > 0 && (
                <>
                  <span style={{ marginTop: 8 }}>Imagem da biblioteca</span>
                  <select value={c.image ?? ''} onChange={(e) => up({ image: e.target.value || null })}>
                    <option value="">(usar o ícone)</option>
                    {images.map((im) => <option key={im.file} value={im.file}>{im.name}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
          <div className="insp-grid">
            <label className="field"><span>Quantidade</span><input type="number" min={0} max={999} value={c.qty} onChange={(e) => up({ qty: Math.max(0, Math.min(999, Number(e.target.value) || 0)) })} /></label>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="check"><input type="checkbox" checked={c.consumable} onChange={(e) => up({ consumable: e.target.checked })} /> Consumível (gasta 1 ao usar)</label>
              {c.type === 'item' && <label className="check"><input type="checkbox" checked={c.equipped} onChange={(e) => up({ equipped: e.target.checked })} /> Equipado</label>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
