import { setPrefs, useApp } from '../store';

const PANEL = { left: { key: 'leftWidth', min: 200, max: 520, initial: 286 }, right: { key: 'rightWidth', min: 240, max: 560, initial: 300 } } as const;

/** Alça entre um painel e as páginas: clique, segure e arraste para mudar a largura (duplo clique restaura). */
export function ResizeHandle({ side }: { side: 'left' | 'right' }) {
  const cfg = PANEL[side];
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = useApp.getState().prefs[cfg.key];
    const move = (ev: PointerEvent) => {
      const d = (ev.clientX - x0) * (side === 'left' ? 1 : -1);
      setPrefs({ [cfg.key]: Math.round(Math.min(cfg.max, Math.max(cfg.min, w0 + d))) });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('dragging-split'); };
    document.body.classList.add('dragging-split');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div
      className={`resize-handle ${side}`} role="separator" aria-orientation="vertical" title="Arraste para ajustar a largura (duplo clique restaura)"
      onPointerDown={start} onDoubleClick={() => setPrefs({ [cfg.key]: cfg.initial })}
    />
  );
}
