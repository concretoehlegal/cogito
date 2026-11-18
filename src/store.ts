/* Estado da aplicação, ações sobre o livro e salvamento automático. */
import { create } from 'zustand';
import { produce } from 'immer';
import type { Editor } from '@tiptap/core';
import { api, errorText } from './api';
import { soundSettings } from './lib/sound';
import {
  type Book, type BookMeta, type DocNode, type Page, type PageFormat, type TocCustom, type TocOverride,
  findPageContainer, findSection, flatPages, newBook, newChapter, newPage, newSection, nodeText, normalizeBook, pagesOf, uid,
} from './model';

export type Selection = { kind: 'toc' } | { kind: 'page'; pageId: string };
export type SaveStatus = { state: 'saved' | 'dirty' | 'saving' | 'error'; at?: number; error?: string };
export type RightTab = 'inserir' | 'dados' | 'biblioteca' | 'anexos';
/** As três áreas do app. Valores antigos (campanhas, caçada) caem no lugar novo. */
export type HomeTab = 'livros' | 'planejador' | 'bestiario';
const homeTabOf = (v: string): HomeTab => (v === 'planejador' || v === 'campanhas' ? 'planejador' : v === 'bestiario' || v === 'cacada' ? 'bestiario' : 'livros');

export interface Viewer { key: string; kind: 'pdf' | 'image' | 'other'; title: string; url: string; source: 'biblioteca' | 'anexo'; name?: string }
export interface Prefs { sound: boolean; volume: number; diceAnim: boolean; spell: boolean; uiScale: number; leftWidth: number; rightWidth: number; diceColor: string }
export interface Toast { id: number; kind: 'info' | 'error' | 'ok'; text: string; action?: { label: string; run: () => void } }

interface AppState {
  screen: 'home' | 'editor' | 'plano' | 'bestiario';
  homeTab: HomeTab;
  books: BookMeta[];
  booksLoaded: boolean;
  book: Book | null;
  sel: Selection;
  viewMode: 'single' | 'spread';
  zoom: number | 'fit';
  save: SaveStatus;
  /** Incrementado quando o conteúdo de uma página muda por fora do editor (para recriá-lo). */
  contentRev: Record<string, number>;
  epoch: number;
  activeEditor: Editor | null;
  toasts: Toast[];
  viewer: Viewer | null;
  theme: 'dark' | 'light';
  leftOpen: boolean;
  rightTab: RightTab | null;
  renaming: string | null;
  busy: string | null;
  prefs: Prefs;
}

const stored = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
export const remember = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem espaço */ } };

export const useApp = create<AppState>(() => ({
  screen: 'home', homeTab: homeTabOf(stored('cogito.homeTab', 'livros')), books: [], booksLoaded: false, book: null, sel: { kind: 'toc' },
  viewMode: stored('cogito.viewMode', 'single'), zoom: stored('cogito.zoom', 'fit'),
  save: { state: 'saved' }, contentRev: {}, epoch: 0, activeEditor: null, toasts: [], viewer: null,
  theme: stored('cogito.theme', 'dark'), leftOpen: true, rightTab: stored('cogito.rightTab', 'inserir'),
  renaming: null, busy: null,
  prefs: { sound: true, volume: 0.6, diceAnim: true, spell: true, uiScale: 1, leftWidth: 286, rightWidth: 300, diceColor: '#f2f2f2', ...stored<Partial<Prefs>>('cogito.prefs', {}) },
}));

const get = useApp.getState;
const set = useApp.setState;

const applySound = (p: Prefs) => { soundSettings.enabled = p.sound; soundSettings.volume = p.volume; };
applySound(get().prefs);
export function setPrefs(patch: Partial<Prefs>) {
  const prefs = { ...get().prefs, ...patch };
  set({ prefs }); remember('cogito.prefs', prefs); applySound(prefs);
  if (patch.spell !== undefined) void api.setSpellcheck(prefs.spell);
  if (patch.uiScale !== undefined) void api.setUiScale(prefs.uiScale);
}

/* ───────────── avisos ───────────── */

let toastSeq = 1;
export function toast(text: string, kind: Toast['kind'] = 'info', action?: Toast['action']) {
  const id = toastSeq++;
  set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text, action }] }));
  setTimeout(() => dismissToast(id), kind === 'error' ? 12000 : 6000);
}
export const dismissToast = (id: number) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));

