import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_LIMIT, parseFormula, pushHistory, roll, rollDie, type RollResult } from '../src/lib/dice.ts';

test('interpreta fórmulas como 2d6+3', () => {
  assert.deepEqual(parseFormula('2d6+3'), [{ sign: 1, count: 2, sides: 6 }, { sign: 1, value: 3 }]);
  assert.deepEqual(parseFormula(' D20 '), [{ sign: 1, count: 1, sides: 20 }]);
  assert.deepEqual(parseFormula('1d8+2d4-1'), [{ sign: 1, count: 1, sides: 8 }, { sign: 1, count: 2, sides: 4 }, { sign: -1, value: 1 }]);
  assert.deepEqual(parseFormula('d%'), [{ sign: 1, count: 1, sides: 100 }]);
});

test('recusa fórmulas inválidas', () => {
  for (const bad of ['', 'abc', '2d', 'd', '2d6+', '2x6', '5', '0d6', '2d1', '101d6', '2d6++3']) {
    assert.throws(() => parseFormula(bad), undefined, bad);
  }
});

test('resultados ficam dentro do intervalo e somam certo', () => {
  for (let i = 0; i < 500; i++) {
    const r = roll('2d6+3');
    assert.ok(r.total >= 5 && r.total <= 15);
    assert.equal(r.total, r.parts.reduce((a, p) => a + p.subtotal, 0));
    assert.equal(r.parts[0].rolls.length, 2);
  }
  for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) { const v = rollDie(sides); assert.ok(v >= 1 && v <= sides); seen.add(v); }
    assert.equal(seen.size, sides, `d${sides} deve produzir todas as faces`);
  }
});

test('aceita gerador controlado (resultado determinístico)', () => {
  const r = roll('2d6+3', () => 0);     // sempre a face 1
  assert.equal(r.total, 5);
  assert.equal(r.formula, '2d6+3');
  assert.equal(roll('d20-2', () => 19).total, 18);
});

test('histórico guarda só as seis rolagens mais recentes', () => {
  let h: RollResult[] = [];
  for (let i = 1; i <= 9; i++) h = pushHistory(h, { ...roll('1d6'), id: String(i) });
  assert.equal(h.length, HISTORY_LIMIT);
  assert.equal(HISTORY_LIMIT, 6);
  assert.deepEqual(h.map((r) => r.id), ['9', '8', '7', '6', '5', '4']);
});
