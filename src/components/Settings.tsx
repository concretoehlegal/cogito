/* Configurações: livro aberto, backups e preferências do aplicativo (sons, animação, tema, fonte dos títulos). */
import { useEffect, useState } from 'react';
import { FolderOpen, RotateCcw } from 'lucide-react';
import { api, errorText, formatBytes, type BackupInfo } from '../api';
import { loadUserFonts, useFonts, type FontSource } from '../lib/fonts';
import { playClick } from '../lib/sound';
import { FORMATS, type PageFormat, type PageStyle } from '../model';
import { restoreBackup, saveNow, setBookProps, setPrefs, setTheme, toast, useApp } from '../store';
import { Modal, confirmDialog, fmtDate } from './ui';

function Preferences() {
  const prefs = useApp((s) => s.prefs);
  const theme = useApp((s) => s.theme);
  const fonts = useFonts();
  const where = (src: FontSource, missing: string) => (src === 'pasta' ? 'carregada da pasta de fontes' : src === 'sistema' ? 'instalada no computador' : missing);
  const [scale, setScale] = useState(prefs.uiScale);
  return (
    <section>
      <h3>Preferências</h3>
      <label className="check"><input type="checkbox" checked={prefs.sound} onChange={(e) => { setPrefs({ sound: e.target.checked }); if (e.target.checked) playClick(); }} /> Sons de clique e de dados</label>
      <label className="field">
        <span>Volume dos sons</span>
        <input type="range" min={0} max={1} step={0.05} value={prefs.volume} disabled={!prefs.sound} onChange={(e) => setPrefs({ volume: Number(e.target.value) })} onPointerUp={() => playClick()} />
      </label>
      <label className="check" title="Sublinha palavras com erro de ortografia; clique com o botão direito para ver sugestões">
        <input type="checkbox" checked={prefs.spell} onChange={(e) => setPrefs({ spell: e.target.checked })} /> Corretor ortográfico (português)
      </label>
      <label className="check"><input type="checkbox" checked={prefs.diceAnim} onChange={(e) => setPrefs({ diceAnim: e.target.checked })} /> Animar a rolagem dos dados</label>
      <label className="check" title="Luzinhas piscando e o gorro de Papai Noel no logo (edição Pesadelos Antes do Natal)"><input type="checkbox" checked={prefs.xmas} onChange={(e) => setPrefs({ xmas: e.target.checked })} /> Enfeites de Natal</label>
      <label className="field">
        <span>Tamanho da interface — {Math.round(scale * 100)}%</span>
        <input
          type="range" min={0.8} max={1.5} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))}
          onPointerUp={() => setPrefs({ uiScale: scale })} onKeyUp={() => setPrefs({ uiScale: scale })}
        />
        <small>Aumenta ou diminui menus, barras e textos do aplicativo. As larguras dos painéis laterais se ajustam arrastando a borda deles.</small>
      </label>
      <label className="field">
        <span>Tema</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}>
          <option value="dark">Escuro</option>
          <option value="light">Claro</option>
        </select>
      </label>
      <div className="field">
        <span>Fonte dos capítulos (páginas do livro)</span>
        <div className="font-status">
          <b style={{ fontFamily: 'var(--f-chapter)' }}>Bree Serif</b>
          <span>capítulos · {where(fonts.chapter, 'Regular com negrito aplicado')}</span>
        </div>
        <small>
          A versão gratuita da Bree Serif só tem o peso Regular (o negrito é aplicado pelo app). Se tiver o arquivo da
          Bree Serif Bold, instale-o no Windows ou copie-o para a pasta de fontes (com “Bree” e “Bold” no nome).
        </small>
        <div className="backup-actions">
          <button className="btn small" onClick={() => { void api.openFontsFolder(); }}><FolderOpen size={13} /> Abrir pasta de fontes</button>
          <button className="btn small" onClick={() => { void loadUserFonts(); }}><RotateCcw size={13} /> Verificar de novo</button>
        </div>
      </div>
    </section>
  );
}

