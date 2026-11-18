/*
 * Fontes que não acompanham o COGITO por completo:
 *  - Bree Serif Bold (capítulos): a versão gratuita só tem o peso Regular, que vem embutido e recebe
 *    negrito aplicado pelo aplicativo; com o arquivo da Bold de verdade, usa-se ele.
 * O aplicativo usa a fonte instalada no computador, ou um arquivo colocado em Documentos\\COGITO\\Fontes.
 */
import { create } from 'zustand';
import { api } from '../api';

export type FontSource = 'pasta' | 'sistema' | 'substituta';
interface Status { title: FontSource; chapter: FontSource }
export const useFonts = create<Status>(() => ({ title: 'substituta', chapter: 'substituta' }));

const SLOTS = [
  { key: 'chapter' as const, family: 'Cogito Chapter Bold', file: /bree.*(bold|bd)/i, system: ['Bree Serif Bold', 'BreeSerif-Bold'] },
];

function systemHas(name: string): boolean {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return false;
  const sample = 'COGITO mmmmmlli 0123';
  return ['monospace', 'serif'].some((base) => {
    ctx.font = `40px ${base}`;
    const w0 = ctx.measureText(sample).width;
    ctx.font = `40px "${name}", ${base}`;
    return Math.abs(ctx.measureText(sample).width - w0) > 0.5;
  });
}

const added = new Map<string, FontFace>();

export async function loadUserFonts() {
  let files: { name: string; url: string }[] = [];
  try { files = await api.listFonts(); } catch { /* pasta indisponível */ }
  const status: Status = { title: 'substituta', chapter: 'substituta' };
  for (const slot of SLOTS) {
    const old = added.get(slot.family);
    if (old) { document.fonts.delete(old); added.delete(slot.family); }
    const file = files.find((f) => slot.file.test(f.name));
    if (file) {
      try {
        const face = new FontFace(slot.family, `url("${file.url}")`, { weight: '100 900' });
        await face.load();
        document.fonts.add(face);
        added.set(slot.family, face);
        status[slot.key] = 'pasta';
        continue;
      } catch { /* arquivo de fonte inválido: tenta a do sistema */ }
    }
    if (slot.system.some(systemHas)) status[slot.key] = 'sistema';
  }
  useFonts.setState(status);
}
