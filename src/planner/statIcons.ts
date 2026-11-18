/* Ícone de cada atributo e capacidade, pelo nome (sem acento e sem maiúsculas). Nomes desconhecidos usam um ícone geral. */
const RULES: [RegExp, string][] = [
  [/agil|destrez|reflex|velocid|rapid/, 'raio'],
  [/brav|coragem|vontade|determin/, 'fogo'],
  [/potenc|forca|muscul|vigor fisico/, 'martelo'],
  [/intelig|mente|racioc|cabeca|logic|conhec|estud/, 'cerebro'],
  [/percep|atenc|sentid|vigil/, 'olho'],
  [/papo|carism|presenc|labia|persuas|lideran|social|conversa|enganar|intimid/, 'balao'],
  [/cardio|folego|resisten|vigor|vitalid|saude/, 'coracao'],
  [/briga|luta|combate|soco|armas brancas/, 'mao'],
  [/espirit|alma|fe$|fe |religi|sagrad/, 'fantasma'],
  [/ocult|magia|arcan|ritual|feitic/, 'vela'],
  [/investig|pesquis|busca|dedu/, 'lupa'],
  [/mira|pontaria|tiro|arma de fogo|atirar/, 'alvo'],
  [/furtiv|esconder|discri|sombra/, 'cego'],
  [/dirig|pilot|condu/, 'carro'],
  [/medic|socorr|cura|primeir/, 'curativo'],
  [/sorte|azar|acaso/, 'dado'],
  [/sanidade|nervo|calma|panico/, 'panico'],
];
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export function statIcon(name: string, fallback: string): string {
  const n = plain(name);
  for (const [re, id] of RULES) if (re.test(n)) return id;
  return fallback;
}
