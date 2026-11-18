import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applySystem, blankSheet, fixSystem, migrateSheet, normalizePlan, numOf, presetById, roleStat } from '../src/game/system.ts';
import { newNode, nodeActor } from '../src/planner/model.ts';
import { enemyTurns, heroAct, hitChances, newHunt, rulesOf } from '../src/hunt/engine.ts';
import { dataFromActor } from '../src/game/charData.ts';

const faces = (...f: number[]) => { let i = 0; return () => (f[i++ % f.length] ?? 1) - 1; };

test('todo modelo tem vida e uma ficha nova completa para cada tipo', () => {
  for (const p of PRESETS) {
    const sys = p.make();
    assert.ok(roleStat(sys, 'vida', 'personagem') && roleStat(sys, 'vida', 'inimigo'), `${p.id}: vida`);
    assert.equal(new Set(sys.stats.map((s) => s.id)).size, sys.stats.length, `${p.id}: ids únicos`);
    for (const t of ['personagem', 'npc', 'inimigo'] as const) {
      const sh = blankSheet(sys, t);
      const a = nodeActor({ ...newNode(t, 0, 0, {}, sys), sheet: sh }, sys);
      assert.ok(a.hp > 0, `${p.id}/${t}: vida > 0`);
      assert.equal(sh.actions[0].hit, sys.combat.defaultHit);
    }
  }
});

test('ficha antiga (0.16) vira valores do sistema COGITO sem perder nada', () => {
  const old = { life: 6, defense: 5, resilience: 18, soul: 10, boss: false, attrs: [{ k: 'Agilidade', v: '2' }], caps: [{ k: 'Papo', v: '1' }], origin: 'Herdeiro', level: 1, affiliation: 'D.C.P.A', cliche: 'Sabe tudo', combatActions: 1, moveActions: 3, actions: [], cards: [] } as any;
  const m = migrateSheet(old);
  assert.deepEqual(m.vals, { vida: '6', defesa: '5', resiliencia: '18', alma: '10', acoes: '1', movimento: '3', origem: 'Herdeiro', nivel: '1', filiacao: 'D.C.P.A', cliche: 'Sabe tudo' });
  assert.deepEqual(m.lists, { atributos: [{ k: 'Agilidade', v: '2' }], capacidades: [{ k: 'Papo', v: '1' }] });
  assert.equal((m as any).life, undefined);
  const plan = normalizePlan({ version: 1, id: 'p', name: 'x', description: '', icon: 'mapa', color: '#fff', cover: null, createdAt: 0, updatedAt: 0, view: { x: 0, y: 0, zoom: 1 }, links: [], nodes: [{ ...newNode('personagem', 0, 0), sheet: old }] } as any);
  assert.equal(plan.system!.base, 'cogito');
  const a = nodeActor(plan.nodes[0], plan.system);
  assert.deepEqual([a.hp, a.defense, a.moveActions, a.resources[0].name, a.resources[0].max], [6, 5, 3, 'Alma', 10]);
});

