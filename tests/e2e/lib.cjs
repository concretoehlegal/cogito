/*
 * Ajudante dos testes de interface: abre o COGITO (o build em dist/) com o Electron do projeto, numa pasta de dados
 * descartável. Cada roteiro imprime linhas "PASS ..." ou "FAIL ..." e o executor (run.cjs) junta o resultado.
 *
 * Pasta de trabalho (dados, PDFs exportados, capturas): COGITO_E2E_DIR ou <temp>/cogito-e2e.
 * Os arquivos de exemplo (fixtures/) são copiados para lá, porque os roteiros os leem por S/fixtures.
 */
const { _electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const APP = path.resolve(__dirname, '..', '..');
const S = process.env.COGITO_E2E_DIR || path.join(os.tmpdir(), 'cogito-e2e');
fs.mkdirSync(S, { recursive: true });
fs.cpSync(path.join(__dirname, 'fixtures'), path.join(S, 'fixtures'), { recursive: true });

/** Caminho do executável do Electron instalado no projeto (require('electron') devolve o caminho fora do Electron). */
const ELECTRON = require('electron');

async function launch(dataName = 'data', opts = {}) {
  const data = path.join(S, dataName);
  const app = await _electron.launch({
    executablePath: ELECTRON,
    args: [APP, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--disable-gpu', ...(opts.args || [])],
    env: { ...process.env, COGITO_DATA_DIR: path.join(data, 'docs'), COGITO_USER_DATA: path.join(data, 'user') },
  });
  const win = await app.firstWindow();
  const logs = [];
  win.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  win.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await win.waitForLoadState('domcontentloaded');
  if (opts.size) await app.evaluate(({ BrowserWindow }, s) => BrowserWindow.getAllWindows()[0].setSize(s[0], s[1]), opts.size);
  return { app, win, logs, data };
}
const shot = (win, name) => win.screenshot({ path: path.join(S, name + '.png') });
module.exports = { launch, shot, S, APP };
