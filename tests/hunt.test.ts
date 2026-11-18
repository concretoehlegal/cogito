import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUse, chooseAction, enemyTurns, heroAct, hitChances, newHunt, parseCooldown, parseCost, type Hero } from '../src/hunt/engine.ts';

/** Gerador que devolve as faces pedidas, em ordem (face - 1, para o dado sair exatamente nela). */
const faces = (...f: number[]) => { let i = 0; return () => (f[i++ % f.length] ?? 1) - 1; };
const bars = [{ id: 'vida', name: 'Vida', color: '#c00' }, { id: 'san', name: 'Sanidade', color: '#80f' }];
const card = (p: Record<string, unknown>) => ({ id: 'c' + Math.random().toString(36).slice(2, 7), type: 'item', name: 'Carta', icon: '', image: null, color: '#c27a33', rarity: 'comum', cost: '', roll: '', tags: '', description: '', qty: 1, consumable: false, equipped: false, mode: 'ativo', cooldown: '', stats: [], hunt: '', ...p });
const actor = (p: Record<string, unknown>) => ({ id: 'a', kind: 'pc', name: 'Vera', color: '#c27a33', image: null, bars: { vida: { cur: 20, max: 20 }, san: { cur: 6, max: 6 } }, attrs: [], notes: '', ownerId: null, defense: 12, actions: [{ name: 'Soco', hit: '1d20+4', dmg: '1d4' }], subtitle: '', level: '', cards: [], conditions: [], emblem: 'detetive', boss: false, size: 1, ...p }) as any;

test('recarga e custo vêm do texto das cartas', () => {
  assert.equal(parseCooldown('3 turnos'), 3);
  assert.equal(parseCooldown('1 cena'), 999);
  assert.equal(parseCooldown(''), 0);
  assert.deepEqual(parseCost('2 Sanidade', bars), { bar: 'Sanidade', n: 2 });
  assert.deepEqual(parseCost('$800', bars), { bar: null, n: 0 });
});

test('chance de acerto separa o crítico do 20 natural', () => {
  const c = hitChances('1d20+5', 16);
  assert.ok(Math.abs(c.normal - 9 / 20) < 1e-9 && c.crit === 1 / 20);
  assert.deepEqual(hitChances('', 30), { normal: 1, crit: 0 });
});

test('IA agressiva: maior dano esperado e, se der, o golpe que derruba agora', () => {
  const s = newHunt({ bars }, actor({}), [actor({ id: 'm', kind: 'enemy', name: 'Cão', actions: [{ name: 'Arranhão', hit: '1d20+10', dmg: '1d4' }, { name: 'Mordida', hit: '1d20', dmg: '3d10' }] })], faces(20, 1));
  const enemy = s.enemies[0];
  assert.equal(enemy.actions[chooseAction(enemy, s.hero).index].name, 'Mordida', 'com o caçador inteiro, vai no maior dano esperado');
  const weak: Hero = { ...s.hero, hp: 2 };
  assert.equal(enemy.actions[chooseAction(enemy, weak).index].name, 'Arranhão', 'com o caçador quase caindo, vai no golpe mais certeiro');
});

test('cartas viram ações: cura, consumível, recarga, custo em Sanidade e vitória', () => {
  const kit = actor({ cards: [
    card({ name: 'Remédio', hunt: 'cura', roll: '2d4', consumable: true, qty: 1 }),
    card({ name: 'Sussurro', type: 'feitico', hunt: 'dano', roll: '3d8', cost: '2 Sanidade', cooldown: '2 turnos' }),
    card({ name: 'Colete', hunt: 'defesa', roll: '1d4+1' }),
    card({ name: 'Anel passivo', hunt: 'cura', roll: '1d4', mode: 'passivo' }),
  ] });
  let s = newHunt({ bars }, kit, [actor({ id: 'm', kind: 'enemy', name: 'Cão', defense: 10, bars: { vida: { cur: 9, max: 9 } }, actions: [{ name: 'Mordida', hit: '1d20', dmg: '1d6' }] })], faces(20, 1));
  assert.equal(s.phase, 'heroi');
  assert.deepEqual(s.hero.actionsList.map((a) => a.name), ['Soco', 'Remédio', 'Sussurro', 'Colete'], 'carta passiva não vira ação');
  s.hero.hp = 10;
  s = heroAct(s, 'card-' + kit.cards[0].id, null, faces(3, 4));
  assert.equal(s.hero.hp, 17); assert.equal(s.uses['card-' + kit.cards[0].id], 0);
  s.phase = 'heroi';
  assert.equal(canUse(s, s.hero.actionsList[1]).ok, false, 'consumível acabou');
  const sus = s.hero.actionsList[2];
  s = heroAct(s, sus.id, 'presa-0', faces(15, 3, 3, 3));
  assert.equal(s.hero.bars.find((b) => b.name === 'Sanidade')!.cur, 4);
  assert.equal(s.enemies[0].hp, 0); assert.equal(s.phase, 'vitoria');
  assert.equal(s.cooldowns[sus.id], 3);
});

test('vez das presas: anunciam a intenção, atacam e a rodada vira', () => {
  let s = newHunt({ bars }, actor({}), [actor({ id: 'm', kind: 'enemy', name: 'Cão', actions: [{ name: 'Mordida', hit: '1d20', dmg: '1d6' }] }), actor({ id: 'm', kind: 'enemy', name: 'Cão', actions: [{ name: 'Mordida', hit: '1d20', dmg: '1d6' }] })], faces(20, 1));
  assert.deepEqual(s.enemies.map((e) => e.name), ['Cão 1', 'Cão 2']);
  s.phase = 'inimigos';
  const frames = enemyTurns(s, faces(20, 6, 1));
  const last = frames[frames.length - 1];
  assert.ok(last.log.some((l) => l.kind === 'intencao' && l.text.includes('Mordida')));
  assert.ok(last.log.some((l) => l.kind === 'critico' && l.dmg === 12));
  assert.ok(last.log.some((l) => l.kind === 'erro'));
  assert.equal(last.hero.hp, 8); assert.equal(last.round, 2); assert.equal(last.phase, 'heroi');
  const dying = { ...s, hero: { ...s.hero, hp: 3 } };
  const end = enemyTurns(dying, faces(20, 6));
  assert.equal(end[end.length - 1].phase, 'derrota');
});
