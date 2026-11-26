/* Tela inicial: lista de livros guardados neste computador. */
import { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, Home as HomeIcon, Map as MapIcon, MoreHorizontal, Pencil, Plus, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { api } from '../api';
import { FORMATS, type PageFormat } from '../model';
import { createBook, deleteBook, openBook, refreshBooks, renameBookOnDisk, setHomeTab, useApp, type HomeTab } from '../store';
import { PlanList } from '../planner/PlanList';
import { BrandLogo, TitleStrip, XmasLights } from './Logo';
import { Settings } from './Settings';
import { IconLibrary } from './icons';
import { xmasOn } from '../lib/season';
import { Menu, Modal, confirmDialog, fmtDate, promptDialog } from './ui';

function NewBookDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<PageFormat>('A4');
  const create = () => { void createBook(title, format); onClose(); };
  return (
    <Modal
      title="Novo livro" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={create}>Criar livro</button></>}
    >
      <label className="field"><span>Título</span>
        <input autoFocus value={title} placeholder="Ex.: Crônicas de Valdória — Livro do Jogador" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
      </label>
      <div className="field"><span>Formato das páginas</span>
        <div className="format-choice">
          {(Object.keys(FORMATS) as PageFormat[]).map((f) => (
            <button key={f} className={`format-card${format === f ? ' on' : ''}`} onClick={() => setFormat(f)} aria-pressed={format === f}>
              <span className={`format-thumb ${f}`} /><strong>{f}</strong><small>{FORMATS[f].w} × {FORMATS[f].h} mm</small>
            </button>
          ))}
        </div>
        <small>Você pode mudar o formato depois, inclusive página a página.</small>
      </div>
    </Modal>
  );
}

const MODES: { id: HomeTab; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'livros', label: 'Escritor', desc: 'Escreva e diagrame livros', icon: <IconLibrary size={17} /> },
  { id: 'planejador', label: 'Planejador de Campanhas', desc: 'Quadros das suas campanhas', icon: <MapIcon size={17} /> },
];

export function Home() {
  const books = useApp((s) => s.books);
  const loaded = useApp((s) => s.booksLoaded);
  const tab = useApp((s) => s.homeTab);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [dataDir, setDataDir] = useState('');
  const xmas = useApp((st) => xmasOn(st.prefs.xmas));
  useEffect(() => { void refreshBooks(); api.info().then((i) => setDataDir(i.dataDir), () => {}); }, []);
  // O Planejador usa o tema noir de Cair da Noite; o Escritor mantém o visual de editor.
  useEffect(() => {
    const on = tab !== 'livros';
    document.documentElement.classList.toggle('noir', on);
    return () => document.documentElement.classList.remove('noir');
  }, [tab]);

  return (
    <div className={`home home-${tab}`}>
      <TitleStrip />
      <div className="home-body">
        <aside className="side-nav" aria-label="Áreas do COGITO">
          <div className="sn-brand" title="COGITO">
            <span className="sn-logo"><BrandLogo size={26} /></span>
            <strong>COGITO</strong>
          </div>
          <div className="sn-group" role="tablist">
            {MODES.map((m) => (
              <button key={m.id} role="tab" aria-selected={tab === m.id} title={m.desc} className={`sn-item mode-tab mode-${m.id}${tab === m.id ? ' on' : ''}`} onClick={() => setHomeTab(m.id)}>
                {m.icon}<span className="mode-text"><strong>{m.label}</strong></span>
              </button>
            ))}
          </div>
          <div className="sn-group">
            <button className="sn-item" onClick={() => setSettings(true)}><SettingsIcon size={17} /><span>Configurações</span></button>
            <button className="sn-item" onClick={() => { void api.openDataFolder(); }}><FolderOpen size={17} /><span>Pasta dos dados</span></button>
          </div>
          <span className="grow" />
          <div className="sn-card">
            {xmas && <XmasLights segments={3} className="card" />}
            <span className="sn-card-icon"><BrandLogo size={22} /></span>
            {xmas && <span className="sn-edition">Edição “Pesadelos Antes do Natal”</span>}
            <strong>Tudo fica neste computador</strong>
            <p>Livros, campanhas e imagens são salvos localmente, sem internet.</p>
            {dataDir && <span className="sn-path" title={dataDir}>{dataDir}</span>}
            <button className="btn block" onClick={() => { void api.openDataFolder(); }}><FolderOpen size={14} /> Abrir pasta</button>
          </div>
        </aside>
        <div className="home-main">
        <div className="home-inner">
          <div className="home-crumb"><HomeIcon size={15} /> {MODES.find((m) => m.id === tab)?.label}</div>
          {tab === 'planejador' ? <PlanList /> : (<>
          <div className="home-head">
            <div>
              <h1>Meus livros</h1>
              <p className="muted">Tudo fica guardado neste computador, sem internet.</p>
            </div>
            <button className="btn primary big" onClick={() => setCreating(true)}><Plus size={17} /> Novo livro</button>
          </div>

          {loaded && !books.length && (
            <div className="empty-state home-empty">
              <BookOpen size={40} strokeWidth={1.2} />
              <h3>Nenhum livro ainda</h3>
              <p>Crie seu primeiro livro de RPG para começar a escrever.</p>
              <button className="btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Novo livro</button>
            </div>
          )}

          <div className="book-grid">
            {books.map((b) => (
              <div key={b.id} className="book-card" role="button" tabIndex={0} onClick={() => { void openBook(b.id); }} onKeyDown={(e) => { if (e.key === 'Enter') void openBook(b.id); }}>
                <div className="book-cover"><IconLibrary size={40} /></div>
                <div className="book-info">
                  <strong title={b.title}>{b.title}</strong>
                  <span className="muted">{b.pageCount} página(s) · {b.chapterCount} capítulo(s) · {b.format}</span>
                  <span className="muted">Alterado em {fmtDate(b.updatedAt)}</span>
                </div>
                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <Menu
                    className="icon-btn" title="Opções do livro"
                    items={[
                      { label: 'Abrir', icon: <BookOpen size={14} />, onClick: () => { void openBook(b.id); } },
                      { label: 'Renomear', icon: <Pencil size={14} />, onClick: async () => { const t = await promptDialog({ title: 'Renomear livro', label: 'Título', value: b.title, confirmText: 'Renomear' }); if (t) await renameBookOnDisk(b.id, t); } },
                      'sep',
                      { label: 'Excluir', icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir livro', message: `Excluir “${b.title}” com todas as páginas, imagens e anexos? O livro vai para a lixeira do computador.`, confirmText: 'Excluir livro', danger: true })) await deleteBook(b.id); } },
                    ]}
                  ><MoreHorizontal size={16} /></Menu>
                </span>
              </div>
            ))}
          </div>

          </>)}
        </div>
        </div>
      </div>
      {creating && <NewBookDialog onClose={() => setCreating(false)} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
