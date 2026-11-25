/*
 * Enfeites sazonais (ADR-010): opcionais, isolados do núcleo e, no modo automático, ligados só na época.
 * Natal: de 15 de novembro a 6 de janeiro (Dia de Reis).
 */
export type SeasonPref = 'auto' | 'on' | 'off';

/** Está na época de Natal (15/11 a 6/1)? */
export function inChristmasSeason(d: Date = new Date()): boolean {
  const m = d.getMonth(); const day = d.getDate();
  return (m === 10 && day >= 15) || m === 11 || (m === 0 && day <= 6);
}

/** Os enfeites de Natal aparecem agora? */
export const xmasOn = (pref: SeasonPref, d: Date = new Date()) => pref === 'on' || (pref === 'auto' && inChristmasSeason(d));

/** Preferência guardada nas versões até a 0.17 (liga/desliga) → modo novo: ligado vira automático, desligado continua. */
export function normalizeSeasonPref(v: unknown): SeasonPref {
  if (v === 'auto' || v === 'on' || v === 'off') return v;
  return v === false ? 'off' : 'auto';
}