/* ───────────── salvamento automático ───────────── */

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<boolean> | null = null;
const flushers = new Set<() => void>();

/** Editores abertos registram aqui como entregar o texto ainda não confirmado. */
export function registerFlusher(fn: () => void): () => void { flushers.add(fn); return () => { flushers.delete(fn); }; }
export function flushEditors() { flushers.forEach((f) => f()); }

function scheduleSave(delay = 800) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveNow(); }, delay);
}

/** Grava o livro no disco. Devolve false se o salvamento falhou. */
export async function saveNow(): Promise<boolean> {
  flushEditors();
  clearTimeout(saveTimer);
  clearTimeout(retryTimer);
  while (inFlight) await inFlight;
  const { book, save } = get();
  if (!book || save.state === 'saved') return true;
  inFlight = (async () => {
    set((s) => ({ save: { ...s.save, state: 'saving' } }));
    try {
      const r = await api.saveBook(book);
      const cur = get();
      if (cur.book === book) set({ save: { state: 'saved', at: r.savedAt } });
      else if (cur.book?.id === book.id) { set({ save: { state: 'dirty', at: r.savedAt } }); scheduleSave(300); }
      return true;
    } catch (e) {
      if (get().book?.id === book.id) {
        set((s) => ({ save: { state: 'error', at: s.save.at, error: errorText(e) } }));
        retryTimer = setTimeout(() => { void saveNow(); }, 8000);
      }
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function mutate(fn: (b: Book) => void) {
  const s = get();
  if (!s.book) return;
  const book = produce(s.book, fn);
  if (book === s.book) return;
  set({ book, save: { ...s.save, state: 'dirty' } });
  scheduleSave();
}

const bump = (...pageIds: string[]) => set((s) => {
  const contentRev = { ...s.contentRev };
  for (const id of pageIds) contentRev[id] = (contentRev[id] ?? 0) + 1;
  return { contentRev };
});

function ensureSelection() {
  const { book, sel } = get();
  if (!book || sel.kind !== 'page') return;
  if (!findPageContainer(book, sel.pageId)) {
    const first = flatPages(book)[0];
    set({ sel: first ? { kind: 'page', pageId: first.page.id } : { kind: 'toc' } });
  }
}

/* ───────────── livros ───────────── */

export async function refreshBooks() {
  try { set({ books: await api.listBooks(), booksLoaded: true }); }
  catch (e) { set({ booksLoaded: true }); toast(`Não foi possível listar os livros: ${errorText(e)}`, 'error'); }
}

export async function createBook(title: string, format: PageFormat) {
  try {
    const book = normalizeBook(await api.createBook(newBook(title.trim() || 'Livro sem título', format)));
    enterBook(book);
  } catch (e) { toast(`Não foi possível criar o livro: ${errorText(e)}`, 'error'); }
}

function enterBook(book: Book) {
  const first = flatPages(book)[0];
  set((s) => ({
    book, screen: 'editor', save: { state: 'saved', at: book.updatedAt }, contentRev: {}, epoch: s.epoch + 1,
    sel: first ? { kind: 'page', pageId: first.page.id } : { kind: 'toc' }, activeEditor: null, viewer: null, renaming: null,
  }));
}

export async function openBook(id: string) {
  set({ busy: 'Abrindo livro…' });
  try {
    const { book, recoveredFrom } = await api.loadBook(id);
    enterBook(normalizeBook(book));
    if (recoveredFrom) {
      toast(`O arquivo principal deste livro estava ilegível. Ele foi recuperado usando ${recoveredFrom}. Confira o conteúdo.`, 'error');
      set((s) => ({ save: { ...s.save, state: 'dirty' } }));
      scheduleSave(200);
    }
  } catch (e) { toast(errorText(e), 'error'); }
  finally { set({ busy: null }); }
}

/** Volta à tela inicial, garantindo antes que tudo foi salvo. */
export async function closeBook(force = false): Promise<boolean> {
  const ok = await saveNow();
  if (!ok && !force) return false;
  clearTimeout(saveTimer); clearTimeout(retryTimer);
  set({ book: null, screen: 'home', activeEditor: null, viewer: null, save: { state: 'saved' } });
  void refreshBooks();
  return true;
}

export async function renameBookOnDisk(id: string, title: string) {
  try { await api.renameBook(id, title); await refreshBooks(); }
  catch (e) { toast(`Não foi possível renomear: ${errorText(e)}`, 'error'); }
}

export async function deleteBook(id: string) {
  try {
    const r = await api.deleteBook(id);
    toast(`Livro movido para a ${r.where}.`, 'ok');
    await refreshBooks();
  } catch (e) { toast(`Não foi possível excluir: ${errorText(e)}`, 'error'); }
}

export async function restoreBackup(file: string) {
  const cur = get().book;
  if (!cur) return;
  try {
    await saveNow();
    await api.backupNow(cur.id).catch(() => {});
    const restored = normalizeBook(await api.restoreBackup(cur.id, file));
    const first = flatPages(restored)[0];
    set((s) => ({
      book: restored, epoch: s.epoch + 1, contentRev: {}, activeEditor: null, save: { ...s.save, state: 'dirty' },
      sel: first ? { kind: 'page', pageId: first.page.id } : { kind: 'toc' },
    }));
    scheduleSave(100);
    toast('Backup restaurado. A versão anterior também foi guardada como backup.', 'ok');
  } catch (e) { toast(`Não foi possível restaurar: ${errorText(e)}`, 'error'); }
}

export const setBookProps = (patch: Partial<Pick<Book, 'title' | 'author' | 'format' | 'pageStyle' | 'showPageNumbers'>>) =>
  mutate((b) => { Object.assign(b, patch); });

/* ───────────── navegação ───────────── */

export function select(sel: Selection) { set({ sel }); }
export function goToPage(pageId: string) { set({ sel: { kind: 'page', pageId } }); }
export function stepPage(delta: number) {
  const { book, sel, viewMode } = get();
  if (!book) return;
  const flat = flatPages(book);
  if (!flat.length) return;
  if (sel.kind !== 'page') { if (delta > 0) goToPage(flat[0].page.id); return; }
  const i = flat.findIndex((f) => f.page.id === sel.pageId);
  let target = i + delta;
  if (viewMode === 'spread') {
    // Pares fixos (1,2) (3,4)… — avança ou recua um par inteiro.
    const start = i - (i % 2);
    target = delta > 0 ? start + 2 : start - 2;
  }
  if (target < 0) { set({ sel: { kind: 'toc' } }); return; }
  if (target >= flat.length) return;
  goToPage(flat[target].page.id);
}

/* ───────────── estrutura ───────────── */

export function addChapter(): string {
  const n = (get().book?.chapters.length ?? 0) + 1;
  const ch = newChapter(`Capítulo ${n}`);
  mutate((b) => { b.chapters.push(ch); });
  set({ sel: { kind: 'page', pageId: ch.pages[0].id }, renaming: ch.id });
  return ch.id;
}

export function addSection(chapterId: string): string | null {
  const sec = newSection('Nova seção');
  let ok = false;
  mutate((b) => { const c = b.chapters.find((x) => x.id === chapterId); if (c) { c.sections.push(sec); ok = true; } });
  if (!ok) return null;
  set({ sel: { kind: 'page', pageId: sec.pages[0].id }, renaming: sec.id });
  return sec.id;
}

/** Nova página em branco: depois de `afterPageId`, ou no fim do capítulo/seção indicado. */
export function addPage(opts: { afterPageId?: string; containerId?: string }): string | null {
  flushEditors();
  const book = get().book;
  if (!book) return null;
  let page: Page | null = null;
  mutate((b) => {
    if (opts.afterPageId) {
      const loc = findPageContainer(b, opts.afterPageId);
      if (!loc) return;
      const prev = loc.list[loc.index];
      page = newPage(undefined, { ...(prev.format ? { format: prev.format } : {}), ...(prev.columns === 2 ? { columns: 2 as const } : {}) });
      loc.list.splice(loc.index + 1, 0, page);
    } else if (opts.containerId) {
      const list = pagesOf(b, opts.containerId);
      if (!list) return;
      page = newPage();
      list.push(page);
    }
  });
  if (!page) return null;
  goToPage((page as Page).id);
  return (page as Page).id;
}

export function addPageAtEnd(): string | null {
  const book = get().book;
  if (!book) return null;
  if (!book.chapters.length) { addChapter(); return null; }
  const { sel } = get();
  if (sel.kind === 'page') return addPage({ afterPageId: sel.pageId });
  const last = book.chapters[book.chapters.length - 1];
  const lastSec = last.sections[last.sections.length - 1];
  return addPage({ containerId: lastSec ? lastSec.id : last.id });
}

export function duplicatePage(pageId: string) {
  flushEditors();
  let copyId: string | null = null;
  mutate((b) => {
    const loc = findPageContainer(b, pageId);
    if (!loc) return;
    const src = loc.list[loc.index];
    const copy: Page = { ...JSON.parse(JSON.stringify(src)), id: uid('pag') };
    loc.list.splice(loc.index + 1, 0, copy);
    copyId = copy.id;
  });
  if (copyId) goToPage(copyId);
}

export function renameNode(id: string, title: string) {
  const t = title.trim();
  if (!t) return;
  flushEditors();
  let synced: string | null = null;
  mutate((b) => {
    // Se o título no topo da primeira página ainda é igual ao nome antigo, acompanha a renomeação.
    const apply = (node: { title: string; pages: Page[] }) => {
      const old = node.title;
      node.title = t;
      const first = node.pages[0];
      const head = first?.content.content?.[0];
      if (first && head?.type === 'heading' && nodeText(head) === old) { head.content = [{ type: 'text', text: t }]; synced = first.id; }
    };
    for (const c of b.chapters) {
      if (c.id === id) { apply(c); return; }
      for (const s of c.sections) if (s.id === id) { apply(s); return; }
    }
  });
  if (synced) bump(synced);
}

export function deleteChapter(id: string) {
  mutate((b) => { b.chapters = b.chapters.filter((c) => c.id !== id); delete b.toc.overrides[id]; });
  ensureSelection();
}
export function deleteSection(id: string) {
  mutate((b) => { for (const c of b.chapters) c.sections = c.sections.filter((s) => s.id !== id); delete b.toc.overrides[id]; });
  ensureSelection();
}
export function deletePage(pageId: string) {
  const book = get().book;
  if (!book) return;
  const flat = flatPages(book);
  const i = flat.findIndex((f) => f.page.id === pageId);
  const neighbour = flat[i + 1] ?? flat[i - 1];
  mutate((b) => { const loc = findPageContainer(b, pageId); if (loc) loc.list.splice(loc.index, 1); });
  const { sel } = get();
  if (sel.kind === 'page' && sel.pageId === pageId) set({ sel: neighbour ? { kind: 'page', pageId: neighbour.page.id } : { kind: 'toc' } });
}

export const setPageProps = (pageId: string, patch: { format?: PageFormat | null; columns?: 1 | 2 }) => mutate((b) => {
  const loc = findPageContainer(b, pageId);
  if (!loc) return;
  const p = loc.list[loc.index];
  if (patch.format !== undefined) { if (patch.format === null) delete p.format; else p.format = patch.format; }
  if (patch.columns !== undefined) { if (patch.columns === 2) p.columns = 2; else delete p.columns; }
});

export type DropPos = 'before' | 'after' | 'inside';

export function moveChapter(id: string, refId: string, pos: DropPos) {
  if (id === refId) return;
  mutate((b) => {
    const from = b.chapters.findIndex((c) => c.id === id);
    if (from < 0) return;
    const [item] = b.chapters.splice(from, 1);
    const ref = b.chapters.findIndex((c) => c.id === refId);
    b.chapters.splice(ref < 0 ? b.chapters.length : ref + (pos === 'after' ? 1 : 0), 0, item);
  });
}

/** Move uma seção para antes/depois de outra seção, ou para dentro de um capítulo. */
export function moveSection(id: string, refId: string, pos: DropPos) {
  if (id === refId) return;
  mutate((b) => {
    const src = findSection(b, id);
    if (!src) return;
    if (pos === 'inside') {
      const target = b.chapters.find((c) => c.id === refId);
      if (!target) return;
      src.chapter.sections.splice(src.index, 1);
      target.sections.push(src.section);
      return;
    }
    if (!findSection(b, refId)) return;
    src.chapter.sections.splice(src.index, 1);
    const ref = findSection(b, refId)!;
    ref.chapter.sections.splice(ref.index + (pos === 'after' ? 1 : 0), 0, src.section);
  });
}

/** Move uma página para antes/depois de outra página, ou para o fim de um capítulo/seção. */
export function movePage(id: string, refId: string, pos: DropPos) {
  if (id === refId) return;
  flushEditors();
  mutate((b) => {
    const src = findPageContainer(b, id);
    if (!src) return;
    const page = src.list[src.index];
    if (pos === 'inside') {
      const list = pagesOf(b, refId);
      if (!list) return;
      src.list.splice(src.index, 1);
      list.push(page);
      return;
    }
    if (!findPageContainer(b, refId)) return;
    src.list.splice(src.index, 1);
    const ref = findPageContainer(b, refId)!;
    ref.list.splice(ref.index + (pos === 'after' ? 1 : 0), 0, page);
  });
}

/** Sobe ou desce um item dentro da própria lista. */
export function shiftItem(kind: 'chapter' | 'section' | 'page', id: string, delta: -1 | 1) {
  if (kind === 'page') flushEditors();
  mutate((b) => {
    let list: { id: string }[] | undefined;
    if (kind === 'chapter') list = b.chapters;
    else if (kind === 'section') list = findSection(b, id)?.chapter.sections;
    else list = findPageContainer(b, id)?.list;
    if (!list) return;
    const i = list.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  });
}

/* ───────────── conteúdo ───────────── */

export function setPageContent(pageId: string, content: DocNode) {
  mutate((b) => { const loc = findPageContainer(b, pageId); if (loc) loc.list[loc.index].content = content; });
}

/** Move os blocos a partir de `index` para uma nova página logo em seguida. */
export function splitPage(pageId: string, index: number): string | null {
  flushEditors();
  let created: string | null = null;
  mutate((b) => {
    const loc = findPageContainer(b, pageId);
    if (!loc) return;
    const page = loc.list[loc.index];
    const nodes = page.content.content ?? [];
    const at = Math.max(1, index);
    if (at >= nodes.length) return;
    const rest = nodes.slice(at);
    page.content = { type: 'doc', content: nodes.slice(0, at) };
    const next = newPage({ type: 'doc', content: rest }, { ...(page.format ? { format: page.format } : {}), ...(page.columns === 2 ? { columns: 2 as const } : {}) });
    loc.list.splice(loc.index + 1, 0, next);
    created = next.id;
  });
  if (created) { bump(pageId); goToPage(created); }
  return created;
}

/* ───────────── sumário ───────────── */

export const setTocProps = (patch: { title?: string; includeInExport?: boolean }) => mutate((b) => { Object.assign(b.toc, patch); });

export const setTocOverride = (id: string, patch: TocOverride) => mutate((b) => {
  const next: TocOverride = { ...b.toc.overrides[id], ...patch };
  if (next.label === undefined || next.label.trim() === '') delete next.label;
  if (!next.hidden) delete next.hidden;
  if (Object.keys(next).length) b.toc.overrides[id] = next; else delete b.toc.overrides[id];
});
export const resetTocOverride = (id: string) => mutate((b) => { delete b.toc.overrides[id]; });
export const resetAllToc = () => mutate((b) => { b.toc.overrides = {}; b.toc.custom = []; });

export function addTocCustom(label: string, pageId: string | null, level: 1 | 2) {
  mutate((b) => { b.toc.custom.push({ id: uid('toc'), label: label.trim() || 'Novo item', pageId, level }); });
}
export const updateTocCustom = (id: string, patch: Partial<Omit<TocCustom, 'id'>>) => mutate((b) => {
  const c = b.toc.custom.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
});
export const removeTocCustom = (id: string) => mutate((b) => { b.toc.custom = b.toc.custom.filter((x) => x.id !== id); });

/* ───────────── interface ───────────── */

export function setViewMode(viewMode: 'single' | 'spread') { set({ viewMode }); remember('cogito.viewMode', viewMode); }
export function setZoom(zoom: number | 'fit') { set({ zoom }); remember('cogito.zoom', zoom); }
export function setRightTab(rightTab: RightTab | null) { set({ rightTab }); remember('cogito.rightTab', rightTab); }
export function setTheme(theme: 'dark' | 'light') {
  set({ theme }); remember('cogito.theme', theme);
  document.documentElement.dataset.theme = theme;
  void api.setTheme(theme);
}
export const setActiveEditor = (editor: Editor | null) => { if (get().activeEditor !== editor) set({ activeEditor: editor }); };
export const openViewer = (viewer: Viewer | null) => set({ viewer });
export const setRenaming = (id: string | null) => set({ renaming: id });
export const setBusy = (busy: string | null) => set({ busy });
export function setHomeTab(homeTab: HomeTab) { set({ homeTab }); remember('cogito.homeTab', homeTab); }
export const setLeftOpen = (leftOpen: boolean) => set({ leftOpen });
