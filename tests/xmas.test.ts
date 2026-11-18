import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CYCLE, GROUPS, PROGRAM, level, programAt } from '../src/lib/xmasProgram.ts';

const groups = (mode: Parameters<typeof level>[0], t: number) => Array.from({ length: GROUPS }, (_, g) => level(mode, g, t));

test('o programa passa por todos os efeitos e recomeça', () => {
  let at = 0;
  for (const p of PROGRAM) {
    assert.equal(programAt(at * 1000 + 100).mode, p.mode);
    at += p.secs;
  }
  assert.equal(programAt(CYCLE * 1000 + 100).mode, PROGRAM[0].mode);
});

test('sequência: uma luz de cada vez, correndo pelo fio', () => {
  const seen: number[] = [];
  for (let s = 0; s < 4; s++) {
    const lv = groups('sequencia', s / 6 + 0.01);
    assert.equal(lv.filter((v) => v === 1).length, 1);
    seen.push(lv.indexOf(1));
  }
  assert.deepEqual(seen, [0, 1, 2, 3]);
});

test('alternado: pares e ímpares se revezam; pisca: todas juntas', () => {
  assert.deepEqual(groups('alternado', 0.1), [1, 0, 1, 0]);
  assert.deepEqual(groups('alternado', 0.6), [0, 1, 0, 1]);
  assert.deepEqual(groups('pisca', 0.1), [1, 1, 1, 1]);
  assert.deepEqual(groups('pisca', 0.5), [0, 0, 0, 0]);
});

test('ondas e respira ficam entre 0 e 1; cintilante é igual a cada chamada', () => {
  for (let t = 0; t < 7; t += 0.3) {
    for (const v of [...groups('ondas', t), ...groups('respira', t)]) assert.ok(v >= 0 && v <= 1);
    assert.deepEqual(groups('cintila', t), groups('cintila', t));
  }
});
