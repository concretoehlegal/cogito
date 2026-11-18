/* Medição de páginas: descobre a partir de qual bloco o conteúdo não cabe mais. */

const isEmptyParagraph = (el: Element) => el.tagName === 'P' && !el.textContent?.trim() && !el.querySelector('img');

/** Blocos de primeiro nível de uma página (ignora marcadores internos do editor). */
export function contentBlocks(container: HTMLElement): HTMLElement[] {
  return Array.from(container.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !/ProseMirror-(gapcursor|widget|separator)/.test(el.className),
  );
}

/**
 * Índice do primeiro bloco que ultrapassa a página, ou -1 se tudo cabe.
 * Em 1 coluna o limite é vertical; em 2 colunas, o excedente vaza para a direita.
 * Parágrafos vazios no fim da página não contam.
 */
export function overflowIndex(container: HTMLElement, limitBottom: number, columns: 1 | 2): number {
  const blocks = contentBlocks(container);
  let end = blocks.length;
  while (end > 0 && isEmptyParagraph(blocks[end - 1])) end--;
  const box = container.getBoundingClientRect();
  for (let i = 0; i < end; i++) {
    const r = blocks[i].getBoundingClientRect();
    if (columns === 2 ? r.right > box.right + 2 : r.bottom > limitBottom + 1) return i;
  }
  return -1;
}
