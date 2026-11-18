/*
 * Ícones de Cair da Noite, desenhados para o COGITO (32 × 32).
 * Silhuetas cheias, cortes retos e detalhes "entalhados" (classe d = traço, f = recorte), no espírito
 * de xilogravura do tema noir. A cor vem de currentColor; os entalhes usam --ib (cor de fundo do lugar).
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface IconDef { id: string; name: string; cat: string; svg: string }

const D = (d: string) => `<path class="d" d="${d}"/>`;

const LIST: IconDef[] = [
  // ── armas e ferramentas ──
  { id: 'revolver', name: 'Revólver', cat: 'Armas', svg: '<path d="M2 9h18l1-2h4l1 2h4v5h-9l-1 3H13l-2 2-3 9H3l2-9-3-2z"/><circle class="f" cx="16" cy="11.5" r="1.6"/>' + D('M12 17c0 3 3 4 5 0') },
  { id: 'escopeta', name: 'Escopeta', cat: 'Armas', svg: '<path d="M1 11h23l1-1h6v5H19l-3 3H10l-5 9H1l3-10z"/>' + D('M19 11v4M8 15h6') },
  { id: 'faca', name: 'Faca', cat: 'Armas', svg: '<path d="M29 2C27 10 19 18 12 21l-3-3C13 11 21 4 29 2z"/><path d="M7 17l8 8-2 2-8-8z"/><path d="M8 23l2 2-5 5c-1 1-3-1-2-2z"/>' },
  { id: 'machado', name: 'Machado', cat: 'Armas', svg: '<path d="M4 29 20 9l2.5 2L7 31z"/><path d="M15 7l6-6c6 2 9 7 10 13l-7 1z"/>' + D('M22 5c3 2 5 4 6 8') },
  { id: 'martelo', name: 'Martelo', cat: 'Armas', svg: '<rect x="14" y="11" width="4.5" height="19" rx="1.5"/><path d="M5 4h21v9H5z"/>' + D('M10 4v9M21 4v9') },
  { id: 'dinamite', name: 'Dinamite', cat: 'Armas', svg: '<rect x="5" y="13" width="7" height="17" rx="2"/><rect x="12.5" y="13" width="7" height="17" rx="2"/><rect x="20" y="13" width="7" height="17" rx="2"/><path d="M16 13c0-5 3-7 7-8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M25 1l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>' + D('M5 18h22M5 25h22') },
  { id: 'algemas', name: 'Algemas', cat: 'Armas', svg: '<circle cx="9" cy="21" r="7.5"/><circle cx="23" cy="21" r="7.5"/><circle class="f" cx="9" cy="21" r="4.3"/><circle class="f" cx="23" cy="21" r="4.3"/><path d="M12 13l4-8 4 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' },
  // ── objetos ──
  { id: 'lanterna', name: 'Lanterna', cat: 'Objetos', svg: '<rect x="2" y="12" width="15" height="8" rx="2"/><path d="M17 9h6v14h-6z"/><path d="M24 11l7-5v20l-7-5z" opacity=".45"/>' + D('M7 14v4') },
  { id: 'celular', name: 'Celular', cat: 'Objetos', svg: '<rect x="9" y="2" width="14" height="28" rx="3"/><rect class="f" x="11" y="5" width="10" height="18" rx="1"/><circle class="f" cx="16" cy="26.5" r="1.3"/>' },
  { id: 'radio', name: 'Rádio', cat: 'Objetos', svg: '<rect x="3" y="11" width="26" height="18" rx="3"/><path d="M7 11 22 3" fill="none" stroke="currentColor" stroke-width="2"/><circle class="f" cx="10.5" cy="20" r="5"/>' + D('M19 16h7M19 20h7M19 24h7') },
  { id: 'camera', name: 'Câmera', cat: 'Objetos', svg: '<path d="M3 10h6l2-4h10l2 4h6v18H3z"/><circle class="f" cx="16" cy="18" r="6.5"/><circle cx="16" cy="18" r="3.6"/><rect class="f" x="24" y="12" width="3" height="2"/>' },
  { id: 'lupa', name: 'Lupa', cat: 'Objetos', svg: '<circle cx="13" cy="13" r="10"/><circle class="f" cx="13" cy="13" r="6.2"/><path d="M20 18l10 10-3 3-10-10z"/>' + D('M10 9q2-2 4-1') },
  { id: 'chave', name: 'Chave', cat: 'Objetos', svg: '<circle cx="9" cy="16" r="7.5"/><circle class="f" cx="7.5" cy="16" r="2.4"/><path d="M15 13.5h16v5h-3v4h-3.5v-4H22v3h-3.5v-3H15z"/>' },
  { id: 'chave-antiga', name: 'Chave antiga', cat: 'Objetos', svg: '<circle cx="8" cy="8" r="6.5"/><circle class="f" cx="8" cy="8" r="2.8"/><path d="M11 10l18 18-2.5 2.5-2-2-2.5 2.5-2-2 2.5-2.5-2-2-2.5 2.5-2-2L18 23 9 13z"/>' },
  { id: 'cadeado', name: 'Cadeado', cat: 'Objetos', svg: '<rect x="6" y="14" width="20" height="16" rx="2"/><path d="M9.5 14V10a6.5 6.5 0 0 1 13 0v4h-3.5v-4a3 3 0 0 0-6 0v4z"/><circle class="f" cx="16" cy="21" r="2.2"/><rect class="f" x="15" y="22" width="2" height="4"/>' },
  { id: 'maleta', name: 'Maleta', cat: 'Objetos', svg: '<path d="M11 7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2h-2.4V7.4c0-.6-.4-1-1-1h-3.2c-.6 0-1 .4-1 1V9H11z"/><rect x="2" y="9" width="28" height="18" rx="3"/>' + D('M2 16.5h28M13.5 14.5v4h5v-4') },
  { id: 'resiliencia', name: 'Resiliência', cat: 'Objetos', svg: '<defs><linearGradient id="gi-res-aura" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6dbf0"/><stop offset="1" stop-color="#a6afd5"/></linearGradient><linearGradient id="gi-res-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#484848"/><stop offset="1" stop-color="#2d2d2d"/></linearGradient></defs><path fill="url(#gi-res-aura)" fill-rule="evenodd" d="M5.6 3C5 6 4.6 8.2 4.4 9.6L2.2 7.8C2.4 10.4 2.8 12.6 3.6 14.4C3.4 22.6 9.2 29.6 16 29.6S28.6 22.6 28.4 14.4C29.2 12.6 29.6 10.4 29.8 7.8L27.6 9.6C27.4 8.2 27 6 26.4 3C25.4 5.4 24.6 7 23.6 8H8.4C7.4 7 6.6 5.4 5.6 3ZM6.3 8H25.7C25.95 8.9 26 9.6 26 10.9C26 19.4 21.9 24.9 16 28.6C10.1 24.9 6 19.4 6 10.9C6 9.6 6.05 8.9 6.3 8Z"/><path fill="url(#gi-res-aura)" d="M10.2 26.2L12.3 22.6L13.4 26.9ZM21.8 26.2L19.7 22.6L18.6 26.9Z"/><path fill="url(#gi-res-body)" d="M10.6 3.6H21.4C22.3 3.6 22.9 4.1 23.2 4.9L24.1 7.5C24.5 8.7 24.6 9.6 24.6 11.2C24.6 18.6 20.8 23.6 16 26.9C11.2 23.6 7.4 18.6 7.4 11.2C7.4 9.6 7.5 8.7 7.9 7.5L8.8 4.9C9.1 4.1 9.7 3.6 10.6 3.6Z"/><path fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" d="M12.2 6.9H19.8C20.4 6.9 20.8 7.3 21 7.8L21.5 9.4C21.7 10.1 21.8 10.7 21.8 11.7C21.8 16.9 19.3 20.6 16 23.1C12.7 20.6 10.2 16.9 10.2 11.7C10.2 10.7 10.3 10.1 10.5 9.4L11 7.8C11.2 7.3 11.6 6.9 12.2 6.9Z"/>' },
  { id: 'pilula', name: 'Pílula', cat: 'Objetos', svg: '<path d="M5 19 17 7a6 6 0 0 1 8.5 8.5L13.5 27.5A6 6 0 0 1 5 19z"/>' + D('M11 13l8 8') },
  { id: 'seringa', name: 'Seringa', cat: 'Objetos', svg: '<path d="M22 2l8 8-2 2-1.5-1.5L14 23l-5-5L21.5 5.5 20 4z"/><path d="M8 19l5 5-2 2-5-5z"/><path d="M6 23l3 3-6 5-2-2z"/>' + D('M17 11l2 2M14 14l2 2') },
  { id: 'curativo', name: 'Curativo', cat: 'Objetos', svg: '<g transform="rotate(-38 16 16)"><rect x="1" y="10.5" width="30" height="11" rx="5.5"/><rect class="f" x="11" y="12" width="10" height="8" rx="1.5"/></g>' },
  { id: 'frasco', name: 'Frasco', cat: 'Objetos', svg: '<path d="M11.5 2h9v2.5H19V12l8 13a3.5 3.5 0 0 1-3 5H8a3.5 3.5 0 0 1-3-5l8-13V4.5h-1.5z"/><path class="f" d="M9 21h14l2.5 4.5H6.5z"/>' },
  { id: 'cigarro', name: 'Cigarro', cat: 'Objetos', svg: '<rect x="1" y="20" width="23" height="5" rx="1"/><rect x="24" y="20" width="7" height="5" rx="1" opacity=".55"/><path d="M27 17c-3-3 2-5-1-9M22 16c-2-2 1-4-1-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>' },
  { id: 'bebida', name: 'Bebida', cat: 'Objetos', svg: '<path d="M6 7h20l-2 20a2.5 2.5 0 0 1-2.5 2H10.5A2.5 2.5 0 0 1 8 27z"/><path class="f" d="M8.6 16h14.8l-1 10H9.6z" opacity=".5"/><rect class="f" x="11" y="11" width="5.5" height="5.5" rx="1" transform="rotate(12 14 14)"/>' },
  { id: 'dinheiro', name: 'Dinheiro', cat: 'Objetos', svg: '<path d="M12 3h8l-2.5 5C24 10 28 16 28 21c0 6-5 8-12 8S4 27 4 21c0-5 4-11 10.5-13z"/>' + D('M19.5 15c-1-2-7-2-7 1s7 2 7 5-6 3-7 1M16 12v14') },
  { id: 'distintivo', name: 'Distintivo', cat: 'Objetos', svg: '<path d="M16 2l4 6h7l-3.5 6.5L27 21h-7l-4 7-4-7H5l3.5-6.5L5 8h7z"/><circle class="f" cx="16" cy="14.5" r="4.6"/><circle cx="16" cy="14.5" r="2"/>' },
  { id: 'mapa', name: 'Mapa', cat: 'Objetos', svg: '<path d="M2 7l9-3 10 3 9-3v21l-9 3-10-3-9 3z"/>' + D('M11 4v21M21 7v21M6 15l4 3 5-4 4 3 6-3') },
  { id: 'pergaminho', name: 'Documento', cat: 'Objetos', svg: '<path d="M6 2h14l7 7v21H6z"/><path class="f" d="M20 2v7h7z" opacity=".5"/>' + D('M10 13h12M10 17h12M10 21h8') },
  { id: 'livro', name: 'Livro', cat: 'Objetos', svg: '<path d="M3 5c5-1 10 0 13 2 3-2 8-3 13-2v22c-5-1-10 0-13 2-3-2-8-3-13-2z"/>' + D('M16 7v22M7 11h5M7 15h5M20 11h5M20 15h5') },
  { id: 'oculos', name: 'Óculos escuros', cat: 'Objetos', svg: '<path d="M1 11h30v3.5h-2l-2 7.5c-1 2.5-8 2.5-9-.5L17 17h-2l-1 4.5c-1 3-8 3-9 .5l-2-7.5H1z"/>' + D('M7 15l3-2M21 15l3-2') },
  { id: 'chapeu', name: 'Chapéu', cat: 'Objetos', svg: '<path d="M8.5 19c0-7 2.5-13 7.5-13s7.5 6 7.5 13z"/><path d="M1 21c5-3.5 25-3.5 30 0-5 4.5-25 4.5-30 0z"/><rect class="f" x="8.7" y="15.5" width="14.6" height="3"/>' + D('M12 9q4 3 8 0') },
  { id: 'casaco', name: 'Sobretudo', cat: 'Objetos', svg: '<path d="M11 2h10l9 6-2.5 7-3.5-1.5V30H8V13.5L4.5 15 2 8z"/>' + D('M16 7v23M11 2l5 7 5-7M12.5 18h1M12.5 24h1') },
  { id: 'escudo', name: 'Colete', cat: 'Objetos', svg: '<path d="M16 2l12 4v9c0 8-6 13-12 15C10 28 4 23 4 15V6z"/><path class="f" d="M16 7v18c4-2 7.5-5.5 7.5-10V9.5z" opacity=".55"/>' },
  { id: 'carro', name: 'Carro', cat: 'Objetos', svg: '<path d="M1 18l3-7c1-2 3-3 5-3h12c2 0 4 1 5 3l3 6 2 2v6H1z"/><path class="f" d="M9 11h6v5.5H7zM17 11h4.5l2.5 5.5h-7z"/><circle cx="8.5" cy="25" r="4.5"/><circle cx="23.5" cy="25" r="4.5"/><circle class="f" cx="8.5" cy="25" r="1.8"/><circle class="f" cx="23.5" cy="25" r="1.8"/>' },
  { id: 'moto', name: 'Moto', cat: 'Objetos', svg: '<circle cx="7" cy="23" r="5.5"/><circle cx="25" cy="23" r="5.5"/><circle class="f" cx="7" cy="23" r="2.2"/><circle class="f" cx="25" cy="23" r="2.2"/><path d="M7 23l6-9h8l4 9h-3l-3-5.5h-4L10 23z"/><path d="M19 9h4.5l2 5.5h-3z"/>' },
  { id: 'relogio', name: 'Relógio', cat: 'Objetos', svg: '<circle cx="16" cy="17.5" r="12"/><rect x="13" y="1" width="6" height="3.5" rx="1"/>' + D('M16 10v7.5l5 3') },
  { id: 'dado', name: 'Dado', cat: 'Objetos', svg: '<path d="M16 2l12.5 7v14L16 30 3.5 23V9z"/>' + D('M16 8.5 9 20.5h14zM9 20.5 16 30l7-9.5M16 8.5V2M3.5 9 16 8.5 28.5 9M3.5 23 9 20.5M28.5 23 23 20.5') },
  { id: 'alvo', name: 'Alvo', cat: 'Objetos', svg: '<circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="2.8"/><circle cx="16" cy="16" r="6.8" fill="none" stroke="currentColor" stroke-width="2.8"/><circle cx="16" cy="16" r="2.4"/><path d="M16 0v7M16 25v7M0 16h7M25 16h7" stroke="currentColor" stroke-width="2.8"/>' },
  { id: 'armadura', name: 'Armadura', cat: 'Objetos', svg: '<path d="M10 2.5l3.5 3h5l3.5-3 7.5 4.5-2.5 8-2.5-1v13c-3 2-6.5 3-9 3s-6-1-9-3V14L4 15 1.5 7z"/>' + D('M16 6v24M10 16c3 2 9 2 12 0M10 22c3 2 9 2 12 0') },
  // ── oculto ──
  { id: 'vela', name: 'Vela', cat: 'Oculto', svg: '<path d="M16 1c3.5 4 3.5 7.5 0 10-3.5-2.5-3.5-6 0-10z"/><rect x="10.5" y="13" width="11" height="17" rx="1"/>' + D('M14 13v5') },
  { id: 'bola-cristal', name: 'Bola de cristal', cat: 'Oculto', svg: '<circle cx="16" cy="14" r="11"/><path d="M8 26h16l2.5 5h-21z"/>' + D('M10 11q2-4 6-4') },
  { id: 'amuleto', name: 'Amuleto', cat: 'Oculto', svg: '<path d="M8 2q8 13 16 0" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="20" r="10"/><path class="f" d="M9 20q7-7 14 0-7 7-14 0z"/><circle cx="16" cy="20" r="2.3"/>' },
  { id: 'rosario', name: 'Rosário', cat: 'Oculto', svg: '<g><circle cx="16" cy="4" r="2.2"/><circle cx="22" cy="6" r="2.2"/><circle cx="25.5" cy="11" r="2.2"/><circle cx="23.5" cy="16.5" r="2.2"/><circle cx="10" cy="6" r="2.2"/><circle cx="6.5" cy="11" r="2.2"/><circle cx="8.5" cy="16.5" r="2.2"/><circle cx="16" cy="19" r="2.2"/></g><path d="M14.8 21h2.4v3h3.3v2.3h-3.3V31h-2.4v-4.7h-3.3V24h3.3z"/>' },
  { id: 'sigilo', name: 'Sigilo', cat: 'Oculto', svg: '<circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M16 5.5l9.5 16.5h-19z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><circle cx="16" cy="16.5" r="3"/>' },
  { id: 'olho', name: 'Olho', cat: 'Oculto', svg: '<path d="M1 16c4.5-7.5 9.5-11 15-11s10.5 3.5 15 11c-4.5 7.5-9.5 11-15 11S5.5 23.5 1 16z"/><circle class="f" cx="16" cy="16" r="6.5"/><circle cx="16" cy="16" r="2.8"/>' },
  { id: 'lua', name: 'Lua', cat: 'Oculto', svg: '<path d="M20 2a14 14 0 1 0 10 22A12 12 0 0 1 20 2z"/><circle class="f" cx="11" cy="14" r="1.6"/><circle class="f" cx="15" cy="22" r="1.1"/>' },
  { id: 'estrela', name: 'Estrela', cat: 'Oculto', svg: '<path d="M16 2l4 9 9.6 1.1-7.2 6.5 2 9.4L16 23.2 7.6 28l2-9.4-7.2-6.5L12 11z"/>' },
  { id: 'brilho', name: 'Brilho', cat: 'Oculto', svg: '<path d="M16 1c1 8 3 11 11 13-8 2-10 5-11 13-1-8-3-11-11-13 8-2 10-5 11-13z"/><path d="M27 21c.5 3 1.5 4 4 4.5-2.5.5-3.5 1.5-4 4.5-.5-3-1.5-4-4-4.5 2.5-.5 3.5-1.5 4-4.5z"/>' },
  { id: 'fogo', name: 'Fogo', cat: 'Oculto', svg: '<path d="M16 1c1 5 8 8.5 8.5 16a8.5 8.5 0 0 1-17 0c0-4 2-6.5 4-8.5 0 3 1 5 3 5-1-4-1-8.5 1.5-12.5z"/><path class="f" d="M16 18c2.2 2 3.2 4 3.2 6a3.2 3.2 0 0 1-6.4 0c0-2 1-4 3.2-6z"/>' },
  { id: 'raio', name: 'Raio', cat: 'Oculto', svg: '<path d="M19 1 5 18h9l-3.5 13L26 13h-9z"/>' },
  { id: 'gelo', name: 'Gelo', cat: 'Oculto', svg: '<g stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M16 2v28M3.9 9l24.2 14M3.9 23l24.2-14M11.5 4.5 16 9l4.5-4.5M11.5 27.5 16 23l4.5 4.5M3.5 14.5 9.5 16l-2 6M28.5 17.5 22.5 16l2-6"/></g>' },
  { id: 'espiral', name: 'Espiral', cat: 'Oculto', svg: '<path d="M16 16.5a1.4 1.4 0 1 1 2.8 0 4.2 4.2 0 0 1-8.4 0 7 7 0 0 1 14 0 9.8 9.8 0 0 1-19.6 0A12.6 12.6 0 0 1 29.4 15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' },
  { id: 'tentaculo', name: 'Tentáculo', cat: 'Oculto', svg: '<path d="M7 31c-3.5-8 1.5-12.5 8-14 5-1 7.5-4.5 6-8.5-1-3-5-3-6 0 1.5-6 9-6 11.5 0 3.5 8.5-4.5 13.5-11 15.5-4 1-5 4-4 7z"/><circle class="f" cx="13.5" cy="22.5" r="1.4"/><circle class="f" cx="18.5" cy="19.5" r="1.3"/><circle class="f" cx="23" cy="15" r="1.1"/>' },
  { id: 'mao', name: 'Mão', cat: 'Oculto', svg: '<path d="M9 30c-3-3-5.5-7-5.5-11.5V15c0-1.5 2.5-1.5 2.5 0v3h1.2V6c0-2.2 3.3-2.2 3.3 0v9h1.2V3.5c0-2.2 3.3-2.2 3.3 0V15h1.2V5c0-2.2 3.3-2.2 3.3 0v10H21V8c0-2.2 3.3-2.2 3.3 0v13c0 4-2 7-4.3 9z"/><circle class="f" cx="15" cy="22" r="2.4"/>' },
  // ── criaturas e gente ──
  { id: 'pessoa', name: 'Pessoa', cat: 'Criaturas', svg: '<circle cx="16" cy="9" r="6.5"/><path d="M3.5 30c0-8.5 5.5-13.5 12.5-13.5S28.5 21.5 28.5 30z"/>' },
  { id: 'detetive', name: 'Detetive', cat: 'Criaturas', svg: '<path d="M10 9c0-3.5 2-6.5 6-6.5s6 3 6 6.5z"/><path d="M5 10.5c3.5-2.5 18.5-2.5 22 0-3.5 2.5-18.5 2.5-22 0z"/><circle cx="16" cy="14.5" r="4.8"/><path d="M4 31c0-7.5 4.5-12 12-12s12 4.5 12 12z"/>' + D('M11.5 20l4.5 6.5 4.5-6.5') },
  { id: 'caveira', name: 'Caveira', cat: 'Criaturas', svg: '<path d="M16 2C8.5 2 4.5 7.5 4.5 14c0 4 2 6.5 4.5 7.5V27h3.5v-3.2h2.2V27h2.6v-3.2h2.2V27H23v-5.5c2.5-1 4.5-3.5 4.5-7.5C27.5 7.5 23.5 2 16 2z"/><circle class="f" cx="11" cy="14" r="3.4"/><circle class="f" cx="21" cy="14" r="3.4"/><path class="f" d="M16 17.5l2.2 3.5h-4.4z"/>' },
  { id: 'perigo', name: 'Veneno', cat: 'Criaturas', svg: '<path d="M4 29 28 13M4 13l24 16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><g transform="translate(5.6 0) scale(.65)"><path d="M16 2C8.5 2 4.5 7.5 4.5 14c0 4 2 6.5 4.5 7.5V27h14v-5.5c2.5-1 4.5-3.5 4.5-7.5C27.5 7.5 23.5 2 16 2z"/><circle class="f" cx="11" cy="14" r="3.6"/><circle class="f" cx="21" cy="14" r="3.6"/></g>' },
  { id: 'garra', name: 'Garra', cat: 'Criaturas', svg: '<path d="M7 2c3 8 2 19-4 28 7-6 10.5-17 7-28zM15.5 1c3 9 2 20-3.5 30 6.5-7 10-19 6-30zM24 2c3 8 2 19-3.5 28 6.5-6.5 10-17 6.5-28z"/>' },
  { id: 'chifres', name: 'Chifres', cat: 'Criaturas', svg: '<path d="M3 2c0 9 4 13 10 14l-2 3.5C4 17 1 10.5 3 2zM29 2c0 9-4 13-10 14l2 3.5c7-2.5 10-9 8-17.5z"/><path d="M9.5 18c2.5-3.5 10.5-3.5 13 0l-1 8.5c-1.5 3.5-9.5 3.5-11 0z"/><circle class="f" cx="13" cy="21.5" r="1.6"/><circle class="f" cx="19" cy="21.5" r="1.6"/>' },
  { id: 'coroa', name: 'Coroa', cat: 'Criaturas', svg: '<path d="M2 9l7 7L16 4l7 12 7-7-3.5 17h-21z"/><rect x="5.5" y="26.5" width="21" height="3.5"/><circle class="f" cx="16" cy="19.5" r="2.4"/><circle class="f" cx="9" cy="21" r="1.4"/><circle class="f" cx="23" cy="21" r="1.4"/>' },
  { id: 'lobo', name: 'Lobo', cat: 'Criaturas', svg: '<path d="M5 2l7 7.5h8L27 2l1 12c2.5 3.5 3.5 6.5 2 9.5l-6.5 2L16 31l-7.5-5.5-6.5-2c-1.5-3 0-6 2-9.5z"/><path class="f" d="M9.5 16l4.5 2.2-4.5 1.3zM22.5 16 18 18.2l4.5 1.3zM14 24.5h4L16 27z"/>' },
  { id: 'presas', name: 'Presas', cat: 'Criaturas', svg: '<path d="M2 7c4-3 9-4.5 14-4.5S26 4 30 7l-2.5 4.2-3-1.2-1.8 8L19.8 11h-7.6l-2.9 7-1.8-8-3 1.2z"/><path d="M2 25c4 3 9 4.5 14 4.5S26 28 30 25l-2.5-4.2-3 1.2-1.6-5.5-2.6 4.5h-8.6L9.1 16.5 7.5 22l-3-1.2z"/>' },
  { id: 'morcego', name: 'Morcego', cat: 'Criaturas', svg: '<path d="M16 12c1-2 2-3.5 2-3.5l1 3c3.5-3.5 8.5-4.5 13-2.5-3.5 1-4.5 4.5-4.5 8-3.5-2-6.5-1-7.5 2.5-1-1.2-2.4-2-4-2s-3 .8-4 2C11 16 8 15 4.5 17c0-3.5-1-7-4.5-8 4.5-2 9.5-1 13 2.5l1-3s1 1.5 2 3.5z"/>' },
  { id: 'aranha', name: 'Aranha', cat: 'Criaturas', svg: '<circle cx="16" cy="11.5" r="4.5"/><ellipse cx="16" cy="21.5" rx="6.5" ry="7.5"/><g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M12 13 4 7 2 2M11.5 16.5 3 15.5 1 20M11.5 20.5l-7 4.5-1 5M13 24.5 9 31M20 13l8-6 2-5M20.5 16.5l8.5-1 2 4.5M20.5 20.5l7 4.5 1 5M19 24.5l4 6.5"/></g>' },
  { id: 'cobra', name: 'Cobra', cat: 'Criaturas', svg: '<path d="M22 3c4.5 0 7 3.5 4.5 7l-2.5 1c-2-2-4.5 0-2.5 2.5l2 2c4.5 4.5 2 12-5.5 13H4v-3.5h13c3.5 0 4.5-3.5 2-5.5l-3-3c-4.5-4.5-1-13.5 6-13.5z"/><circle class="f" cx="23.5" cy="6.5" r="1.1"/>' },
  // ── corpo e estados ──
  { id: 'coracao', name: 'Coração', cat: 'Estados', svg: '<path d="M16 29C7.5 23 2.5 17.5 2.5 11a7 7 0 0 1 13.5-2.5A7 7 0 0 1 29.5 11c0 6.5-5 12-13.5 18z"/>' + D('M8 12q0-4 4-4') },
  { id: 'cerebro', name: 'Mente', cat: 'Estados', svg: '<path d="M12 3.5c-4 0-6 3-6 5.5-3 1-4.5 4-3.5 7-2 2.5-1 6.5 2 7.5 0 3.5 3 5.5 6.5 4.5 1 1 3 2 4.5 1V5c-1-1-2-1.5-3.5-1.5zM20 3.5c4 0 6 3 6 5.5 3 1 4.5 4 3.5 7 2 2.5 1 6.5-2 7.5 0 3.5-3 5.5-6.5 4.5-1 1-3 2-4.5 1V5c1-1 2-1.5 3.5-1.5z"/>' + D('M9.5 11c2 0 3 2 3 4M7.5 18.5c2 0 4 1 4 3M22.5 11c-2 0-3 2-3 4M24.5 18.5c-2 0-4 1-4 3') },
  { id: 'sangue', name: 'Sangue', cat: 'Estados', svg: '<path d="M16 2c5.5 8.5 9.5 12.5 9.5 18.5a9.5 9.5 0 0 1-19 0C6.5 14.5 10.5 10.5 16 2z"/>' + D('M10.5 21a5.5 5.5 0 0 0 4.5 5.5') },
  { id: 'cego', name: 'Cego', cat: 'Estados', svg: '<path d="M1 16c4.5-7.5 9.5-11 15-11s10.5 3.5 15 11c-4.5 7.5-9.5 11-15 11S5.5 23.5 1 16z"/><circle class="f" cx="16" cy="16" r="6.5"/><circle cx="16" cy="16" r="2.8"/><path d="M4 29 28 3" stroke="var(--ib, #000)" stroke-width="5"/><path d="M4 29 28 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
  { id: 'exausto', name: 'Exausto', cat: 'Estados', svg: '<path d="M14 8a10 10 0 1 0 8 15.5A9 9 0 0 1 14 8z"/><path d="M19 3h7l-7 7.5h7M24 13.5h5l-5 5.5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' },
  { id: 'panico', name: 'Pânico', cat: 'Estados', svg: '<path d="M16 2c7.5 0 11.5 5.5 11.5 12.5 0 8.5-5 15.5-11.5 15.5S4.5 23 4.5 14.5C4.5 7.5 8.5 2 16 2z"/><ellipse class="f" cx="11.3" cy="12.5" rx="2.6" ry="3.8"/><ellipse class="f" cx="20.7" cy="12.5" rx="2.6" ry="3.8"/><ellipse class="f" cx="16" cy="22.5" rx="3.2" ry="5"/>' },
  { id: 'fantasma', name: 'Fantasma', cat: 'Estados', svg: '<path d="M16 2c6.5 0 10.5 5 10.5 11.5V30l-3.5-2.5-3.5 2.5-3.5-3-3.5 3L9 27.5 5.5 30V13.5C5.5 7 9.5 2 16 2z"/><ellipse class="f" cx="12" cy="13.5" rx="2" ry="2.8"/><ellipse class="f" cx="20" cy="13.5" rx="2" ry="2.8"/><ellipse class="f" cx="16" cy="20.5" rx="1.8" ry="2.4"/>' },
];

export const ICON_LIST = LIST;
const BY_ID = new Map(LIST.map((i) => [i.id, i]));
export const ICON_CATS = [...new Set(LIST.map((i) => i.cat))];

/** Emojis das versões antigas → ícone novo (campanhas antigas continuam bonitas). */
const FROM_EMOJI: Record<string, string> = {
  '🔫': 'revolver', '🔪': 'faca', '🗡': 'faca', '⚔': 'faca', '🪓': 'machado', '🔨': 'martelo', '🧨': 'dinamite', '🔦': 'lanterna', '📱': 'celular', '📻': 'radio',
  '📷': 'camera', '🔑': 'chave', '🗝': 'chave-antiga', '💊': 'pilula', '💉': 'seringa', '🩹': 'curativo', '🧪': 'frasco', '🚬': 'cigarro', '🥃': 'bebida',
  '💰': 'dinheiro', '🪪': 'distintivo', '🗺': 'mapa', '🕶': 'oculos', '🧥': 'casaco', '🛡': 'escudo', '🚗': 'carro', '🏍': 'moto', '🕯': 'vela',
  '🔮': 'bola-cristal', '🧿': 'amuleto', '📿': 'rosario', '📜': 'pergaminho', '📖': 'livro', '🩸': 'sangue', '💀': 'caveira', '☠': 'perigo',
  '👁': 'olho', '🌙': 'lua', '🔥': 'fogo', '⚡': 'raio', '❄': 'gelo', '🌀': 'espiral', '💫': 'espiral', '🐍': 'cobra', '🦇': 'morcego', '🐺': 'lobo',
  '🕷': 'aranha', '❤': 'coracao', '🧠': 'cerebro', '⏱': 'relogio', '🎲': 'dado', '🙈': 'cego', '💤': 'exausto', '😱': 'panico', '👻': 'fantasma',
  '✨': 'brilho', '⭐': 'estrela', '🪄': 'brilho', '🏹': 'raio', '🐉': 'cobra', '🦴': 'caveira', '💎': 'brilho', '💍': 'amuleto', '🧭': 'mapa', '☀': 'brilho',
  '🌿': 'brilho', '🌪': 'espiral', '🍖': 'coracao',
};
/** Id de ícone a partir do valor guardado (id novo ou emoji antigo). */
export function iconId(v: string | null | undefined): string | null {
  if (!v) return null;
  if (BY_ID.has(v)) return v;
  const clean = v.replace(/️/g, '');
  return FROM_EMOJI[clean] ?? null;
}

