import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitCardRoom } from '../src/planner/model.ts';
import type { PlanNode } from '../src/game/types.ts';

const node = (id: string, type: PlanNode['type'], x: number, y: number, w: number, h: number, boss = false) =>
  ({ id, type, x, y, w, h, title: id, ...(type === 'inimigo' ? { sheet: { boss } } : {}) }) as unknown as PlanNode;

test('chefe que vira carta larga empurra a ficha ao lado e alarga a moldura', () => {
  const frame = node('ato', 'moldura', 0, 0, 800, 400);
  const boss = node('verme', 'inimigo', 40, 40, 220, 300, true);
  const right = node('cultista', 'inimigo', 280, 40, 220, 300);
  const below = node('nota', 'nota', 300, 500, 200, 100);
  const nodes = [frame, boss, right, below];
  fitCardRoom(nodes, boss);
  assert.equal(boss.w, 460);
  const d = boss.w - 220;
  assert.equal(right.x, 280 + d, 'a carta ao lado anda para a direita');
  assert.ok(right.x >= boss.x + boss.w, 'nada fica por baixo do chefe');
  assert.equal(frame.w, 800 + d, 'a moldura cresce junto');
  assert.equal(below.x, 300, 'o que está em outra faixa não se mexe');
});

test('carta que já está no formato certo não mexe em nada', () => {
  const boss = node('verme', 'inimigo', 0, 0, 460, 300, true);
  const right = node('cultista', 'inimigo', 480, 0, 220, 300);
  fitCardRoom([boss, right], boss);
  assert.equal(right.x, 480);
});
