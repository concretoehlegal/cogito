/*
 * Fundo do Bestiário: a mesa de um investigador vista de cima, com um círculo de runas que brilha no meio.
 * Desenho próprio em SVG (coordenadas de uma tela 1920 × 1080, cortado para caber na janela): tábuas de madeira com
 * moldura, abajur verde, cinzeiro com fumaça, copo, caneca, telefone de disco, arquivo de fichas, fotos presas com
 * clipe, caderno com caneta, pasta de caso e um papel rasgado com um sigilo.
 */
import { memo } from 'react';

const RUNE_CELLS = 30;

/** Círculo de ritual: dois anéis com runas quadradas, triângulo, círculos internos e uma cruz que passa do anel. */
function Circle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const cells = Array.from({ length: RUNE_CELLS }, (_, i) => {
    const a = (i / RUNE_CELLS) * Math.PI * 2;
    const rr = r * 0.9;
    const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr;
    const k = i % 4;
    return (
      <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}>
        <rect x="-9" y="-9" width="18" height="18" rx="2" />
        {k === 0 && <path d="M-5 -5 H5 V0 H-5 M0 0 V5" />}
        {k === 1 && <path d="M-5 5 V-5 L5 5 V-5" />}
        {k === 2 && <path d="M-5 -5 L5 5 M5 -5 L0 0 M-5 5 H0" />}
        {k === 3 && <path d="M-5 0 H5 M0 -5 V5 M-4 -4 L-2 -2" />}
      </g>
    );
  });
  const tri = [0, 1, 2].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3; return `${cx + Math.cos(a) * r * 0.8},${cy + Math.sin(a) * r * 0.8}`; }).join(' ');
  const star = (x: number, y: number, s: number) => `M${x} ${y - s} L${x + s * 0.22} ${y - s * 0.22} L${x + s} ${y} L${x + s * 0.22} ${y + s * 0.22} L${x} ${y + s} L${x - s * 0.22} ${y + s * 0.22} L${x - s} ${y} L${x - s * 0.22} ${y - s * 0.22} Z`;
  return (
    <g className="dk-circle">
      <circle cx={cx} cy={cy} r={r * 1.25} fill="url(#dk-floor)" stroke="none" />
      <g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" filter="url(#dk-glow)">
        <circle cx={cx} cy={cy} r={r} />
        <circle cx={cx} cy={cy} r={r * 0.8} />
        <polygon points={tri} />
        <circle cx={cx} cy={cy} r={r * 0.36} />
        <circle cx={cx} cy={cy} r={r * 0.27} strokeWidth="2" />
        <circle cx={cx} cy={cy} r={r * 0.1} />
        <circle cx={cx} cy={cy} r={r * 0.03} fill="currentColor" />
        <path d={`M${cx} ${cy - r * 1.32} V${cy + r * 1.32} M${cx - r * 1.32} ${cy} H${cx + r * 1.32}`} strokeWidth="2.4" />
        <g strokeWidth="2.2">{cells}</g>
        {[[cx, cy - r * 1.32], [cx, cy + r * 1.32], [cx - r * 1.32, cy], [cx + r * 1.32, cy]].map(([x, y], i) => <path key={i} d={star(x, y, 13)} fill="currentColor" />)}
      </g>
    </g>
  );
}

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="70" cy="190" rx="190" ry="120" fill="url(#dk-lamplight)" />
      <ellipse cx="70" cy="200" rx="58" ry="30" fill="#000" opacity=".35" />
      <ellipse cx="70" cy="192" rx="56" ry="30" fill="#8a6420" />
      <ellipse cx="70" cy="186" rx="50" ry="25" fill="#c7962f" />
      <ellipse cx="62" cy="181" rx="22" ry="9" fill="#f1cf72" opacity=".7" />
      <path d="M70 186 C 70 150, 74 120, 70 64" stroke="#a87b24" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M70 186 C 70 150, 74 120, 70 64" stroke="#e0b44c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g transform="rotate(-18 70 52)">
        <rect x="-18" y="26" width="176" height="64" rx="30" fill="#000" opacity=".35" transform="translate(6 10)" />
        <rect x="-18" y="26" width="176" height="64" rx="30" fill="url(#dk-shade)" />
        <rect x="-6" y="34" width="152" height="12" rx="6" fill="#8fd39b" opacity=".45" />
        <rect x="-18" y="76" width="176" height="10" rx="5" fill="#c7962f" />
        <circle cx="-14" cy="58" r="9" fill="#c7962f" /><circle cx="154" cy="58" r="9" fill="#c7962f" />
        <circle cx="70" cy="58" r="7" fill="#e0b44c" />
      </g>
    </g>
  );
}

