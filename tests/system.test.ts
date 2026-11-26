import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applySystem, blankSheet, fixSystem, migrateSheet, normalizePlan, numOf, presetById, roleStat } from '../src/game/system.ts';
import { newNode, nodeActor } from '../src/planner/model.ts';
import { dataFromActor } from '../src/game/charData.ts';

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

test('Ordem Paranormal: os nomes do sistema aparecem na carta', () => {
  const sys = presetById('ordem');
  const agent = newNode('personagem', 0, 0, { title: 'Arthur' }, sys);
  const zumbi = newNode('inimigo', 0, 0, { title: 'Zumbi de Sangue' }, sys);
  zumbi.sheet!.vals!.rd = '2'; zumbi.sheet!.vals!.defesa = '30';
  const z = nodeActor(zumbi, sys);
  assert.deepEqual([z.defense, z.armor], [30, 2], 'a função de cada campo chega à ficha');
  const card = dataFromActor(nodeActor(agent, sys));
  assert.deepEqual(card.tl.map((x) => x.title), ['Pontos de Vida', 'Pontos de Esforço']);
  assert.equal(card.kindLabel, 'Agente');
});
