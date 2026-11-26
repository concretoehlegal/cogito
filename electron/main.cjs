'use strict';
/*
 * COGITO — processo principal (Electron).
 * Responsável por: janela, armazenamento local dos livros, backups,
 * biblioteca de PDFs, anexos de consulta e gravação das exportações.
 * Nada aqui acessa a internet.
 */
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, session, Menu, nativeTheme, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { createPlanner } = require('./planner.cjs');

const DEV_URL = process.env.COGITO_DEV_URL || '';
const DIST = path.join(__dirname, '..', 'dist');
const APP_ORIGIN = 'cogito://app';

if (process.env.COGITO_USER_DATA) app.setPath('userData', process.env.COGITO_USER_DATA);

protocol.registerSchemesAsPrivileged([
  { scheme: 'cogito', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

let DATA, BOOKS, LIB, TRASH, RECOVERY, FONTS;
let planner = null;
let win = null;
let allowClose = false;
const approvedExportPaths = new Set();

/* ───────────────────────── utilidades ───────────────────────── */

const newId = (prefix) => `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
const ID_RE = /^[A-Za-z0-9_-]{4,60}$/;
function safeId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('Identificador inválido.');
  return id;
}
function safeName(name) {
  const base = path.basename(String(name));
  if (!base || base === '.' || base === '..') throw new Error('Nome de arquivo inválido.');
  return base;
}
const bookDir = (id) => path.join(BOOKS, safeId(id));
const bookFile = (id) => path.join(bookDir(id), 'livro.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => fsp.access(p).then(() => true, () => false);

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function renameRetry(from, to) {
  let lastErr;
  for (let i = 0; i < 6; i++) {
    try { await fsp.rename(from, to); return; }
    catch (e) { lastErr = e; if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) break; await sleep(80 * (i + 1)); }
  }
  throw lastErr;
}

function isBook(o) {
  return !!o && typeof o === 'object' && typeof o.id === 'string' && typeof o.title === 'string' && Array.isArray(o.chapters);
}
function parseBook(text) {
  const o = JSON.parse(text);
  if (!isBook(o)) throw new Error('Arquivo de livro inválido.');
  return o;
}
async function readBookFile(file) { return parseBook(await fsp.readFile(file, 'utf8')); }

/** Grava sem risco de deixar o arquivo pela metade: escreve em um temporário e só então substitui. */
async function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  const fh = await fsp.open(tmp, 'w');
  try { await fh.writeFile(text, 'utf8'); await fh.sync(); } finally { await fh.close(); }
  // A versão anterior (se estiver íntegra) vira a cópia ".bak".
  try { parseBook(await fsp.readFile(file, 'utf8')); await fsp.copyFile(file, `${file}.bak`); } catch { /* sem versão anterior válida */ }
  await renameRetry(tmp, file);
}

function countPages(book) {
  let n = 0;
  for (const c of book.chapters) { n += (c.pages || []).length; for (const s of c.sections || []) n += (s.pages || []).length; }
  return n;
}
const metaOf = (b) => ({
  id: b.id, title: b.title, author: b.author || '', format: b.format || 'A4',
  createdAt: b.createdAt || 0, updatedAt: b.updatedAt || 0, pageCount: countPages(b), chapterCount: b.chapters.length,
});

/* ───────────────────────── backups ───────────────────────── */

const BACKUP_INTERVAL = 5 * 60 * 1000;
const BACKUP_KEEP = 40;
const lastBackupAt = new Map();

async function listBackups(id) {
  const dir = path.join(bookDir(id), 'backups');
  let names = [];
  try { names = await fsp.readdir(dir); } catch { return []; }
  const out = [];
  for (const name of names.filter((n) => /^livro-\d{8}-\d{6}\.json$/.test(n))) {
    try { const st = await fsp.stat(path.join(dir, name)); out.push({ file: name, at: st.mtimeMs, size: st.size }); } catch { /* ignora */ }
  }
  return out.sort((a, b) => b.file.localeCompare(a.file));
}

async function makeBackup(id, text, force) {
  const now = Date.now();
  if (!force && now - (lastBackupAt.get(id) || 0) < BACKUP_INTERVAL) return;
  const dir = path.join(bookDir(id), 'backups');
  await fsp.mkdir(dir, { recursive: true });
  const list = await listBackups(id);
  if (list[0]) {
    try { if ((await fsp.readFile(path.join(dir, list[0].file), 'utf8')) === text) { lastBackupAt.set(id, now); return; } } catch { /* segue */ }
  }
  await fsp.writeFile(path.join(dir, `livro-${stamp()}.json`), text, 'utf8');
  lastBackupAt.set(id, now);
  for (const old of list.slice(BACKUP_KEEP - 1)) await fsp.rm(path.join(dir, old.file), { force: true });
}

/* ───────────────────────── livros ───────────────────────── */

const saveQueues = new Map();
function enqueue(id, job) {
  const prev = saveQueues.get(id) || Promise.resolve();
  const next = prev.then(job, job);
  saveQueues.set(id, next.catch(() => {}));
  return next;
}

async function saveBook(book) {
  if (!isBook(book)) throw new Error('Dados do livro inválidos.');
  const id = safeId(book.id);
  return enqueue(id, async () => {
    const savedAt = Date.now();
    const text = JSON.stringify({ ...book, updatedAt: savedAt });
    const recoveryFile = path.join(RECOVERY, `${id}.json`);
    try {
      await fsp.mkdir(bookDir(id), { recursive: true });
      await writeAtomic(bookFile(id), text);
    } catch (err) {
      // Não conseguiu gravar na pasta do livro: guarda uma cópia de recuperação em outro local.
      let rescued = false;
      try { await fsp.mkdir(RECOVERY, { recursive: true }); await fsp.writeFile(recoveryFile, text, 'utf8'); rescued = true; } catch { /* nada a fazer */ }
      const e = new Error(`${err.message}${rescued ? ' (uma cópia de recuperação foi guardada)' : ''}`);
      throw e;
    }
    await fsp.rm(recoveryFile, { force: true }).catch(() => {});
    await makeBackup(id, text, false).catch(() => {});
    return { savedAt };
  });
}

async function loadBook(id) {
  safeId(id);
  const dir = bookDir(id);
  const main = bookFile(id);
  const candidates = [{ file: main, label: null }, { file: `${main}.bak`, label: 'a cópia de segurança mais recente' }];
  for (const b of await listBackups(id)) candidates.push({ file: path.join(dir, 'backups', b.file), label: `o backup de ${new Date(b.at).toLocaleString('pt-BR')}` });

  let book = null; let recoveredFrom = null;
  for (const c of candidates) {
    try { book = await readBookFile(c.file); recoveredFrom = c.label; break; } catch { /* tenta o próximo */ }
  }
  // Cópia de recuperação (gravada quando um salvamento falhou) mais nova que o arquivo principal?
  try {
    const rec = await readBookFile(path.join(RECOVERY, `${id}.json`));
    if (!book || (rec.updatedAt || 0) > (book.updatedAt || 0)) { book = rec; recoveredFrom = 'a cópia de recuperação automática'; }
  } catch { /* sem recuperação */ }

  if (!book) throw new Error('Não foi possível abrir este livro: o arquivo está ilegível e não há backup disponível.');
  if (recoveredFrom) {
    // Preserva o arquivo problemático para análise em vez de sobrescrevê-lo.
    if (await exists(main)) await fsp.copyFile(main, path.join(dir, `livro.corrompido-${stamp()}.json`)).catch(() => {});
  } else {
    await makeBackup(id, JSON.stringify(book), true).catch(() => {});
  }
  return { book, recoveredFrom };
}

async function listBooks() {
  let dirs = [];
  try { dirs = await fsp.readdir(BOOKS, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const d of dirs) {
    if (!d.isDirectory() || !ID_RE.test(d.name)) continue;
    const f = path.join(BOOKS, d.name, 'livro.json');
    let b = null;
    try { b = await readBookFile(f); } catch { try { b = await readBookFile(`${f}.bak`); } catch { /* ilegível */ } }
    if (b) out.push(metaOf({ ...b, id: d.name }));
    else if (await exists(f) || (await listBackups(d.name)).length) out.push({ id: d.name, title: '(livro com problema — abra para recuperar)', author: '', format: 'A4', createdAt: 0, updatedAt: 0, pageCount: 0, chapterCount: 0 });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function moveToTrash(target) {
  try { await shell.trashItem(target); return 'lixeira do sistema'; }
  catch {
    await fsp.mkdir(TRASH, { recursive: true });
    await renameRetry(target, path.join(TRASH, `${path.basename(target)}-${stamp()}`));
    return 'pasta Lixeira do COGITO';
  }
}

/* ───────────────────────── biblioteca ───────────────────────── */

const libIndexFile = () => path.join(LIB, 'biblioteca.json');
async function readLibrary() {
  let items = [];
  try { const o = JSON.parse(await fsp.readFile(libIndexFile(), 'utf8')); if (Array.isArray(o.items)) items = o.items; } catch { /* vazio */ }
  let files = [];
  try { files = (await fsp.readdir(LIB)).filter((n) => /\.pdf$/i.test(n)); } catch { /* vazio */ }
  const known = new Set(items.map((i) => i.file));
  let changed = false;
  const kept = items.filter((i) => files.includes(i.file));
  if (kept.length !== items.length) changed = true;
  // PDFs copiados manualmente para a pasta também aparecem na biblioteca.
  for (const f of files) {
    if (known.has(f)) continue;
    const st = await fsp.stat(path.join(LIB, f));
    kept.push({ id: newId('pdf'), title: f.replace(/\.pdf$/i, ''), file: f, size: st.size, addedAt: Date.now() });
    changed = true;
  }
  if (changed) await writeLibrary(kept);
  return kept;
}
async function writeLibrary(items) {
  await fsp.mkdir(LIB, { recursive: true });
  const tmp = `${libIndexFile()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify({ items }, null, 1), 'utf8');
  await renameRetry(tmp, libIndexFile());
}
const libView = (i) => ({ ...i, url: `${APP_ORIGIN}/__lib/${encodeURIComponent(i.file)}` });

async function uniqueName(dir, name) {
  const ext = path.extname(name); const base = path.basename(name, ext);
  let candidate = name; let n = 2;
  while (await exists(path.join(dir, candidate))) candidate = `${base} (${n++})${ext}`;
  return candidate;
}

/* ───────────────────────── protocolo local ───────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream', '.wasm': 'application/wasm',
};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

async function serveFile(file, request, extraHeaders = {}) {
  let st;
  try { st = await fsp.stat(file); if (!st.isFile()) throw new Error('not file'); }
  catch { return new Response('Não encontrado', { status: 404 }); }
  const headers = {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges', ...extraHeaders,
  };
  const range = request.headers.get('range');
  const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    let end = m[1] && m[2] ? Number(m[2]) : st.size - 1;
    end = Math.min(end, st.size - 1);
    if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${st.size}` } });
    const len = end - start + 1;
    headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
    headers['Content-Length'] = String(len);
    if (len <= 8 * 1024 * 1024) {
      const fh = await fsp.open(file, 'r');
      try { const buf = Buffer.alloc(len); await fh.read(buf, 0, len, start); return new Response(buf, { status: 206, headers }); }
      finally { await fh.close(); }
    }
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), { status: 206, headers });
  }
  headers['Content-Length'] = String(st.size);
  if (st.size <= 8 * 1024 * 1024) return new Response(await fsp.readFile(file), { status: 200, headers });
  return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers });
}

function registerProtocol() {
  protocol.handle('cogito', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Não encontrado', { status: 404 });
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (parts[0] === '__img' && parts.length === 3) return serveFile(path.join(bookDir(parts[1]), 'imagens', safeName(parts[2])), request);
      if (parts[0] === '__ref' && parts.length === 3) return serveFile(path.join(bookDir(parts[1]), 'anexos', safeName(parts[2])), request);
      if (parts[0] === '__lib' && parts.length === 2) return serveFile(path.join(LIB, safeName(parts[1])), request);
      if (parts[0] === '__font' && parts.length === 2) return serveFile(path.join(FONTS, safeName(parts[1])), request);
      if (parts[0] === '__plan' && parts.length === 3) { const f = planner && planner.localFile(parts[1], parts[2]); return f ? serveFile(f, request) : new Response('Não encontrado', { status: 404 }); }
      const rel = parts.length ? path.join(...parts) : 'index.html';
      const file = path.resolve(DIST, rel);
      if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response('Proibido', { status: 403 });
      return serveFile(file, request, file.endsWith('.html') ? { 'Content-Security-Policy': CSP } : {});
    } catch (e) {
      return new Response(String(e && e.message), { status: 400 });
    }
  });
}

/* ───────────────────────── janela ───────────────────────── */

const TITLEBAR = { dark: { color: '#262626', symbolColor: '#bdbdbd' }, light: { color: '#c8c8c8', symbolColor: '#2c2c2c' } };
const WINDOW_BG = { dark: '#3a3a3a', light: '#dcdcdc' };

function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 820, minHeight: 560,
    backgroundColor: WINDOW_BG.dark, show: false, title: 'COGITO',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...TITLEBAR.dark, height: 34 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!(url.startsWith(APP_ORIGIN) || (DEV_URL && url.startsWith(DEV_URL)))) e.preventDefault();
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (!app.isPackaged && input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
  // Botão direito: sugestões do corretor ortográfico e recortar/copiar/colar.
  win.webContents.on('context-menu', (_e, p) => {
    const items = [];
    if (p.misspelledWord) {
      for (const s of p.dictionarySuggestions.slice(0, 6)) items.push({ label: s, click: () => win.webContents.replaceMisspelling(s) });
      if (!p.dictionarySuggestions.length) items.push({ label: 'Sem sugestões', enabled: false });
      items.push({ type: 'separator' });
      items.push({ label: `Adicionar “${p.misspelledWord}” ao dicionário`, click: () => win.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
      items.push({ type: 'separator' });
    }
    if (p.isEditable) {
      items.push({ label: 'Recortar', role: 'cut', enabled: p.editFlags.canCut });
      items.push({ label: 'Copiar', role: 'copy', enabled: p.editFlags.canCopy });
      items.push({ label: 'Colar', role: 'paste', enabled: p.editFlags.canPaste });
      items.push({ label: 'Selecionar tudo', role: 'selectAll', enabled: p.editFlags.canSelectAll });
    } else if (p.selectionText && p.selectionText.trim()) {
      items.push({ label: 'Copiar', role: 'copy' });
    }
    while (items.length && items[items.length - 1].type === 'separator') items.pop();
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

  // Ao fechar, dá ao editor a chance de gravar o que estiver pendente.
  let unresponsive = false;
  win.on('unresponsive', () => { unresponsive = true; });
  win.on('responsive', () => { unresponsive = false; });
  win.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    win.webContents.send('app:before-close');
    // Se a interface travou e não responde, não prende o usuário: fecha depois de alguns segundos.
    setTimeout(() => {
      if (win && !win.isDestroyed() && !allowClose && (unresponsive || win.webContents.isCrashed())) { allowClose = true; win.close(); }
    }, 5000);
  });
  win.webContents.on('render-process-gone', () => { allowClose = true; });
  win.on('closed', () => { win = null; });
  win.loadURL(DEV_URL || `${APP_ORIGIN}/index.html`);
}

/* ───────────────────────── corretor ortográfico ───────────────────────── */

/**
 * O corretor funciona sem internet: o dicionário de português do Brasil vem dentro do aplicativo
 * e são copiados para a pasta onde o Chromium os procura. No Windows, quando o idioma está instalado no
 * sistema, o próprio corretor do Windows é usado.
 */
async function setupSpellchecker() {
  const ses = session.defaultSession;
  try {
    const src = path.join(__dirname, '..', 'build', 'dicionarios');
    const dest = path.join(app.getPath('userData'), 'Dictionaries');
    await fsp.mkdir(dest, { recursive: true });
    for (const name of await fsp.readdir(src)) {
      if (!name.endsWith('.bdic')) continue;
      const target = path.join(dest, name);
      const have = await fsp.stat(target).catch(() => null);
      const want = await fsp.stat(path.join(src, name));
      if (!have || have.size !== want.size) await fsp.writeFile(target, await fsp.readFile(path.join(src, name)));
    }
  } catch { /* sem dicionário embutido: segue só com o do sistema, se houver */ }
  // Nunca baixar dicionários da internet.
  try { ses.setSpellCheckerDictionaryDownloadURL('http://127.0.0.1:9/'); } catch { /* não se aplica nesta plataforma */ }
  try {
    const available = ses.availableSpellCheckerLanguages;
    const wanted = ['pt-BR'].filter((l) => !available.length || available.includes(l));
    if (wanted.length) ses.setSpellCheckerLanguages(wanted);
  } catch { /* idioma indisponível */ }
}

/* ───────────────────────── IPC ───────────────────────── */

function handle(channel, fn) { ipcMain.handle(channel, (e, ...args) => fn(...args, e)); }

function registerIpc() {
  handle('app:info', () => ({ dataDir: DATA, version: app.getVersion(), platform: process.platform }));
  handle('app:openDataFolder', async () => { await shell.openPath(DATA); });
  handle('app:showInFolder', (p) => { if (typeof p === 'string' && approvedExportPaths.has(p)) shell.showItemInFolder(p); });
  handle('app:readyToClose', async () => { if (planner) await planner.flush().catch(() => {}); allowClose = true; if (win) win.close(); });
  handle('app:setTheme', (theme) => {
    const t = theme === 'light' ? 'light' : 'dark';
    nativeTheme.themeSource = t;
    if (win) { try { win.setTitleBarOverlay(TITLEBAR[t]); } catch { /* plataforma sem suporte */ } win.setBackgroundColor(WINDOW_BG[t]); }
  });

  /* fontes do usuário (ex.: Valve Pulp) colocadas em Documentos\\COGITO\\Fontes */
  handle('fonts:list', async () => {
    let names = [];
    try { names = await fsp.readdir(FONTS); } catch { return []; }
    return names.filter((n) => /\.(ttf|otf|woff2?)$/i.test(n)).map((n) => ({ name: n, url: `${APP_ORIGIN}/__font/${encodeURIComponent(n)}` }));
  });
  handle('fonts:openFolder', async () => { await fsp.mkdir(FONTS, { recursive: true }); await shell.openPath(FONTS); });
  handle('app:setSpellcheck', (enabled) => { session.defaultSession.setSpellCheckerEnabled(!!enabled); });
  handle('app:copyText', (text) => { clipboard.writeText(String(text ?? '').slice(0, 4000)); });
  handle('app:setUiScale', (scale) => {
    const f = Math.min(1.6, Math.max(0.75, Number(scale) || 1));
    if (!win) return;
    win.webContents.setZoomFactor(f);
    try { win.setTitleBarOverlay({ height: Math.round(34 * f) }); } catch { /* plataforma sem suporte */ }
  });

  handle('books:list', listBooks);
  handle('books:load', loadBook);
  handle('books:save', saveBook);
  handle('books:create', async (book) => {
    if (!isBook(book)) throw new Error('Dados do livro inválidos.');
    const id = newId('livro');
    const now = Date.now();
    const created = { ...book, id, createdAt: now, updatedAt: now };
    await fsp.mkdir(path.join(bookDir(id), 'imagens'), { recursive: true });
    await saveBook(created);
    return created;
  });
  handle('books:rename', async (id, title) => {
    const { book } = await loadBook(id);
    book.title = String(title).trim() || book.title;
    await saveBook(book);
    return metaOf(book);
  });
  handle('books:delete', async (id) => {
    await (saveQueues.get(safeId(id)) || Promise.resolve());
    const where = await moveToTrash(bookDir(id));
    await fsp.rm(path.join(RECOVERY, `${id}.json`), { force: true }).catch(() => {});
    return { where };
  });
  handle('books:backups', listBackups);
  handle('books:restoreBackup', async (id, file) => {
    if (!/^livro-\d{8}-\d{6}\.json$/.test(String(file))) throw new Error('Backup inválido.');
    const book = await readBookFile(path.join(bookDir(id), 'backups', file));
    book.id = id;
    return book;
  });
  handle('books:backupNow', async (id) => {
    const text = await fsp.readFile(bookFile(id), 'utf8');
    parseBook(text);
    await makeBackup(id, text, true);
    return listBackups(id);
  });

  /* imagens do livro (entram na exportação) */
  const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
  const imgUrl = (bookId, file) => `${APP_ORIGIN}/__img/${bookId}/${encodeURIComponent(file)}`;
  handle('images:pick', async (bookId) => {
    const r = await dialog.showOpenDialog(win, { title: 'Inserir imagem', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Imagens', extensions: IMG_EXT }] });
    if (r.canceled) return [];
    const dir = path.join(bookDir(bookId), 'imagens');
    await fsp.mkdir(dir, { recursive: true });
    const out = [];
    for (const src of r.filePaths) {
      const ext = path.extname(src).toLowerCase();
      if (!IMG_EXT.includes(ext.slice(1))) continue;
      const name = `${newId('img')}${ext}`;
      await fsp.copyFile(src, path.join(dir, name));
      out.push({ url: imgUrl(bookId, name), name: path.basename(src) });
    }
    return out;
  });
  handle('images:save', async (bookId, originalName, bytes) => {
    let ext = path.extname(String(originalName || '')).toLowerCase();
    if (!IMG_EXT.includes(ext.slice(1))) ext = '.png';
    const dir = path.join(bookDir(bookId), 'imagens');
    await fsp.mkdir(dir, { recursive: true });
    const name = `${newId('img')}${ext}`;
    await fsp.writeFile(path.join(dir, name), Buffer.from(bytes));
    return { url: imgUrl(bookId, name), name };
  });
  handle('images:read', async (url) => {
    const u = new URL(String(url));
    const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (u.protocol !== 'cogito:' || parts[0] !== '__img' || parts.length !== 3) throw new Error('Imagem inválida.');
    const buf = await fsp.readFile(path.join(bookDir(parts[1]), 'imagens', safeName(parts[2])));
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  });

  /* anexos de consulta do livro (nunca entram na exportação) */
  const refsDir = (bookId) => path.join(bookDir(bookId), 'anexos');
  const listRefs = async (bookId) => {
    let names = [];
    try { names = await fsp.readdir(refsDir(bookId)); } catch { return []; }
    const out = [];
    for (const n of names) {
      const st = await fsp.stat(path.join(refsDir(bookId), n)).catch(() => null);
      if (st && st.isFile()) out.push({ name: n, size: st.size, addedAt: st.mtimeMs, url: `${APP_ORIGIN}/__ref/${bookId}/${encodeURIComponent(n)}` });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  };
  handle('refs:list', listRefs);
  handle('refs:add', async (bookId) => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Anexar arquivos de consulta', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF, imagens e texto', extensions: ['pdf', ...IMG_EXT, 'txt', 'md'] }, { name: 'Todos os arquivos', extensions: ['*'] }],
    });
    if (!r.canceled) {
      await fsp.mkdir(refsDir(bookId), { recursive: true });
      for (const src of r.filePaths) await fsp.copyFile(src, path.join(refsDir(bookId), await uniqueName(refsDir(bookId), path.basename(src))));
    }
    return listRefs(bookId);
  });
  handle('refs:remove', async (bookId, name) => { await moveToTrash(path.join(refsDir(bookId), safeName(name))); return listRefs(bookId); });
  handle('refs:openExternal', async (bookId, name) => { await shell.openPath(path.join(refsDir(bookId), safeName(name))); });

  /* biblioteca pessoal de PDFs (independente dos livros) */
  handle('library:list', async () => (await readLibrary()).map(libView));
  handle('library:add', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Adicionar PDFs à biblioteca', properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    const items = await readLibrary();
    if (!r.canceled) {
      await fsp.mkdir(LIB, { recursive: true });
      for (const src of r.filePaths) {
        if (!/\.pdf$/i.test(src)) continue;
        const id = newId('pdf');
        const file = `${id}.pdf`;
        await fsp.copyFile(src, path.join(LIB, file));
        const st = await fsp.stat(path.join(LIB, file));
        items.push({ id, title: path.basename(src).replace(/\.pdf$/i, ''), file, size: st.size, addedAt: Date.now() });
      }
      await writeLibrary(items);
    }
    return items.map(libView);
  });
  handle('library:rename', async (id, title) => {
    const items = await readLibrary();
    const it = items.find((i) => i.id === id);
    if (it && String(title).trim()) { it.title = String(title).trim(); await writeLibrary(items); }
    return items.map(libView);
  });
  handle('library:remove', async (id) => {
    const items = await readLibrary();
    const it = items.find((i) => i.id === id);
    if (it) { await moveToTrash(path.join(LIB, safeName(it.file))).catch(() => {}); await writeLibrary(items.filter((i) => i.id !== id)); }
    return (await readLibrary()).map(libView);
  });

  /* exportação */
  handle('export:choosePath', async (kind, defaultName) => {
    const ext = kind === 'docx' ? 'docx' : 'pdf';
    const clean = String(defaultName || 'livro').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'livro';
    const r = await dialog.showSaveDialog(win, {
      title: `Exportar ${ext.toUpperCase()}`, defaultPath: path.join(app.getPath('documents'), `${clean}.${ext}`),
      filters: [{ name: ext === 'pdf' ? 'Documento PDF' : 'Documento do Word', extensions: [ext] }],
    });
    if (r.canceled || !r.filePath) return null;
    const p = r.filePath.toLowerCase().endsWith(`.${ext}`) ? r.filePath : `${r.filePath}.${ext}`;
    approvedExportPaths.add(p);
    return p;
  });
  handle('export:printPdf', async (filePath, _e) => {
    if (!approvedExportPaths.has(filePath)) throw new Error('Destino de exportação não autorizado.');
    const data = await win.webContents.printToPDF({
      printBackground: true, preferCSSPageSize: true, margins: { top: 0, bottom: 0, left: 0, right: 0 },
      generateTaggedPDF: true, generateDocumentOutline: true,
    });
    await fsp.writeFile(filePath, data);
    return { path: filePath, size: data.length };
  });
  handle('export:writeFile', async (filePath, bytes) => {
    if (!approvedExportPaths.has(filePath)) throw new Error('Destino de exportação não autorizado.');
    const buf = Buffer.from(bytes);
    await fsp.writeFile(filePath, buf);
    return { path: filePath, size: buf.length };
  });
}