function Ashtray({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="60" fill="#000" opacity=".35" cx="6" cy="8" />
      <circle r="58" fill="#5a5a5e" />
      <circle r="58" fill="none" stroke="#2a2a2c" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x="-8" y="-60" width="16" height="12" rx="2" fill="#3a3a3d" transform={`rotate(${i * 45})`} />)}
      <circle r="38" fill="#2b2b2e" />
      <circle r="36" fill="#3c3a37" />
      {[[-12, 6], [8, -10], [14, 12], [-4, -16], [-18, -4]].map(([a, b], i) => <circle key={i} cx={a} cy={b} r="5" fill="#6d6a64" opacity=".8" />)}
      <g transform="rotate(-32)">
        <rect x="-4" y="-5" width="86" height="11" rx="3" fill="#efe9dc" />
        <rect x="58" y="-5" width="24" height="11" rx="2" fill="#d8873a" />
        <circle cx="-4" cy="0.5" r="6" fill="#ff6a1a" />
        <circle cx="-4" cy="0.5" r="3" fill="#ffd27a" />
      </g>
      <g className="dk-smoke" fill="none" stroke="#d9d4cc" strokeWidth="5" strokeLinecap="round" opacity=".45">
        <path d="M-6 -6 C -30 -40, 20 -60, -6 -100 S 10 -150, -20 -190" />
        <path d="M-2 -10 C 18 -50, -24 -80, 6 -120" strokeWidth="3" opacity=".7" />
      </g>
    </g>
  );
}

function Glass({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="6" cy="8" r="50" fill="#000" opacity=".3" />
      <circle r="48" fill="#cfe3e6" opacity=".35" />
      <circle r="48" fill="none" stroke="#e9f4f5" strokeWidth="4" opacity=".7" />
      <circle r="38" fill="#b8641a" opacity=".85" />
      <circle r="38" fill="url(#dk-whisky)" />
      <rect x="-20" y="-22" width="22" height="20" rx="4" fill="#f5efe0" opacity=".55" transform="rotate(14)" />
      <rect x="2" y="-4" width="20" height="18" rx="4" fill="#f5efe0" opacity=".45" transform="rotate(-10)" />
      <path d="M-30 -24 A 40 40 0 0 1 10 -40" stroke="#fff" strokeWidth="4" opacity=".6" fill="none" />
    </g>
  );
}

function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="6" cy="8" r="44" fill="#000" opacity=".3" />
      <path d="M38 -14 h22 a14 14 0 0 1 0 28 h-22" fill="none" stroke="#e9e4da" strokeWidth="10" />
      <circle r="42" fill="#e9e4da" />
      <circle r="34" fill="#2a160c" />
      <circle r="30" fill="#3d2112" />
      <ellipse cx="-8" cy="-10" rx="10" ry="4" fill="#7a4a2a" opacity=".6" />
      <path d="M-4 30 v10 M-9 35 h10" stroke="#a8282a" strokeWidth="4" />
    </g>
  );
}

function Phone({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-120 60 C -170 80, -160 150, -110 150 S -60 120, -30 140" stroke="#151313" strokeWidth="7" fill="none" strokeDasharray="5 3" />
      <rect x="-88" y="-60" width="176" height="150" rx="34" fill="#000" opacity=".35" transform="translate(8 10)" />
      <rect x="-88" y="-60" width="176" height="150" rx="34" fill="#1d1a1a" />
      <rect x="-80" y="-52" width="160" height="134" rx="28" fill="#2a2525" />
      <path d="M-110 -70 Q -110 -102 -70 -100 L 70 -100 Q 110 -102 110 -70 L 110 -50 Q 110 -36 92 -40 L 70 -48 L -70 -48 L -92 -40 Q -110 -36 -110 -50 Z" fill="#141111" />
      <path d="M-96 -84 L 96 -84" stroke="#3b3434" strokeWidth="5" strokeLinecap="round" />
      <circle cy="20" r="54" fill="#0f0d0d" />
      <circle cy="20" r="50" fill="#c9b78a" />
      {Array.from({ length: 10 }, (_, i) => { const a = ((i * 30 - 60) * Math.PI) / 180; return (
        <g key={i}>
          <circle cx={Math.cos(a) * 36} cy={20 + Math.sin(a) * 36} r="9.5" fill="#1d1a1a" />
          <text x={Math.cos(a) * 36} y={24 + Math.sin(a) * 36} fontSize="11" fontWeight="700" fill="#e9dcb8" textAnchor="middle" fontFamily="monospace">{(i + 1) % 10}</text>
        </g>
      ); })}
      <circle cy="20" r="18" fill="#8a7650" />
      <circle cy="20" r="6" fill="#3a3226" />
    </g>
  );
}