/** Desenha um ícone do sistema. Valores desconhecidos aparecem como texto (compatibilidade). */
export function GameIcon({ id, size = 20, className, title, style }: { id: string | null | undefined; size?: number; className?: string; title?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const def = BY_ID.get(iconId(id) ?? '');
  if (!def) return id ? <span className={`gi-text ${className ?? ''}`} style={{ fontSize: size * 0.8, ...style }} title={title}>{id}</span> : null;
  // Ícones com degradê (ex.: Resiliência) recebem ids próprios em cada cópia, para não depender de outra cópia na tela.
  const body = def.svg.includes('<defs') ? def.svg.replace(/id="([^"]+)"/g, `id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`) : def.svg;
  return (
    <svg className={`gi ${className ?? ''}`} width={size} height={size} viewBox="0 0 32 32" fill="currentColor" style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + body }} />
  );
}

/** Seletor de ícones com categorias e busca. */
export function IconPicker({ value, onChange, cats }: { value: string; onChange: (id: string) => void; cats?: string[] }) {
  const [cat, setCat] = useState<string>('todos');
  const [q, setQ] = useState('');
  const list = useMemo(() => LIST.filter((i) => (!cats || cats.includes(i.cat)) && (cat === 'todos' || i.cat === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))), [cat, q, cats]);
  const current = iconId(value);
  return (
    <div className="icon-picker">
      <div className="icon-picker-head">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="todos">Todos</option>
          {ICON_CATS.filter((k) => !cats || cats.includes(k)).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ícone" />
      </div>
      <div className="icon-pick">
        {list.map((i) => <button key={i.id} type="button" className={current === i.id ? 'on' : ''} title={i.name} onClick={() => onChange(i.id)}><GameIcon id={i.id} size={22} /></button>)}
      </div>
    </div>
  );
}

/** Botão com o ícone atual que abre o seletor num balão. */
export function IconButton({ value, onChange, title = 'Escolher ícone', cats }: { value: string; onChange: (id: string) => void; title?: string; cats?: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="icon-button" ref={ref}>
      <button type="button" className="effect-icon" title={title} onClick={() => setOpen(!open)}><GameIcon id={value} size={18} /></button>
      {open && <div className="icon-pop"><IconPicker value={value} cats={cats} onChange={(id) => { onChange(id); setOpen(false); }} /></div>}
    </div>
  );
}

/** Marcação SVG crua de um ícone (para desenhar dentro de outros SVGs, como as criptas). */
export function iconSvg(id: string | null | undefined): string {
  return BY_ID.get(iconId(id) ?? '')?.svg ?? '';
}