test('trocar o sistema mantém os valores e preenche os campos novos', () => {
  const plan = normalizePlan({ version: 1, id: 'p', name: 'x', description: '', icon: 'mapa', color: '#fff', cover: null, createdAt: 0, updatedAt: 0, view: { x: 0, y: 0, zoom: 1 }, links: [], nodes: [newNode('personagem', 0, 0)] } as any);
  plan.nodes[0].sheet!.vals!.vida = '33';
  applySystem(plan, presetById('dnd5e'));
  const v = plan.nodes[0].sheet!.vals!;
  assert.equal(v.vida, '33', 'o valor antigo continua guardado');
  assert.equal(v.ca, '14'); assert.deepEqual(plan.nodes[0].sheet!.lists!.atributos.map((x) => x.k), ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']);
  // valor preenchido de um item que não existe no sistema novo continua no fim da lista
  const p2 = normalizePlan({ version: 1, id: 'q', name: 'x', description: '', icon: 'mapa', color: '#fff', cover: null, createdAt: 0, updatedAt: 0, view: { x: 0, y: 0, zoom: 1 }, links: [], nodes: [newNode('personagem', 0, 0)] } as any);
  p2.nodes[0].sheet!.lists!.atributos[1].v = '3'; // Bravura 3
  applySystem(p2, presetById('ordem'));
  assert.deepEqual(p2.nodes[0].sheet!.lists!.atributos.map((x) => `${x.k}:${x.v}`), ['Agilidade:', 'Força:', 'Intelecto:', 'Presença:', 'Vigor:', 'Bravura:3']);
  // editar o mesmo sistema: item novo na definição entra nas fichas
  const same = presetById('ordem'); same.lists[0].items.push({ k: 'Sorte', icon: 'dado' });
  applySystem(p2, same);
  assert.equal(p2.nodes[0].sheet!.lists!.atributos.at(-1)!.k, 'Sorte');
  assert.equal(fixSystem({ base: 'pf2e', name: 'Meu PF' } as any).combat.crit, 'dez', 'sistema incompleto é completado pelo modelo');
  assert.equal(numOf('16 (+3)'), 16); assert.equal(numOf('CA 15'), 15); assert.equal(numOf('+2'), 2); assert.equal(numOf('—', 7), 7);
});

test('Call of Cthulhu: acerto em porcentagem, extremo dobra, armadura desconta', () => {
  const sys = presetById('coc7');
  const rules = rulesOf(sys);
  const c = hitChances('50', 99, rules);
  assert.ok(Math.abs(c.crit - 0.1) < 1e-9 && Math.abs(c.normal - 0.4) < 1e-9, 'defesa não importa; 50% com 10% de extremo');
  const inv = newNode('personagem', 0, 0, { title: 'Harvey' }, sys);
  inv.sheet!.actions = [{ name: 'Revólver', hit: '55', dmg: '1d10' }];
  const ghoul = newNode('inimigo', 0, 0, { title: 'Carniçal' }, sys);
  ghoul.sheet!.vals!.armadura = '3'; ghoul.sheet!.vals!.pv = '13';
  let s = newHunt({ system: sys }, nodeActor(inv, sys), [nodeActor(ghoul, sys)], faces(20, 1));
  s.phase = 'heroi';
  s = heroAct(s, 'atk-0', s.enemies[0].id, faces(30, 8)); // d100 = 30 ≤ 55; 1d10 = 8 − 3 de armadura
  assert.equal(s.enemies[0].hp, 13 - 5);
  assert.match(s.log[s.log.length - 1].detail ?? '', /1d100 = 30 contra 55%.*8 − 3/);
  s.phase = 'heroi'; s.left = 1;
  s = heroAct(s, 'atk-0', s.enemies[0].id, faces(9, 4)); // 9 ≤ 11 (1/5 de 55): extremo, 4 × 2 − 3
  assert.equal(s.enemies[0].hp, 8 - 5);
});

test('Pathfinder: superar a CA por 10 é crítico; Daggerheart: dados iguais são crítico', () => {
  const pf = rulesOf(presetById('pf2e'));
  const c = hitChances('1d20+10', 15, pf);
  // 1 natural erra; total 25+ (face 15–20) crítico; 15–24 (face 5–14) acerto normal
  assert.ok(Math.abs(c.crit - 6 / 20) < 1e-9 && Math.abs(c.normal - 10 / 20) < 1e-9);
  const dh = rulesOf(presetById('daggerheart'));
  const d = hitChances('2d12', 30, dh);
  assert.ok(Math.abs(d.crit - 1 / 12) < 1e-9 && d.normal === 0, 'com 2d12 contra 30 só os iguais acertam');
});

test('Ordem Paranormal: a criatura usa Defesa e RD; os nomes aparecem no registro e na carta', () => {
  const sys = presetById('ordem');
  const agent = newNode('personagem', 0, 0, { title: 'Arthur' }, sys);
  const zumbi = newNode('inimigo', 0, 0, { title: 'Zumbi de Sangue' }, sys);
  zumbi.sheet!.vals!.rd = '2'; zumbi.sheet!.vals!.defesa = '30';
  const s = newHunt({ system: sys }, nodeActor(agent, sys), [nodeActor(zumbi, sys)], faces(20, 1));
  assert.equal(s.hero.bars[0].name, 'Pontos de Esforço');
  const frames = enemyTurns({ ...s, phase: 'inimigos' }, faces(20, 3));
  assert.ok(frames.some((f) => f.log.some((l) => /contra Defesa/.test(l.detail ?? ''))));
  const card = dataFromActor(nodeActor(agent, sys));
  assert.deepEqual(card.tl.map((x) => x.title), ['Pontos de Vida', 'Pontos de Esforço']);
  assert.equal(card.kindLabel, 'Agente');
});

test('em porcentagem, uma fórmula de dados (ação de outro sistema) vale 50%', () => {
  const rules = rulesOf(presetById('coc7'));
  assert.ok(Math.abs(hitChances('1d20+5', 10, rules).normal + hitChances('1d20+5', 10, rules).crit - 0.5) < 1e-9);
});