function FileBox({ x, y, w = 160, h = 180 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="8" y="10" width={w} height={h} rx="6" fill="#000" opacity=".35" />
      <rect width={w} height={h} rx="6" fill="#2a3a2c" />
      <rect x="10" y="10" width={w - 20} height={h - 20} rx="3" fill="#1a241b" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x="16" y={18 + i * 22} width={w - 32} height="16" rx="2" fill={i % 3 === 1 ? '#d9cfb8' : '#ece4cf'} />
          {i % 3 === 0 && <rect x={w - 52} y={14 + i * 22} width="20" height="8" fill="#a8282a" />}
        </g>
      ))}
    </g>
  );
}

function Photo({ x, y, rot, scene }: { x: number; y: number; rot: number; scene: 'igreja' | 'tunel' | 'vulto' }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="6" y="8" width="130" height="150" fill="#000" opacity=".35" />
      <rect width="130" height="150" fill="#ece7dc" />
      <rect x="10" y="10" width="110" height="104" fill="#3a3a3a" />
      {scene === 'igreja' && (<>
        <rect x="10" y="10" width="110" height="104" fill="#6e6e6e" />
        <path d="M10 114 V80 L30 70 L30 114 Z M100 114 V76 L120 82 V114 Z" fill="#2e2e2e" />
        <path d="M44 114 V62 L64 40 L84 62 V114 Z" fill="#1e1e1e" />
        <path d="M64 40 V26 M58 32 H70" stroke="#1e1e1e" strokeWidth="3" />
        <rect x="58" y="86" width="12" height="28" fill="#9a9a9a" />
      </>)}
      {scene === 'tunel' && (<>
        <rect x="10" y="10" width="110" height="104" fill="#1c1c1c" />
        <path d="M24 114 L50 50 Q65 34 80 50 L106 114 Z" fill="#3c3c3c" />
        <path d="M50 114 L60 60 Q65 54 70 60 L80 114 Z" fill="#9a9a9a" />
        <path d="M58 64 h14" stroke="#fff" strokeWidth="2" />
      </>)}
      {scene === 'vulto' && (<>
        <rect x="10" y="10" width="110" height="104" fill="#585858" />
        <path d="M10 96 Q60 84 120 98 V114 H10 Z" fill="#3a3a3a" />
        <path d="M58 40 q8 -10 16 0 q4 8 -2 14 l10 8 l6 30 l-6 2 l-6 -24 l-2 36 h-6 l-2 -24 l-4 24 h-6 l2 -36 l-6 24 l-6 -2 l6 -30 l10 -8 q-6 -6 -4 -14 Z" fill="#141414" />
        <circle cx="63" cy="45" r="1.6" fill="#f2f2f2" /><circle cx="69" cy="45" r="1.6" fill="#f2f2f2" />
      </>)}
      <path d="M50 -10 v26 a6 6 0 0 0 12 0 v-20" stroke="#b8b8b8" strokeWidth="3" fill="none" />
    </g>
  );
}

