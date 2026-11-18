import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToc, flatPages, newBook, newChapter, newPage, newSection, normalizeBook } from '../src/model.ts';

function sample() {
  const b = newBook('Teste', 'A4');
  const c2 = newChapter('Combate');
  c2.sections.push(newSection('Iniciativa'), newSection('Ataques'));
  c2.sections[1].pages.push(newPage());
  b.chapters.push(c2);
  return b;
}

test('páginas em ordem: capítulo, depois suas seções', () => {
  const b = sample();
  const flat = flatPages(b);
  assert.equal(flat.length, 5);
  assert.deepEqual(flat.map((f) => f.section?.title ?? f.chapter.title), ['Capítulo 1', 'Combate', 'Iniciativa', 'Ataques', 'Ataques']);
});

test('sumário automático segue capítulos e seções', () => {
  const toc = buildToc(sample());
  assert.deepEqual(toc.map((e) => [e.label, e.level, e.pageIndex + 1]), [['Capítulo 1', 1, 1], ['Combate', 1, 2], ['Iniciativa', 2, 3], ['Ataques', 2, 4]]);
  assert.ok(toc.every((e) => !e.edited));
});

test('edições manuais sobrevivem a mudanças na estrutura', () => {
  const b = sample();
  const [c1, c2] = b.chapters;
  b.toc.overrides[c2.sections[1].id] = { label: 'Ataques e Dano' };
  b.toc.overrides[c2.sections[0].id] = { hidden: true };
  b.toc.custom.push({ id: 'x', label: 'Apêndice', pageId: c2.sections[1].pages[1].id, level: 2 });

  // muda a estrutura: renomeia, reordena capítulos e cria outro
  c1.title = 'O Mundo';
  b.chapters.reverse();
  b.chapters.push(newChapter('Magia'));

  const toc = buildToc(b);
  assert.deepEqual(toc.map((e) => e.label), ['Combate', 'Iniciativa', 'Ataques e Dano', 'Apêndice', 'O Mundo', 'Magia']);
  assert.equal(toc.find((e) => e.label === 'Iniciativa')!.hidden, true);
  assert.equal(toc.find((e) => e.label === 'Ataques e Dano')!.edited, true);
  assert.equal(toc.find((e) => e.label === 'O Mundo')!.edited, false);       // automático acompanha a renomeação
  assert.equal(toc.find((e) => e.label === 'Apêndice')!.pageIndex, 3);
  assert.equal(toc.find((e) => e.label === 'Magia')!.pageIndex, 5);
});

test('item manual cujo destino foi excluído continua no sumário, sem página', () => {
  const b = sample();
  b.toc.custom.push({ id: 'x', label: 'Órfão', pageId: 'nao-existe', level: 1 });
  const e = buildToc(b).at(-1)!;
  assert.equal(e.label, 'Órfão');
  assert.equal(e.pageId, null);
});

test('livros antigos ou incompletos são normalizados ao abrir', () => {
  const b = normalizeBook({ id: 'a', title: 'X', chapters: [{ title: 'C', pages: [{}], sections: [{ pages: [{ format: 'A3', columns: 2 }] }] }] });
  assert.equal(b.format, 'A4');
  assert.equal(b.toc.title, 'Sumário');
  assert.equal(b.chapters[0].pages[0].content.type, 'doc');
  assert.equal(b.chapters[0].sections[0].pages[0].format, 'A3');
  assert.equal(b.chapters[0].sections[0].pages[0].columns, 2);
});
