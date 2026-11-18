/* Ponte tipada com o processo principal (arquivos locais, diálogos e exportação). */
import type { Book, BookMeta } from './model';
import type { Plan, PlanMeta } from './game/types';

export interface BackupInfo { file: string; at: number; size: number }
export interface LibraryItem { id: string; title: string; file: string; size: number; addedAt: number; url: string }
export interface RefFile { name: string; size: number; addedAt: number; url: string }
export interface ImageRef { url: string; name: string }

export interface CogitoApi {
  info(): Promise<{ dataDir: string; version: string; platform: string }>;
  openDataFolder(): Promise<void>;
  showInFolder(path: string): Promise<void>;
  readyToClose(): Promise<void>;
  setTheme(theme: 'dark' | 'light'): Promise<void>;
  onBeforeClose(fn: () => void): void;
  setSpellcheck(enabled: boolean): Promise<void>;
  setUiScale(scale: number): Promise<void>;
  copyText(text: string): Promise<void>;
  listFonts(): Promise<{ name: string; url: string }[]>;
  openFontsFolder(): Promise<void>;

  listBooks(): Promise<BookMeta[]>;
  loadBook(id: string): Promise<{ book: Book; recoveredFrom: string | null }>;
  saveBook(book: Book): Promise<{ savedAt: number }>;
  createBook(book: Book): Promise<Book>;
  renameBook(id: string, title: string): Promise<BookMeta>;
  deleteBook(id: string): Promise<{ where: string }>;
  listBackups(id: string): Promise<BackupInfo[]>;
  restoreBackup(id: string, file: string): Promise<Book>;
  backupNow(id: string): Promise<BackupInfo[]>;

  pickImages(bookId: string): Promise<ImageRef[]>;
  saveImage(bookId: string, name: string, bytes: Uint8Array): Promise<ImageRef>;
  readImage(url: string): Promise<Uint8Array>;

  listRefs(bookId: string): Promise<RefFile[]>;
  addRefs(bookId: string): Promise<RefFile[]>;
  removeRef(bookId: string, name: string): Promise<RefFile[]>;
  openRefExternal(bookId: string, name: string): Promise<void>;

  listLibrary(): Promise<LibraryItem[]>;
  addToLibrary(): Promise<LibraryItem[]>;
  renameLibraryItem(id: string, title: string): Promise<LibraryItem[]>;
  removeLibraryItem(id: string): Promise<LibraryItem[]>;

  planList(): Promise<PlanMeta[]>;
  planCreate(meta: { name: string; description?: string; icon?: string; color?: string }): Promise<PlanMeta>;
  planLoad(id: string): Promise<Plan>;
  planSave(plan: Plan): Promise<{ savedAt: number }>;
  planUpdateMeta(id: string, patch: { name?: string; description?: string; icon?: string; color?: string }): Promise<PlanMeta>;
  planPickCover(id: string): Promise<PlanMeta | null>;
  planRemoveCover(id: string): Promise<PlanMeta>;
  planPickImages(id: string): Promise<{ file: string; name: string }[]>;
  planPutFile(id: string, name: string, bytes: Uint8Array): Promise<string>;
  planDelete(id: string): Promise<{ where: string }>;
  planOpenFolder(id?: string): Promise<void>;

  chooseExportPath(kind: 'pdf' | 'docx', defaultName: string): Promise<string | null>;
  printPdf(path: string): Promise<{ path: string; size: number }>;
  writeExport(path: string, bytes: Uint8Array): Promise<{ path: string; size: number }>;
}

declare global { interface Window { cogito: CogitoApi } }

export const api: CogitoApi = window.cogito;

/** Mensagem de erro limpa (sem o prefixo técnico do IPC). */
export function errorText(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
