/* Estado do Bestiário (só no app; nada é gravado nas campanhas do Planejador). */
import { create } from 'zustand';
import type { Actor, BarDef } from '../game/types';
import type { HuntState } from './engine';

/** Fichas de uma campanha do Planejador no formato do Bestiário. */
export interface HuntCampaign { id: string; name: string; bars: BarDef[]; actors: Actor[] }

interface HuntUi {
  planId: string | null;           // campanha escolhida (pode vir do Planejador)
  campaign: HuntCampaign | null;
  heroId: string | null;
  prey: Record<string, number>;   // id da ficha → quantas
  game: HuntState | null;
}
export const useHunt = create<HuntUi>(() => ({ planId: null, campaign: null, heroId: null, prey: {}, game: null }));
export const preyList = (s: HuntUi) => {
  const c = s.campaign; if (!c) return [];
  return Object.entries(s.prey).flatMap(([id, n]) => { const a = c.actors.find((x) => x.id === id); return a ? Array.from({ length: n }, () => a) : []; });
};
