import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { backlinks, edgePoint, findByTitle, fitView, linksIn, matches, newNode, nodeActor, segments } from '../src/planner/model.ts';

const { createPlanner } = createRequire(import.meta.url)('../electron/planner.cjs');

test('links [[…]]: trechos, citações, busca sem acento e citado por', () => {
  assert.deepEqual(linksIn('Vera procura [[O Verme]] no [[Porto Velho]].'), ['O Verme', 'Porto Velho']);
  assert.deepEqual(segments('a [[B]] c'), [{ text: 'a ' }, { link: 'B' }, { text: ' c' }]);
  const vera = newNode('personagem', 0, 0, { title: 'Vera Lins', body: 'Caça [[o verme]].', tags: ['protagonista'] });
  const verme = newNode('inimigo', 300, 0, { title: 'O Verme' });
  const porto = newNode('local', 0, 300, { title: 'Porto Velho', body: 'Covil do [[O Verme]].' });
  const nodes = [vera, verme, porto];
  assert.equal(findByTitle(nodes, 'O VERME')?.id, verme.id);
  assert.deepEqual(backlinks(nodes, verme).map((n) => n.title), ['Vera Lins', 'Porto Velho']);
  assert.ok(matches(vera, 'cAçA') && matches(vera, 'protagon') && !matches(porto, 'vera'));
});

test('geometria: ligação sai pela borda e o enquadramento cabe na tela', () => {
  const p = edgePoint({ x: 0, y: 0, w: 100, h: 50 }, { x: 500, y: 25 });
  assert.deepEqual(p, { x: 100, y: 25 });
  const v = fitView([{ x: 0, y: 0, w: 1000, h: 500 }], 1200, 700);
  assert.ok(Math.abs(v.zoom - 1.08) < 1e-9 && Math.round(v.x) === 60 && Math.round(v.y) === 80);
});

test('fichas do quadro viram cartas com vida, recursos e chefe', () => {
  const hero = newNode('personagem', 0, 0, { title: 'Vera' });
  hero.sheet!.vals!.vida = '30'; hero.sheet!.vals!.alma = '4';
  hero.sheet!.cards.push({ id: 'c1', type: 'feitico', name: 'Sussurro', icon: 'vela', image: null, color: '#8d5aa3', rarity: 'epico', cost: '2 Alma', roll: '3d8', tags: '', description: '', qty: 1, consumable: false, equipped: false, mode: 'ativo', cooldown: '', stats: [], hunt: 'dano' });
  const boss = newNode('inimigo', 0, 0, { title: 'O Verme' });
  boss.sheet!.boss = true; boss.sheet!.actions = [1, 2, 3, 4, 5].map((n) => ({ name: `H${n}`, hit: '1d20', dmg: '1d6' }));
  const a = nodeActor(boss);
  assert.deepEqual([a.kind, a.boss, a.hp, a.kindLabel], ['enemy', true, 12, 'Chefe']);
  const h = nodeActor(hero);
  assert.equal(h.hp, 30);
  assert.equal(h.resources[0].name, 'Alma');
  assert.equal(h.cards[0].name, 'Sussurro');
  assert.equal(a.actions.length, 5, 'as habilidades do chefe ficam todas na ficha');
});

test('armazenamento local: criar, listar, salvar, capa, imagem e excluir', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogito-plano-'));
  const trashed: string[] = [];
  const planner = createPlanner({ dataDir: dir, getWin: () => null, dialog: {}, shell: {}, moveToTrash: async (p: string) => { trashed.push(p); fs.rmSync(p, { recursive: true }); return 'lixeira'; } });
  const ipc: Record<string, (...a: any[]) => any> = {};
  planner.registerIpc((ch: string, fn: any) => { ipc[ch] = fn; });
  const meta = await ipc['plan:create']({ name: '  Cair da Noite ', description: 'Noir', icon: 'lua', color: '#d8463a' });
  assert.deepEqual([meta.name, meta.icon, meta.color, meta.cover], ['Cair da Noite', 'lua', '#d8463a', null]);
  const plan = await ipc['plan:load'](meta.id);
  plan.nodes.push(newNode('personagem', 0, 0, { title: 'Vera' }), newNode('inimigo', 0, 0, { title: 'Cão' }));
  await ipc['plan:save'](plan);
  const list = await ipc['plan:list']();
  assert.deepEqual([list.length, list[0].characters, list[0].enemies], [1, 1, 1]);
  const upd = await ipc['plan:updateMeta'](meta.id, { name: 'Outro nome', icon: '<x>', color: 'azul' });
  assert.deepEqual([upd.name, upd.icon, upd.color], ['Outro nome', 'lua', '#d8463a'], 'ícone e cor inválidos são ignorados');
  const file = await ipc['plan:putFile'](meta.id, 'foto.png', new Uint8Array([137, 80, 78, 71]));
  assert.ok(planner.localFile(meta.id, file) && fs.existsSync(planner.localFile(meta.id, file)));
  assert.equal(planner.localFile(meta.id, '../plano.json'), null, 'não serve nada fora da pasta de arquivos');
  await assert.rejects(ipc['plan:putFile'](meta.id, 'x.exe', new Uint8Array([1])), /imagens/);
  // arquivo principal corrompido: abre pela cópia .bak
  await ipc['plan:save']({ ...plan, name: 'v2' });
  fs.writeFileSync(path.join(dir, 'Planejador', meta.id, 'plano.json'), '{quebrado');
  assert.equal((await ipc['plan:load'](meta.id)).id, meta.id);
  await ipc['plan:delete'](meta.id);
  assert.equal((await ipc['plan:list']()).length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
