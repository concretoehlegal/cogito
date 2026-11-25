import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroAct, newHunt } from '../src/hunt/engine.ts';
import { interpret } from '../src/hunt/interpret.ts';

const faces = (...f: number[]) => { let i = 0; return () => (f[i++ % f.length] ?? 1) - 1; };
const card = (p: Record<string, unknown>) => ({ id: 'c' + Math.random().toString(36).slice(2, 7), type: 'item', name: 'Carta', icon: '', image: null, color: '#c27a33', rarity: 'comum', cost: '', roll: '', tags: '', description: '', qty: 1, consumable: false, equipped: false, mode: 'ativo', cooldown: '', stats: [], hunt: '', ...p });
const actor = (p: Record<string, unknown>) => {
  const { bars: b0, ...rest } = p as { bars?: Record<string, { cur: number; max: number }> };
  const b = b0 ?? { vida: { cur: 20, max: 20 }, san: { cur: 6, max: 6 } };
  return {
    id: 'a', kind: 'pc', name: 'Vera', color: '#c27a33', image: null, subtitle: '', emblem: 'detetive', boss: false, defense: 12, armor: 0,
    actions: [{ name: 'Soco', hit: '1d20+4', dmg: '1d4' }], cards: [], kindLabel: 'Personagem', hp: b.vida?.max ?? 10,
    resources: Object.entries(b).filter(([k]) => k !== 'vida').map(([k, v]) => ({ id: k, name: k === 'san' ? 'Sanidade' : k, short: '', max: v.max })),
    combatActions: 1, moveActions: 0, stats: [], lists: [], ...rest,
  } as any;
};
const vera = actor({ cards: [
  card({ name: 'Revólver .38', icon: 'revolver', hunt: 'dano', roll: '2d6+2' }),
  card({ name: 'Remédio', icon: 'pilula', hunt: 'cura', roll: '2d4', consumable: true, qty: 1 }),
  card({ name: 'Colete', icon: 'escudo', hunt: 'defesa', roll: '1d4' }),
  card({ name: 'Sussurro do Abismo', type: 'feitico', icon: 'vela', hunt: 'dano', roll: '3d8', cost: '2 Sanidade', cooldown: '3 turnos' }),
] });
const prey = [actor({ id: 'c', kind: 'enemy', name: 'Cultista' }), actor({ id: 'c', kind: 'enemy', name: 'Cultista' }), actor({ id: 'b', kind: 'enemy', name: 'O Verme', boss: true, bars: { vida: { cur: 40, max: 40 } } })];
const start = () => { const s = newHunt({}, vera, prey, faces(20, 1)); s.phase = 'heroi'; return s; };

test('lê armas, itens e habilidades a partir do que o jogador escreve', () => {
  const s = start();
  const r1 = interpret('Atiro na cabeça do segundo cultista', s, 'presa-0');
  assert.deepEqual([r1.action?.name, r1.target?.name], ['Revólver .38', 'Cultista 2']);
  const r2 = interpret('tomo o remédio rapidinho', s, null);
  assert.equal(r2.action?.name, 'Remédio');
  const r3 = interpret('Me protejo com o colete', s, null);
  assert.equal(r3.action?.name, 'Colete');
  const r4 = interpret('sussurro as palavras proibidas contra o chefe', s, null);
  assert.deepEqual([r4.action?.name, r4.target?.name], ['Sussurro do Abismo', 'O Verme']);
  const r5 = interpret('dou um soco no cultista 1', s, null);
  assert.deepEqual([r5.action?.name, r5.target?.name], ['Soco', 'Cultista 1']);
  assert.equal(interpret('vou fugir daqui', s, null).flee, true);
});

test('ataque genérico usa a melhor arma disponível; o que não está disponível é explicado', () => {
  let s = start();
  const r = interpret('ataco o verme', s, null);
  assert.equal(r.action?.name, 'Sussurro do Abismo', 'maior dano esperado contra o alvo');
  s = heroAct(s, r.action!.id, r.target!.id, faces(2, 1, 1, 1));
  s.phase = 'heroi';
  const again = interpret('sussurro de novo', s, null);
  assert.ok(!again.ok && /recarregando/i.test(again.message), again.message);
  const nada = interpret('canto uma música', s, null);
  assert.equal(nada.ok, false);
  assert.ok(nada.alternatives.length > 0);
});

test('a fala do jogador entra no registro', () => {
  const s = start();
  const r = interpret('atiro no verme', s, null);
  const next = heroAct(s, r.action!.id, r.target!.id, faces(15, 3, 3), 'atiro no verme');
  const fala = next.log.find((l) => l.kind === 'fala');
  assert.ok(fala && fala.text.includes('atiro no verme') && fala.detail === '→ Revólver .38 em O Verme');
});