export function Settings({ onClose }: { onClose: () => void }) {
  const book = useApp((s) => s.book);
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [dataDir, setDataDir] = useState('');
  const [version, setVersion] = useState('');
  const bookId = book?.id;

  useEffect(() => {
    if (bookId) api.listBackups(bookId).then(setBackups, () => setBackups([]));
    api.info().then((i) => { setDataDir(i.dataDir); setVersion(i.version); }, () => {});
  }, [bookId]);

  const backupNow = async () => {
    if (!bookId) return;
    try { await saveNow(); setBackups(await api.backupNow(bookId)); toast('Backup criado.', 'ok'); }
    catch (e) { toast(`Não foi possível criar o backup: ${errorText(e)}`, 'error'); }
  };
  const restore = async (b: BackupInfo) => {
    if (!(await confirmDialog({ title: 'Restaurar backup', message: `Voltar o livro para a versão de ${fmtDate(b.at)}? A versão atual será guardada como um novo backup antes.`, confirmText: 'Restaurar' }))) return;
    await restoreBackup(b.file);
    onClose();
  };

  return (
    <Modal title="Configurações" onClose={onClose} wide={!!book} footer={<><span className="muted small settings-version">{version ? `COGITO ${version}` : ''}</span><span className="grow" /><button className="btn primary" onClick={onClose}>Concluir</button></>}>
      {!book ? <Preferences /> : (
        <div className="settings-grid">
          <section>
            <h3>Livro</h3>
            <label className="field"><span>Título</span><input value={book.title} onChange={(e) => setBookProps({ title: e.target.value })} /></label>
            <label className="field"><span>Autor</span><input value={book.author} placeholder="Seu nome (vai nas propriedades do arquivo exportado)" onChange={(e) => setBookProps({ author: e.target.value })} /></label>
            <label className="field">
              <span>Formato padrão das páginas</span>
              <select value={book.format} onChange={(e) => setBookProps({ format: e.target.value as PageFormat })}>
                {(Object.keys(FORMATS) as PageFormat[]).map((f) => <option key={f} value={f}>{FORMATS[f].label}</option>)}
              </select>
              <small>Cada página pode usar um formato próprio, escolhido na barra acima dela.</small>
            </label>
            <label className="field">
              <span>Cor do papel</span>
              <select value={book.pageStyle} onChange={(e) => setBookProps({ pageStyle: e.target.value as PageStyle })}>
                <option value="cinza">Cinza</option>
                <option value="branco">Branco</option>
                <option value="pergaminho">Pergaminho</option>
              </select>
              <small>O PDF exportado sai com a mesma cor de papel.</small>
            </label>
            <label className="check"><input type="checkbox" checked={book.showPageNumbers} onChange={(e) => setBookProps({ showPageNumbers: e.target.checked })} /> Numerar as páginas</label>
            {book.showPageNumbers && (
              <div className="seg page-num-seg" role="radiogroup" aria-label="Formato do contador de páginas">
                {([['numero', '3'], ['contador', '3 / 12'], ['extenso', 'Página 3 de 12']] as const).map(([k, l]) => (
                  <button key={k} type="button" className={(book.pageNumberStyle ?? 'contador') === k ? 'on' : ''} onClick={() => setBookProps({ pageNumberStyle: k })}>{l}</button>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 22 }}>Backups automáticos</h3>
            <p className="muted small">Cópias de segurança são criadas ao abrir o livro e a cada 5 minutos de trabalho. Ficam as 40 mais recentes.</p>
            <div className="backup-actions">
              <button className="btn small" onClick={backupNow}>Criar backup agora</button>
              <button className="btn small" onClick={() => { void api.openDataFolder(); }}><FolderOpen size={13} /> Abrir pasta dos dados</button>
            </div>
            <ul className="backup-list">
              {(backups ?? []).map((b) => (
                <li key={b.file}>
                  <span>{fmtDate(b.at)}</span><span className="muted">{formatBytes(b.size)}</span>
                  <button className="btn small" onClick={() => restore(b)}><RotateCcw size={13} /> Restaurar</button>
                </li>
              ))}
              {backups && !backups.length && <li className="muted">Nenhum backup ainda.</li>}
            </ul>
            {dataDir && <p className="muted small path">Dados em: {dataDir}</p>}
          </section>
          <Preferences />
        </div>
      )}
    </Modal>
  );
}