function Notebook({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="8" y="10" width="260" height="210" fill="#000" opacity=".35" />
      <rect width="260" height="210" fill="#ece3cc" />
      {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={14 + i * 23} cy="-2" r="7" fill="none" stroke="#3a3a3a" strokeWidth="3" />)}
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M18 ${30 + i * 20} H${240 - (i % 3) * 30}`} stroke="#4a3a2a" strokeWidth="2" opacity=".55" strokeDasharray={i % 2 ? '14 6 22 5' : '30 5 10 6'} />)}
      <g stroke="#3a2a20" strokeWidth="1.5" fill="none" opacity=".7">
        <rect x="120" y="96" width="100" height="80" />
        <path d="M120 116 H220 M120 136 H220 M120 156 H220 M145 96 V176 M170 96 V176 M195 96 V176" />
      </g>
      <path d="M168 112 v40 M154 126 h28 M160 146 h16" stroke="#a8282a" strokeWidth="3" />
      <g transform="translate(200 210) rotate(-48)">
        <rect x="0" y="-7" width="160" height="14" rx="7" fill="#151515" />
        <rect x="0" y="-7" width="40" height="14" rx="6" fill="#c7962f" />
        <path d="M-14 0 L0 -6 L0 6 Z" fill="#c7962f" />
        <rect x="104" y="-9" width="6" height="18" fill="#c7962f" />
      </g>
    </g>
  );
}

function Folder({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="10" y="12" width="250" height="320" rx="8" fill="#000" opacity=".4" />
      <rect x="-8" y="10" width="250" height="320" rx="8" fill="#9a6a3a" />
      <rect width="250" height="320" rx="8" fill="#c79a5e" />
      {[['#c0392b', 40], ['#d8a031', 90], ['#8a2a2a', 150]].map(([c, yy], i) => <rect key={i} x="246" y={yy as number} width="18" height="38" rx="3" fill={c as string} />)}
      <path d="M0 180 H250" stroke="#7a5228" strokeWidth="5" />
      <path d="M126 0 V320" stroke="#7a5228" strokeWidth="5" opacity=".7" />
      <g transform="translate(125 86)" fill="none" stroke="#a8282a" strokeWidth="4">
        <circle r="34" />
        <path d="M0 -24 V24 M-14 -6 H14 M-10 16 h20" />
        <path d="M-46 30 q-16 -40 0 -70 M46 30 q16 -40 0 -70" strokeWidth="3" />
      </g>
      <rect x="44" y="196" width="160" height="50" fill="none" stroke="#a8282a" strokeWidth="5" />
      <text x="124" y="232" textAnchor="middle" fontSize="28" fontWeight="800" fill="#a8282a" fontFamily="Georgia, serif" letterSpacing="2">D.I.O.</text>
    </g>
  );
}

function TornPaper({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M8 10 L240 6 L236 60 L246 110 L230 170 L236 236 L18 244 L24 180 L6 120 L18 60 Z" fill="#000" opacity=".35" />
      <path d="M0 0 L232 -4 L228 50 L238 100 L222 160 L228 226 L10 234 L16 170 L-2 110 L10 50 Z" fill="#e2d4b2" />
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M20 ${18 + i * 14} H${200 - i * 20}`} stroke="#5a4a3a" strokeWidth="2" opacity=".5" strokeDasharray="18 5 8 4" />)}
      <g transform="translate(118 150)" stroke="#1d1414" strokeWidth="4" fill="none" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0 0 L0 -58 M0 -30 l12 -10 M0 -44 l-10 -8" transform={`rotate(${i * 45})`} />)}
        <circle r="16" fill="#8a1d1d" stroke="#1d1414" />
      </g>
    </g>
  );
}

export type BackdropKind = 'mesa' | 'ritual' | 'preto' | 'cinza' | 'branco' | 'imagem';

/** Opções de fundo do Bestiário (a ordem é a do seletor). */
export const BACKDROPS: { id: BackdropKind; label: string }[] = [
  { id: 'mesa', label: 'Mesa do investigador' },
  { id: 'ritual', label: 'Mesa de ritual' },
  { id: 'preto', label: 'Preto' },
  { id: 'cinza', label: 'Cinza escuro' },
  { id: 'branco', label: 'Branco' },
  { id: 'imagem', label: 'Imagem sua' },
];

const PLAIN: Record<string, string> = { preto: '#000000', cinza: '#1c1c1c', branco: '#f5f5f5' };

