'use strict';
/*
 * COGITO — Planejador de campanhas.
 *
 * Cada campanha é uma pasta em Documentos\COGITO\Planejador\<id> com:
 *   plano.json  — o quadro (fichas, ligações, molduras) e os dados da capa (nome, descrição, ícone, cor, foto);
 *   arquivos\   — imagens e fotos usadas no quadro;
 *   backups\    — cópias automáticas (a cada 5 minutos de edição, até 30).
 * Tudo fica neste computador. A gravação é atômica (arquivo temporário + troca), com a versão anterior em .bak.
 */
const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const crypto = require('node:crypto');

const ID_RE = /^[A-Za-z0-9_-]{4,60}$/;
const FILE_RE = /^[A-Za-z0-9_-]{4,60}\.(png|jpe?g|webp|gif|bmp|svg)$/i;
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'];
const MAX_FILE = 25 * 1024 * 1024;
const BACKUP_INTERVAL = 5 * 60 * 1000;
const BACKUP_KEEP = 30;

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max);
const color = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : d);
const uid = (p) => `${p}-${crypto.randomBytes(6).toString('hex')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isPlan = (o) => !!o && typeof o === 'object' && typeof o.id === 'string' && Array.isArray(o.nodes) && Array.isArray(o.links);

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
async function renameRetry(from, to) {
  let last;
  for (let i = 0; i < 6; i++) {
    try { await fsp.rename(from, to); return; } catch (e) { last = e; if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) break; await sleep(80 * (i + 1)); }
  }
  throw last;
}

function createPlanner(env) {
  const DIR = path.join(env.dataDir, 'Planejador');
  const safeId = (id) => { if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('Identificador inválido.'); return id; };
  const planDir = (id) => path.join(DIR, safeId(id));
  const planFile = (id) => path.join(planDir(id), 'plano.json');
  const filesDir = (id) => path.join(planDir(id), 'arquivos');
  const queues = new Map();
  const lastBackup = new Map();

  const enqueue = (id, job) => {
    const prev = queues.get(id) || Promise.resolve();
    const next = prev.then(job, job);
    queues.set(id, next.catch(() => {}));
    return next;
  };

  function metaOf(p) {
    const nodes = Array.isArray(p.nodes) ? p.nodes : [];
    return {
      id: p.id, name: p.name || 'Campanha', description: p.description || '', icon: p.icon || 'mapa', color: p.color || '#b8ff2c',
      cover: p.cover || null, createdAt: p.createdAt || 0, updatedAt: p.updatedAt || 0, nodes: nodes.length,
      characters: nodes.filter((n) => n && (n.type === 'personagem' || n.type === 'npc')).length,
      enemies: nodes.filter((n) => n && n.type === 'inimigo').length,
      links: Array.isArray(p.links) ? p.links.length : 0,
      counts: nodes.reduce((acc, n) => { if (n && typeof n.type === 'string') acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {}),
      faces: nodes.filter((n) => n && ['personagem', 'npc', 'inimigo'].includes(n.type)).slice(0, 6)
        .map((n) => ({ name: String(n.title || ''), image: n.image || null, color: n.color || '#8a8a8a', icon: n.icon || 'pessoa', type: n.type })),
    };
  }
  function cleanMeta(p, patch) {
    if (patch.name !== undefined) p.name = str(patch.name, 80).trim() || p.name || 'Campanha';
    if (patch.description !== undefined) p.description = str(patch.description, 600);
    if (patch.icon !== undefined) p.icon = /^[a-z][a-z-]{1,19}$/.test(String(patch.icon)) ? String(patch.icon) : p.icon;
    if (patch.color !== undefined) p.color = color(patch.color, p.color || '#b8ff2c');
    return p;
  }

  async function writeAtomic(file, text) {
    const tmp = `${file}.tmp`;
    const fh = await fsp.open(tmp, 'w');
    try { await fh.writeFile(text, 'utf8'); await fh.sync(); } finally { await fh.close(); }
    try { if (isPlan(JSON.parse(await fsp.readFile(file, 'utf8')))) await fsp.copyFile(file, `${file}.bak`); } catch { /* sem versão anterior válida */ }
    await renameRetry(tmp, file);
  }
  async function backup(id, text) {
    const now = Date.now();
    if (now - (lastBackup.get(id) || 0) < BACKUP_INTERVAL) return;
    lastBackup.set(id, now);
    const dir = path.join(planDir(id), 'backups');
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, `plano-${stamp()}.json`), text, 'utf8');
    const names = (await fsp.readdir(dir)).filter((n) => /^plano-\d{8}-\d{6}\.json$/.test(n)).sort().reverse();
    for (const old of names.slice(BACKUP_KEEP)) await fsp.rm(path.join(dir, old), { force: true });
  }

  async function read(id) {
    for (const f of [planFile(id), `${planFile(id)}.bak`]) {
      try { const o = JSON.parse(await fsp.readFile(f, 'utf8')); if (isPlan(o)) { o.id = id; return o; } } catch { /* tenta a cópia */ }
    }
    throw new Error('Não foi possível abrir esta campanha.');
  }
  function save(plan) {
    if (!isPlan(plan)) throw new Error('Dados da campanha inválidos.');
    const id = safeId(plan.id);
    return enqueue(id, async () => {
      const savedAt = Date.now();
      const text = JSON.stringify({ ...plan, updatedAt: savedAt });
      await fsp.mkdir(planDir(id), { recursive: true });
      await writeAtomic(planFile(id), text);
      await backup(id, text).catch(() => {});
      return { savedAt };
    });
  }

  async function list() {
    await fsp.mkdir(DIR, { recursive: true });
    const out = [];
    for (const d of await fsp.readdir(DIR, { withFileTypes: true })) {
      if (!d.isDirectory() || !ID_RE.test(d.name)) continue;
      try { out.push(metaOf(await read(d.name))); } catch { /* pasta sem campanha válida */ }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async function create(meta) {
    const now = Date.now();
    const plan = cleanMeta({
      version: 1, id: uid('plano'), name: 'Nova campanha', description: '', icon: 'mapa', color: '#b8ff2c', cover: null,
      createdAt: now, updatedAt: now, view: { x: 0, y: 0, zoom: 1 }, nodes: [], links: [],
    }, meta || {});
    await save(plan);
    return metaOf(plan);
  }
  async function updateMeta(id, patch) {
    const plan = cleanMeta(await read(id), patch || {});
    await save(plan);
    return metaOf(plan);
  }
  async function copyIn(id, src) {
    const ext = path.extname(src).slice(1).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) throw new Error('Escolha um arquivo de imagem (PNG, JPG, WEBP, GIF, BMP ou SVG).');
    const st = await fsp.stat(src);
    if (st.size > MAX_FILE) throw new Error('Imagem grande demais (máximo de 25 MB).');
    await fsp.mkdir(filesDir(id), { recursive: true });
    const name = `${uid('img')}.${ext === 'jpeg' ? 'jpg' : ext}`;
    await fsp.copyFile(src, path.join(filesDir(id), name));
    return name;
  }
  async function pickImages(id, multi) {
    const r = await env.dialog.showOpenDialog(env.getWin(), {
      title: multi ? 'Adicionar imagens' : 'Escolher imagem', properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [{ name: 'Imagens', extensions: IMAGE_EXT }],
    });
    if (r.canceled) return [];
    const out = [];
    for (const f of r.filePaths) out.push({ file: await copyIn(id, f), name: path.basename(f, path.extname(f)) });
    return out;
  }
  /** Imagem vinda de arrastar ou colar (bytes). */
  async function putFile(id, name, bytes) {
    const ext = path.extname(String(name || '')).slice(1).toLowerCase() || 'png';
    if (!IMAGE_EXT.includes(ext)) throw new Error('Só imagens podem ir para o quadro.');
    const buf = Buffer.from(bytes || []);
    if (!buf.length || buf.length > MAX_FILE) throw new Error('Imagem vazia ou grande demais (máximo de 25 MB).');
    await fsp.mkdir(filesDir(id), { recursive: true });
    const file = `${uid('img')}.${ext === 'jpeg' ? 'jpg' : ext}`;
    await fsp.writeFile(path.join(filesDir(id), file), buf);
    return file;
  }

  function registerIpc(handle) {
    handle('plan:list', list);
    handle('plan:create', create);
    handle('plan:load', (id) => read(safeId(id)));
    handle('plan:save', save);
    handle('plan:updateMeta', updateMeta);
    handle('plan:pickCover', async (id) => {
      const [img] = await pickImages(safeId(id), false);
      if (!img) return null;
      const plan = await read(id); plan.cover = img.file; await save(plan);
      return metaOf(plan);
    });
    handle('plan:removeCover', async (id) => { const plan = await read(safeId(id)); plan.cover = null; await save(plan); return metaOf(plan); });
    handle('plan:pickImages', (id) => pickImages(safeId(id), true));
    handle('plan:putFile', (id, name, bytes) => putFile(safeId(id), name, bytes));
    handle('plan:delete', async (id) => ({ where: await env.moveToTrash(planDir(id)) }));
    handle('plan:openFolder', async (id) => { await env.shell.openPath(id ? planDir(id) : DIR); });
  }

  /** Arquivo de imagem de uma campanha, para o protocolo interno do app. */
  const localFile = (id, name) => (ID_RE.test(String(id)) && FILE_RE.test(String(name)) ? path.join(filesDir(id), name) : null);
  const flush = async () => { await Promise.all([...queues.values()]); };

  return { registerIpc, localFile, flush, save, read, list, create };
}

module.exports = { createPlanner };
