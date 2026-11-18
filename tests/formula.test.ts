import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, formulaResult, resolveFormulas, tableGrid, colName } from '../src/lib/formula.ts';

const grid = [
  ['Item', 'Qtd', 'Preço', 'Total'],
  ['Espada', '2', '15', '=B2*C2'],
  ['Escudo', '1', '10,5', '=B3*C3'],
  ['Poção', '3', '2 po', '=B4*C4'],
  ['', '', 'Soma', '=SOMA(D2:D4)'],
];

test('referências, intervalos e funções', () => {
  assert.equal(evaluate('=B2*C2', grid), 30);
  assert.equal(evaluate('=SOMA(D2:D4)', grid), 46.5);
  assert.equal(evaluate('=MÉDIA(B2:B4)', grid), 2);
  assert.equal(evaluate('=max(c2:c4) - min(c2:c4)', grid), 13);
  assert.equal(evaluate('=SUM(B2:B4; 10)', grid), 16);
  assert.equal(evaluate('=ARRED(C3*1,333; 1)', grid), 14);
  assert.equal(evaluate('=2^3+(1+1)*2', grid), 12);
  assert.equal(evaluate('=CONT(A1:D1)', grid), 0);
  assert.equal(evaluate('=-B2+ABS(-5)', grid), 3);
});

test('erros claros', () => {
  assert.equal(formulaResult('=B2/0', grid), '#DIV/0');
  assert.equal(formulaResult('=Z99', grid), '#REF');
  assert.equal(formulaResult('=FOO(1)', grid), '#NOME');
  assert.equal(formulaResult('=1+', grid), '#ERRO');
  assert.equal(formulaResult('=A1', [['=A1']]), '#CICLO');
  assert.equal(formulaResult('=SOMA(D2:D4)', grid), '46,5');
});

test('colunas com letras', () => {
  assert.deepEqual([0, 25, 26, 27].map(colName), ['A', 'Z', 'AA', 'AB']);
});

test('documento: grade da tabela e troca das fórmulas pelo resultado', () => {
  const cell = (t: string, type = 'tableCell') => ({ type, content: [{ type: 'paragraph', content: t ? [{ type: 'text', text: t }] : undefined }] });
  const doc = { type: 'doc', content: [{ type: 'table', content: [
    { type: 'tableRow', content: [cell('PV', 'tableHeader'), cell('Bônus', 'tableHeader'), cell('Total', 'tableHeader')] },
    { type: 'tableRow', content: [cell('12'), cell('3'), cell('=A2+B2')] },
  ] }] };
  assert.deepEqual(tableGrid(doc.content[0] as never), [['PV', 'Bônus', 'Total'], ['12', '3', '=A2+B2']]);
  const out = resolveFormulas(doc as never) as typeof doc;
  assert.equal((out.content[0] as any).content[1].content[2].content[0].content[0].text, '15');
  assert.equal((doc.content[0] as any).content[1].content[2].content[0].content[0].text, '=A2+B2', 'original intacto');
});
