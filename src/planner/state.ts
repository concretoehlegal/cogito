/* Estado do quadro aberto: edição com desfazer/refazer e salvamento automático no disco. */
import { create } from 'zustand';
import { produce } from 'immer';
import { api, errorText } from '../api';
import { toast, useApp } from '../store';
import type { Plan } from '../game/types';
import { fitCardRoom } from './model';
import { normalizePlan } from '../game/system';
import { setCardLabels } from '../game/Cards';

type Snap = Pick<Plan, 'nodes' | 'links' | 'name' | 'description' | 'icon' | 'color'>;
export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

interface PlanUi {
  plan: Plan | null;
  sel: string[];               // fichas selecionadas
  selLink: string | null;      // ligação selecionada
  past: Snap[]; future: Snap[];
  save: SaveState; savedAt: number;
  coalesce: string | null;     // agrupa digitação seguida num passo só do desfazer
}
export const usePlan = create<PlanUi>(() => ({ plan: null, sel: [], selLink: null, past: [], future: [], save: 'saved', savedAt: 0, coalesce: null }));

const snap = (p: Plan): Snap => ({ nodes: p.nodes, links: p.links, name: p.name, description: p.description, icon: p.icon, color: p.color });
const HISTORY = 150;
let timer = 0;
let inflight: Promise<void> | null = null;

async function writeNow() {
  window.clearTimeout(timer); timer = 0; due = 0;
  const { plan } = usePlan.getState();
  if (!plan) return;
  usePlan.setState({ save: 'saving' });
  try {
    const r = await api.planSave(plan);
    if (usePlan.getState().plan === plan) usePlan.setState({ save: 'saved', savedAt: r.savedAt });
    else usePlan.setState({ save: 'pending' });
  } catch (e) {
    usePlan.setState({ save: 'error' });
    toast(`Não foi possível salvar o quadro: ${errorText(e)}`, 'error');
  }
}
let due = 0;
function schedule(ms = 700) {
  usePlan.setState({ save: 'pending' });
  const at = Date.now() + ms;
  if (timer && due <= at) return; // já há um salvamento marcado mais cedo: não empurra para depois
  window.clearTimeout(timer);
  due = at;
  // Uma gravação de cada vez: a nova espera a anterior terminar, para uma versão velha nunca chegar depois ao disco.
  timer = window.setTimeout(() => {
    timer = 0;
    const p: Promise<void> = (inflight ?? Promise.resolve()).then(writeNow).finally(() => { if (inflight === p) inflight = null; });
    inflight = p;
  }, ms);
}
/** Grava o que estiver pendente (ao sair do quadro ou fechar o app). */
export async function flushPlan() {
  if (inflight) await inflight;
  if (timer || usePlan.getState().save === 'pending') await writeNow();
}

/**
 * Altera o quadro. `key` agrupa alterações seguidas (por exemplo, digitar num campo) num único passo do desfazer;
 * `history: false` para mudanças que não devem ser desfeitas (como a posição da visão).
 */
export function edit(fn: (p: Plan) => void, opts: { key?: string; history?: boolean } = {}) {
  const s = usePlan.getState();
  if (!s.plan) return;
  const next = produce(s.plan, fn);
  if (next === s.plan) return;
  const record = opts.history !== false && !(opts.key && opts.key === s.coalesce);
  usePlan.setState({
    plan: next,
    past: record ? [...s.past, snap(s.plan)].slice(-HISTORY) : s.past,
    future: opts.history === false ? s.future : [],
    coalesce: opts.history === false ? s.coalesce : opts.key ?? null,
  });
  schedule(opts.history === false ? 1500 : 700);
}
export function undo() {
  const s = usePlan.getState();
  if (!s.plan || !s.past.length) return;
  const prev = s.past[s.past.length - 1];
  usePlan.setState({ plan: { ...s.plan, ...prev }, past: s.past.slice(0, -1), future: [snap(s.plan), ...s.future].slice(0, HISTORY), coalesce: null, sel: s.sel.filter((id) => prev.nodes.some((n) => n.id === id)) });
  schedule();
}
export function redo() {
  const s = usePlan.getState();
  if (!s.plan || !s.future.length) return;
  const nxt = s.future[0];
  usePlan.setState({ plan: { ...s.plan, ...nxt }, past: [...s.past, snap(s.plan)].slice(-HISTORY), future: s.future.slice(1), coalesce: null });
  schedule();
}
export const select = (ids: string[], link: string | null = null) => usePlan.setState({ sel: ids, selLink: link, coalesce: null });

export async function openPlan(id: string) {
  try {
    const plan = normalizePlan(await api.planLoad(id));
    setCardLabels(plan.system!);
    // Chefes antigos (cartas estreitas) passam ao formato largo, empurrando para a direita o que estava ao lado.
    for (const n of plan.nodes) fitCardRoom(plan.nodes, n);
    usePlan.setState({ plan, sel: [], selLink: null, past: [], future: [], save: 'saved', savedAt: plan.updatedAt, coalesce: null });
    useApp.setState({ screen: 'plano' });
  } catch (e) { toast(errorText(e), 'error'); }
}
export async function closePlan() {
  await flushPlan();
  usePlan.setState({ plan: null, sel: [], selLink: null, past: [], future: [] });
  useApp.setState({ screen: 'home', homeTab: 'planejador' });
}
export const planFileUrl = (planId: string, name: string) => `cogito://app/__plan/${planId}/${encodeURIComponent(name)}`;
