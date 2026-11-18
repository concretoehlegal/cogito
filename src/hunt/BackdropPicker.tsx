/* Seletor do fundo do Bestiário: miniaturas das opções, imagem própria, círculo de runas e escurecer a imagem. */
import type { CSSProperties } from 'react';
import { ImagePlus } from 'lucide-react';
import { api, errorText } from '../api';
import { setPrefs, toast, useApp } from '../store';
import { BACKDROPS, type BackdropKind } from './Desk';

export const huntBgUrl = (name: string | null | undefined) => (name ? `cogito://app/__huntbg/${encodeURIComponent(name)}` : null);

export function BackdropPicker({ compact }: { compact?: boolean }) {
  const prefs = useApp((s) => s.prefs);
  const kind = prefs.huntBg;
  const wood = kind === 'mesa' || kind === 'ritual';
  const pickImage = async () => {
    try {
      const name = await api.huntPickBackground();
      if (name) setPrefs({ huntBg: 'imagem', huntBgImage: name });
    } catch (e) { toast(errorText(e), 'error'); }
  };
  const choose = (id: BackdropKind) => {
    if (id === 'imagem' && !prefs.huntBgImage) { void pickImage(); return; }
    setPrefs({ huntBg: id });
  };
  const img = huntBgUrl(prefs.huntBgImage);
  return (
    <div className={`bp${compact ? ' compact' : ''}`}>
      <div className="bp-grid" role="radiogroup" aria-label="Fundo do Bestiário">
        {BACKDROPS.map((b) => (
          <button key={b.id} type="button" role="radio" aria-checked={kind === b.id} className={`bp-opt${kind === b.id ? ' on' : ''}`} onClick={() => choose(b.id)} title={b.label}>
            <span className={`bp-sw sw-${b.id}`} style={b.id === 'imagem' && img ? ({ backgroundImage: `url("${img}")` } as CSSProperties) : undefined}>
              {b.id === 'imagem' && !img && <ImagePlus size={18} />}
            </span>
            <span className="bp-label">{b.label}</span>
          </button>
        ))}
      </div>
      <div className="bp-opts">
        {kind === 'imagem' && <button type="button" className="btn small" onClick={() => { void pickImage(); }}><ImagePlus size={14} /> {img ? 'Trocar imagem' : 'Escolher imagem'}</button>}
        <label className={`check${wood ? ' disabled' : ''}`} title={wood ? 'As mesas sempre têm o círculo' : undefined}>
          <input type="checkbox" checked={wood || prefs.huntCircle} disabled={wood} onChange={(e) => setPrefs({ huntCircle: e.target.checked })} /> Círculo de runas
        </label>
        {kind === 'imagem' && (
          <label className="bp-dim">
            <span>Escurecer a imagem</span>
            <input type="range" min={0} max={0.8} step={0.05} value={prefs.huntBgDim} onChange={(e) => setPrefs({ huntBgDim: Number(e.target.value) })} />
          </label>
        )}
      </div>
    </div>
  );
}
