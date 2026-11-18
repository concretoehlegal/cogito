/* Modelos de conteúdo que podem ser inseridos na página. */
import type { DocNode } from '../model';

const text = (t: string, ...marks: string[]): DocNode => ({ type: 'text', text: t, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: DocNode[]): DocNode => ({ type: 'paragraph', ...(content.length ? { content } : {}) });
const h = (level: 1 | 2 | 3, t: string): DocNode => ({ type: 'heading', attrs: { level }, content: [text(t)] });
const field = (label: string, value: string): DocNode => p(text(`${label} `, 'bold'), text(value));
const cell = (t: string, header = false, align?: string): DocNode => ({
  type: header ? 'tableHeader' : 'tableCell',
  content: [{ type: 'paragraph', ...(align ? { attrs: { textAlign: align } } : {}), ...(t ? { content: [text(t)] } : {}) }],
});
const row = (cells: string[], header = false, align?: string): DocNode => ({ type: 'tableRow', content: cells.map((c) => cell(c, header, align)) });

export function tableTemplate(rows = 3, cols = 3): DocNode {
  const head = row(Array.from({ length: cols }, (_, i) => `Coluna ${i + 1}`), true);
  const body = Array.from({ length: rows - 1 }, () => row(Array.from({ length: cols }, () => '')));
  return { type: 'table', content: [head, ...body] };
}

export function rollTableTemplate(sides: number): DocNode {
  const n = Math.min(sides, 20);
  const step = sides / n;
  const body = Array.from({ length: n }, (_, i) => {
    const a = Math.round(i * step) + 1; const b = Math.round((i + 1) * step);
    return row([a === b ? String(a) : `${a}–${b}`, '']);
  });
  return { type: 'table', content: [row([`d${sides}`, 'Resultado'], true), ...body] };
}

const attributes = (): DocNode => ({
  type: 'table',
  content: [
    row(['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'], true, 'center'),
    row(['10 (+0)', '10 (+0)', '10 (+0)', '10 (+0)', '10 (+0)', '10 (+0)'], false, 'center'),
  ],
});

export const characterSheet = (): DocNode => ({
  type: 'rpgBlock', attrs: { kind: 'ficha' },
  content: [
    h(3, 'Nome do personagem'),
    p(text('Raça · Classe · Nível 1', 'italic')),
    attributes(),
    field('Pontos de vida', '10'),
    field('Defesa', '10'),
    field('Deslocamento', '9 m'),
    field('Perícias', '—'),
    field('Equipamento', '—'),
    field('Habilidades', '—'),
    field('Histórico', '—'),
  ],
});

export const creatureBlock = (): DocNode => ({
  type: 'rpgBlock', attrs: { kind: 'criatura' },
  content: [
    h(3, 'Nome da criatura'),
    p(text('Tipo, tamanho, tendência', 'italic')),
    field('Defesa', '12'),
    field('Pontos de vida', '22 (4d8+4)'),
    field('Deslocamento', '9 m'),
    attributes(),
    field('Sentidos', '—'),
    field('Idiomas', '—'),
    field('Nível de desafio', '1'),
    p(text('Ações', 'bold')),
    p(text('Ataque. ', 'bold', 'italic'), text('Descreva o ataque, o alcance e o dano.')),
  ],
});

export const masterNote = (): DocNode => ({
  type: 'rpgBlock', attrs: { kind: 'nota' },
  content: [p(text('Nota do mestre. ', 'bold'), text('Escreva aqui uma dica, regra opcional ou lembrete.'))],
});

export const readAloud = (): DocNode => ({
  type: 'rpgBlock', attrs: { kind: 'leitura' },
  content: [p(text('Texto para ser lido em voz alta aos jogadores.'))],
});

export const itemBlock = (): DocNode => ({
  type: 'rpgBlock', attrs: { kind: 'item' },
  content: [
    h(3, 'Nome do item ou magia'),
    p(text('Tipo, raridade ou nível', 'italic')),
    p(text('Descrição dos efeitos, custos e condições de uso.')),
  ],
});

export const headingTemplate = (level: 1 | 2 | 3): DocNode => ({ type: 'heading', attrs: { level } });
export const imageNode = (src: string, alt = ''): DocNode => ({ type: 'image', attrs: { src, alt, width: '100%', align: 'center' } });
