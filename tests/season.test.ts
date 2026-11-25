import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inChristmasSeason, normalizeSeasonPref, xmasOn } from '../src/lib/season.ts';

test('época de Natal: de 15 de novembro a 6 de janeiro', () => {
  const d = (m: number, day: number) => new Date(2026, m - 1, day, 12);
  assert.equal(inChristmasSeason(d(11, 14)), false);
  assert.equal(inChristmasSeason(d(11, 15)), true);
  assert.equal(inChristmasSeason(d(12, 25)), true);
  assert.equal(inChristmasSeason(d(1, 6)), true);
  assert.equal(inChristmasSeason(d(1, 7)), false);
  assert.equal(inChristmasSeason(d(7, 1)), false);
});

test('enfeites: automático segue a época; sempre e desligado ignoram a data', () => {
  const julho = new Date(2026, 6, 1); const natal = new Date(2026, 11, 24);
  assert.equal(xmasOn('auto', julho), false); assert.equal(xmasOn('auto', natal), true);
  assert.equal(xmasOn('on', julho), true); assert.equal(xmasOn('off', natal), false);
});

test('preferência antiga (liga/desliga) vira o modo novo', () => {
  assert.equal(normalizeSeasonPref(true), 'auto');
  assert.equal(normalizeSeasonPref(false), 'off');
  assert.equal(normalizeSeasonPref(undefined), 'auto');
  assert.equal(normalizeSeasonPref('on'), 'on');
});
