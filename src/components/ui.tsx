/* Peças de interface reutilizáveis: janela modal, menu suspenso e diálogos de confirmação. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar" aria-label="Fechar"><X size={16} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; checked?: boolean } | 'sep';

export function Menu({ items, children, title, className = 'icon-btn', align = 'right' }: { items: MenuItem[]; children: ReactNode; title?: string; className?: string; align?: 'left' | 'right' }) {
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; bottom: number } | null>(null);
  const close = () => setPos(null);
  useLayoutEffect(() => {
    if (!pos || !box.current) return;
    const el = box.current;
    const r = el.getBoundingClientRect();
    let top = pos.y;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, pos.bottom - r.height);
    let left = align === 'right' ? pos.x - r.width : pos.x;
    left = Math.min(Math.max(8, left), window.innerWidth - r.width - 8);
    el.style.top = `${top}px`; el.style.left = `${left}px`; el.style.visibility = 'visible';
  }, [pos, align]);
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', close); };
  }, [pos]);
  return (
    <>
      <button
        ref={btn} className={`${className}${pos ? ' active' : ''}`} title={title} aria-label={title} aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          const r = btn.current!.getBoundingClientRect();
          setPos(pos ? null : { x: align === 'right' ? r.right : r.left, y: r.bottom + 4, bottom: r.top - 4 });
        }}
      >{children}</button>
      {pos && createPortal(
        <div className="menu-backdrop" onMouseDown={close} onContextMenu={(e) => { e.preventDefault(); close(); }}>
          <div ref={box} className="menu" role="menu" style={{ visibility: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>
            {items.map((it, i) => it === 'sep' ? <div key={i} className="menu-sep" /> : (
              <button key={i} role="menuitem" className={`menu-item${it.danger ? ' danger' : ''}`} disabled={it.disabled} onClick={() => { close(); it.onClick(); }}>
                <span className="menu-icon">{it.checked ? '✓' : it.icon}</span>{it.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ───────────── diálogos (confirmar / perguntar um texto) ───────────── */

interface DialogReq {
  kind: 'confirm' | 'prompt';
  title: string; message?: string; label?: string; value?: string; confirmText?: string; danger?: boolean;
  resolve: (v: any) => void;
}
const useDialogs = create<{ current: DialogReq | null }>(() => ({ current: null }));

export function confirmDialog(o: { title: string; message?: string; confirmText?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => useDialogs.setState({ current: { ...o, kind: 'confirm', resolve } }));
}
export function promptDialog(o: { title: string; label?: string; value?: string; confirmText?: string }): Promise<string | null> {
  return new Promise((resolve) => useDialogs.setState({ current: { ...o, kind: 'prompt', resolve } }));
}

export function DialogHost() {
  const d = useDialogs((s) => s.current);
  const [value, setValue] = useState('');
  useEffect(() => { setValue(d?.value ?? ''); }, [d]);
  if (!d) return null;
  const finish = (v: any) => { useDialogs.setState({ current: null }); d.resolve(v); };
  const cancel = () => finish(d.kind === 'confirm' ? false : null);
  const ok = () => finish(d.kind === 'confirm' ? true : value.trim() || null);
  return (
    <Modal
      title={d.title} onClose={cancel}
      footer={<>
        <button className="btn" onClick={cancel}>Cancelar</button>
        <button className={`btn ${d.danger ? 'danger' : 'primary'}`} onClick={ok} autoFocus={d.kind === 'confirm'}>{d.confirmText ?? 'Confirmar'}</button>
      </>}
    >
      {d.message && <p className="dialog-msg">{d.message}</p>}
      {d.kind === 'prompt' && (
        <label className="field">
          {d.label && <span>{d.label}</span>}
          <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') ok(); }} />
        </label>
      )}
    </Modal>
  );
}

/** Campo de texto que confirma com Enter/sair do foco e cancela com Esc. */
export function InlineEdit({ value, onCommit, onCancel, className }: { value: string; onCommit: (v: string) => void; onCancel: () => void; className?: string }) {
  const [v, setV] = useState(value);
  const done = useRef(false);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit && v.trim() && v.trim() !== value) onCommit(v.trim()); else onCancel();
  };
  return (
    <input
      className={className ?? 'inline-edit'} autoFocus value={v} onChange={(e) => setV(e.target.value)} onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()} onBlur={() => finish(true)}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); }}
    />
  );
}

export function fmtDate(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
