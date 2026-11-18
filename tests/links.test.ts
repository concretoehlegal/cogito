import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkGeom, nearestSide, sidePoint, sideToward, styleOf } from '../src/planner/links.ts';

const A = { x: 0, y: 0, w: 100, h: 60 };
const B = { x: 300, y: 200, w: 100, h: 60 };

test('lados: ponto no meio de cada lado e lado virado para o outro', () => {
  assert.deepEqual(sidePoint(A, 'top'), { x: 50, y: 0 });
  assert.deepEqual(sidePoint(A, 'right'), { x: 100, y: 30 });
  assert.equal(sideToward(A, { x: 350, y: 60 }), 'right');
  assert.equal(sideToward(A, { x: 50, y: 400 }), 'bottom');
  assert.equal(nearestSide(B, { x: 350, y: 205 }), 'top');
});

test('reta, curva e cotovelo saem e chegam pelos lados pedidos', () => {
  const r = linkGeom(A, 'right', B, 'left', 'reta');
  assert.deepEqual([r.start.x, r.start.y, r.end.x, r.end.y], [100, 30, 300, 230]);
  const c = linkGeom(A, 'bottom', B, 'top', 'curva');
  assert.match(c.d, /^M50 60C/);
  assert.equal(Math.round(c.end.angle), 90, 'chega de cima para baixo no lado de cima');
  const e = linkGeom(A, 'right', B, 'left', 'cotovelo');
  const nums = e.d.slice(1).split('L').map((p) => p.split(' ').map(Number));
  for (let i = 1; i < nums.length; i++) assert.ok(nums[i][0] === nums[i - 1][0] || nums[i][1] === nums[i - 1][1], 'só trechos retos na horizontal ou vertical');
  assert.equal(Math.round(e.end.angle), 0);
});

test('ligações antigas continuam retas com seta no fim', () => {
  assert.deepEqual(styleOf({}), { kind: 'reta', dash: 'solido', startCap: 'nenhuma', endCap: 'seta', width: 2 });
});
