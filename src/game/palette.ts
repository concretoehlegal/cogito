/*
 * Paleta das cartas: dez pares de cor (um tom escuro para o corpo e um tom vivo para o destaque).
 * Cartas de personagem e cartas de equipamento, habilidade e poder oculto usam estes pares.
 */
export interface CardPair { id: string; name: string; dark: string; light: string }

export const CARD_PAIRS: CardPair[] = [
  { id: 'navy', name: 'Azul-marinho e amarelo-ouro', dark: '#0D1B2A', light: '#F4B400' },
  { id: 'teal', name: 'Petróleo e coral', dark: '#006D77', light: '#FF6B6B' },
  { id: 'royal', name: 'Roxo-real e lilás', dark: '#4B0082', light: '#E6D6FF' },
  { id: 'charcoal', name: 'Carvão e turquesa', dark: '#1C1C1C', light: '#00C2CB' },
  { id: 'forest', name: 'Verde-floresta e sálvia', dark: '#1B4332', light: '#A7C957' },
  { id: 'burgundy', name: 'Bordô e bege', dark: '#800020', light: '#F5E6CA' },
  { id: 'slate', name: 'Azul-ardósia e laranja', dark: '#1E3A8A', light: '#FF8C00' },
  { id: 'chocolate', name: 'Chocolate e areia', dark: '#4E342E', light: '#D7B899' },
  { id: 'midnight', name: 'Meia-noite e pink', dark: '#0B132B', light: '#FF2E88' },
  { id: 'olive', name: 'Oliva e mostarda', dark: '#3D4D22', light: '#E3B505' },
];
export const pairById = (id: string) => CARD_PAIRS.find((p) => p.id === id) ?? CARD_PAIRS[0];

const rgb = (hex: string) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Par da paleta para uma cor qualquer (a cor viva ou a escura de um par, ou a mais próxima). */
export function pairOf(color: string | undefined, fallback = 'navy'): CardPair {
  if (!color || !/^#[0-9a-f]{3,8}$/i.test(color)) return pairById(fallback);
  const c = color.toLowerCase();
  const exact = CARD_PAIRS.find((p) => p.light.toLowerCase() === c || p.dark.toLowerCase() === c);
  if (exact) return exact;
  const [r, g, b] = rgb(c);
  let best = CARD_PAIRS[0]; let d = Infinity;
  for (const p of CARD_PAIRS) for (const k of [p.light, p.dark]) {
    const [r2, g2, b2] = rgb(k); const dd = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (dd < d) { d = dd; best = p; }
  }
  return best;
}

/** Par de cada tipo de carta de personagem. */
export const CHAR_PAIRS = { pc: pairById('navy'), npc: pairById('forest'), enemy: pairById('midnight'), boss: pairById('burgundy') };
