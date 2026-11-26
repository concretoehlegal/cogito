import { useEffect } from 'react';
import { CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { api } from './api';
import { EditorScreen } from './components/EditorScreen';
import { Home } from './components/Home';
import { PlanScreen } from './planner/PlanScreen';
import { flushPlan } from './planner/state';
import './game/game.css';
import { DialogHost, confirmDialog } from './components/ui';
import { loadUserFonts } from './lib/fonts';
import { playClick } from './lib/sound';
import { dismissToast, saveNow, useApp } from './store';

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          {t.kind === 'error' ? <XCircle size={16} /> : t.kind === 'ok' ? <CheckCircle2 size={16} /> : <Info size={16} />}
          <span>{t.text}</span>
          {t.action && <button className="link-btn" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button className="icon-btn" aria-label="Dispensar" onClick={() => dismissToast(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function App() {
  const screen = useApp((s) => s.screen);
  const busy = useApp((s) => s.busy);
  const theme = useApp((s) => s.theme);

  const homeTab = useApp((s) => s.homeTab);
  // Módulo ativo na janela: o RPG (Planejador) tem destaque próprio (tokens em src/design/tokens.css).
  useEffect(() => {
    const rpg = screen === 'plano' || (screen === 'home' && homeTab !== 'livros');
    if (rpg) document.documentElement.dataset.module = 'rpg'; else delete document.documentElement.dataset.module;
  }, [screen, homeTab]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    void api.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    void loadUserFonts();
    const { spell, uiScale } = useApp.getState().prefs;
    void api.setSpellcheck(spell);
    if (uiScale !== 1) void api.setUiScale(uiScale);
    // Som discreto ao acionar botões, menus e itens das listas (os dados têm som próprio).
    const onPress = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.('button, [role="button"], [role="menuitem"], [role="option"], select, summary, .tree-row, label.check, input[type="checkbox"], input[type="radio"]');
      if (!el || el.closest('[data-silent]') || (el as HTMLButtonElement).disabled) return;
      playClick(el.matches('.tool-btn, .icon-btn, .row-menu, .twisty') ? 'soft' : 'tap');
    };
    window.addEventListener('pointerdown', onPress, true);
    return () => window.removeEventListener('pointerdown', onPress, true);
  }, []);

  useEffect(() => {
    // Ao fechar a janela: grava o que estiver pendente antes de sair.
    api.onBeforeClose(async () => {
      await flushPlan().catch(() => {});
      const ok = await saveNow();
      if (ok || await confirmDialog({ title: 'O livro não pôde ser salvo', message: 'Há alterações que não foram gravadas. Fechar agora pode perder as últimas mudanças.', confirmText: 'Fechar sem salvar', danger: true })) {
        void api.readyToClose();
      }
    });
    // Rede de segurança: se a janela perder o foco, grava imediatamente.
    const onBlur = () => { void saveNow(); };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  return (
    <>
      {screen === 'home' ? <Home /> : screen === 'plano' ? <PlanScreen /> : <EditorScreen />}
      <DialogHost />
      <Toasts />
      {busy && <div className="busy" role="status"><Loader2 size={22} className="spin" /> {busy}</div>}
    </>
  );
}
