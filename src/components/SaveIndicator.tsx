/* Indicadores de salvamento: a cápsula no topo do cartão do livro e a versão compacta da barra flutuante. */
import { AlertTriangle } from 'lucide-react';
import { saveNow, useApp } from '../store';
import { fmtTime } from './ui';

export function SavePill() {
  const save = useApp((s) => s.save);
  if (save.state === 'error') {
    return (
      <button className="save-pill error" title={`${save.error ?? 'Erro ao salvar'} — clique para tentar de novo`} onClick={() => { void saveNow(); }}>
        <AlertTriangle size={12} /> Não salvou — tentar de novo
      </button>
    );
  }
  if (save.state === 'saving' || save.state === 'dirty') {
    return <span className="save-pill pending" title="As alterações são gravadas automaticamente">Salvando…</span>;
  }
  return <span className="save-pill ok" title="Todas as alterações estão gravadas neste computador">Salvo{save.at ? ` · ${fmtTime(save.at)}` : ''}</span>;
}

export function StatusSave() {
  const save = useApp((s) => s.save);
  if (save.state === 'error') {
    return <button className="status-save error" title={`${save.error ?? 'Erro ao salvar'} — clique para tentar de novo`} onClick={() => { void saveNow(); }}><AlertTriangle size={13} /> Não salvou</button>;
  }
  return <span className="status-save">{save.state === 'saved' ? 'Salvo' : 'Salvando…'}</span>;
}