function Defs() {
  return (
    <defs>
      <pattern id="dk-planks" width="1920" height="120" patternUnits="userSpaceOnUse">
        <rect width="1920" height="120" fill="#4a2414" />
        <rect y="0" width="1920" height="58" fill="#552a17" />
        <rect y="60" width="1920" height="58" fill="#4b2515" />
        <path d="M0 58.5 H1920 M0 118.5 H1920" stroke="#1e0d06" strokeWidth="3" />
        <path d="M0 16 C 300 10, 600 24, 900 14 S 1500 22, 1920 12 M0 38 C 400 46, 800 30, 1200 42 S 1700 34, 1920 40 M0 78 C 350 72, 700 88, 1050 76 S 1600 84, 1920 74 M0 100 C 500 108, 900 94, 1400 104 S 1800 98, 1920 102" stroke="#2c140a" strokeWidth="2" fill="none" opacity=".55" />
        <path d="M420 0 V58 M1310 60 V118 M980 0 V58 M160 60 V118 M1700 0 V58" stroke="#1e0d06" strokeWidth="3" />
        <ellipse cx="760" cy="30" rx="26" ry="8" fill="none" stroke="#2c140a" strokeWidth="2" opacity=".6" />
        <ellipse cx="1540" cy="88" rx="20" ry="6" fill="none" stroke="#2c140a" strokeWidth="2" opacity=".6" />
      </pattern>
      <radialGradient id="dk-floor"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset=".6" stopColor="currentColor" stopOpacity=".08" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient>
      <linearGradient id="dk-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f9150" /><stop offset=".55" stopColor="#1f5a2b" /><stop offset="1" stopColor="#123a1b" /></linearGradient>
      <radialGradient id="dk-lamplight"><stop offset="0" stopColor="#ffcf7a" stopOpacity=".42" /><stop offset=".55" stopColor="#ff9a3c" stopOpacity=".14" /><stop offset="1" stopColor="#ff9a3c" stopOpacity="0" /></radialGradient>
      <radialGradient id="dk-whisky" cx=".4" cy=".35"><stop offset="0" stopColor="#ffd08a" stopOpacity=".7" /><stop offset="1" stopColor="#6a2a08" stopOpacity=".3" /></radialGradient>
      <radialGradient id="dk-vignette" cx=".55" cy=".5" r=".75"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".72" /></radialGradient>
      <filter id="dk-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
  );
}

function Wood() {
  return (
    <>
      <rect width="1920" height="1080" fill="#1a0b05" />
      <rect x="10" y="10" width="1900" height="1060" rx="26" fill="url(#dk-planks)" />
      <rect x="10" y="10" width="1900" height="1060" rx="26" fill="none" stroke="#2a1309" strokeWidth="14" />
      <rect x="30" y="30" width="1860" height="1020" rx="16" fill="none" stroke="#7a3f22" strokeWidth="2.5" opacity=".7" />
    </>
  );
}

/**
 * Fundo do Bestiário: a mesa do investigador (com os objetos), a mesa de ritual (só madeira e círculo), cores lisas
 * (preto, cinza escuro, branco) ou uma imagem da pessoa. Nos fundos lisos e na imagem, o círculo de runas é opcional.
 */
export const Backdrop = memo(function Backdrop({ kind, imageUrl, circle = true, dim = 0.25 }: { kind: BackdropKind; imageUrl?: string | null; circle?: boolean; dim?: number }) {
  const wood = kind === 'mesa' || kind === 'ritual';
  const showCircle = wood || circle;
  return (
    <div className={`backdrop bd-${kind}`} style={{ background: PLAIN[kind] ?? (kind === 'imagem' ? '#0a0a0a' : '#1a0b05') }} aria-hidden>
      {kind === 'imagem' && imageUrl && <img className="bd-img" src={imageUrl} alt="" draggable={false} />}
      {kind === 'imagem' && <span className="bd-dim" style={{ opacity: Math.max(0, Math.min(0.85, dim)) }} />}
      {(wood || showCircle) && (
        <svg className="desk" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <Defs />
          {wood && <Wood />}
          {showCircle && <Circle cx={1260} cy={515} r={300} />}
          {kind === 'mesa' && (<>
            <Lamp x={600} y={40} />
            <Ashtray x={680} y={360} />
            <Mug x={812} y={330} />
            <Glass x={1010} y={330} />
            <Phone x={1770} y={420} />
            <FileBox x={1760} y={600} w={150} h={170} />
            <Photo x={612} y={470} rot={-8} scene="igreja" />
            <Photo x={640} y={612} rot={6} scene="tunel" />
            <Folder x={1610} y={640} rot={-6} />
            <TornPaper x={1350} y={720} rot={5} />
            <Notebook x={1080} y={760} rot={-6} />
            <Photo x={1500} y={790} rot={-10} scene="vulto" />
          </>)}
          {wood && <rect width="1920" height="1080" fill="url(#dk-vignette)" />}
        </svg>
      )}
    </div>
  );
});

/** A mesa do investigador (compatibilidade). */
export const Desk = memo(function Desk() { return <Backdrop kind="mesa" />; });