/* ───────────────────────── inicialização ───────────────────────── */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    DATA = process.env.COGITO_DATA_DIR || path.join(app.getPath('documents'), 'COGITO');
    BOOKS = path.join(DATA, 'Livros'); LIB = path.join(DATA, 'Biblioteca'); TRASH = path.join(DATA, 'Lixeira');
    RECOVERY = path.join(app.getPath('userData'), 'recuperacao');
    FONTS = path.join(DATA, 'Fontes');
    await fsp.mkdir(FONTS, { recursive: true }).catch(() => {});
    await fsp.mkdir(BOOKS, { recursive: true }).catch(() => {});
    await fsp.mkdir(LIB, { recursive: true }).catch(() => {});
    nativeTheme.themeSource = 'dark';
    Menu.setApplicationMenu(null);
    // Aplicativo offline: qualquer tentativa de acesso externo é bloqueada.
    session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
      const u = details.url;
      const ok = u.startsWith('cogito://') || u.startsWith('devtools://') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('chrome-extension://')
        || (DEV_URL && (u.startsWith(DEV_URL) || u.startsWith(DEV_URL.replace(/^http/, 'ws'))));
      cb({ cancel: !ok });
    });
    // Nenhuma permissão extra para as páginas do app (câmera, microfone, notificações…).
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    await setupSpellchecker();
    planner = createPlanner({ dataDir: DATA, getWin: () => win, dialog, shell, moveToTrash });
    registerProtocol();
    registerIpc();
    planner.registerIpc(handle);
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
