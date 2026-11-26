import { useEffect, useRef, type CSSProperties } from 'react';
import { GROUPS, level, programAt } from '../lib/xmasProgram';
import { xmasOn } from '../lib/season';
import { useApp } from '../store';
import { IconEye } from './icons';

/** Faixa superior da janela (área de arrastar), com o nome do aplicativo e, no Natal, as luzinhas. */
export function TitleStrip({ book }: { book?: string }) {
  const xmas = useApp((s) => xmasOn(s.prefs.xmas));
  return (
    <header className="titlestrip">
      <span className="strip-name">COGITO</span>
      {book && <span className="strip-book">{book}</span>}
      {xmas && <XmasLights />}
    </header>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return <BrandLogo size={size} />;
}

const HAT = `<path fill="#d42f2f" d="M5 30C6 18 14 7 27 4.5c8-1.5 14 2 16.5 8.5-3.5-3-8.5-3.2-11.5-.5 3.5 4.5 5 10.5 5.5 17.5z"/>
  <path fill="#a51f22" d="M27 4.5c8-1.5 14 2 16.5 8.5-3.5-3-8.5-3.2-11.5-.5-2-2.2-3.4-5-5-8z" opacity=".9"/>
  <path fill="#ff6b6b" d="M9 26c1.5-8 6-14 13-17-4 4-7 10-8 17z" opacity=".55"/>
  <path fill="#f4f1ea" d="M2.5 27.5c13-4.2 27-4.6 41-1 1.4.4 2.2 1.7 2 3.1l-.6 3.3c-.3 1.6-1.9 2.6-3.5 2.2-12.8-3.2-25.6-2.9-37.4.9-1.6.5-3.2-.5-3.5-2.1l-.4-2.3c-.3-1.8.6-3.5 2.4-4.1z"/>
  <path fill="#d9d4c7" d="M4.5 33.2c12-3.6 24.5-3.9 36.6-1 1 .2 1.9-.3 2.3-1.2-12.6-3.4-26-3-38.9.8z" opacity=".8"/>
  <circle cx="43.5" cy="14.5" r="4.6" fill="#f4f1ea"/>
  <circle cx="42.3" cy="13.2" r="1.6" fill="#fff"/>`;

/** Logo do COGITO; na edição de Natal, com gorro de Papai Noel. */
export function BrandLogo({ size = 30 }: { size?: number }) {
  const xmas = useApp((s) => xmasOn(s.prefs.xmas));
  return (
    <span className={`brand-logo${xmas ? ' xmas' : ''}`} style={{ width: size, height: size } as CSSProperties}>
      <IconEye size={size} />
      {xmas && <svg className="santa-hat" viewBox="0 0 48 40" aria-hidden dangerouslySetInnerHTML={{ __html: HAT }} />}
    </span>
  );
}

const BULBS = ['#ff4d4d', '#39d353', '#ffd23f', '#4dabff', '#ff7ad9', '#b8ff2c'];

/*
 * Relógio único do pisca-pisca clássico: todas as guirlandas na tela seguem o mesmo programa, no mesmo compasso.
 * A cada passo só muda a opacidade de 4 camadas por guirlanda (nada é redesenhado).
 */
type Layers = (SVGSVGElement | null)[];
const strings = new Set<Layers>();
let clock = 0;
function tick() {
  const { mode, t } = programAt(performance.now());
  const lv = Array.from({ length: GROUPS }, (_, g) => level(mode, g, t).toFixed(2));
  for (const layers of strings) layers.forEach((el, g) => { if (el && el.style.opacity !== lv[g]) el.style.opacity = lv[g]; });
}
function join(layers: Layers) {
  strings.add(layers); tick();
  if (!clock) clock = window.setInterval(tick, 80);
  return () => { strings.delete(layers); if (!strings.size) { window.clearInterval(clock); clock = 0; } };
}

/**
 * Fio de luzinhas de Natal (só enfeite: não recebe cliques). Leve de propósito: o fio e as lâmpadas são desenhados uma
 * vez; o brilho fica em 4 camadas, uma por grupo de lâmpadas, e só a opacidade de cada camada muda.
 * Animação "clássica": programa do pisca-pisca (sequência, alternado, ondas…); "suave": cintila devagar; "fixa": acesas.
 */
export function XmasLights({ segments = 36, className }: { segments?: number; className?: string }) {
  const anim = useApp((s) => s.prefs.xmasAnim);
  const layers = useRef<Layers>([]);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mode = reduce ? 'fixa' : anim;
  useEffect(() => {
    if (mode !== 'classica') { layers.current.forEach((el) => { if (el) el.style.opacity = ''; }); return; }
    return join(layers.current);
  }, [mode]);
  const seg = 96; const W = seg * segments;
  const y = (x: number) => 2 + 14 * (1 - ((2 * x) / seg - 1) ** 2);
  const bulbs = Array.from({ length: segments }, (_, i) => [18, 48, 78].map((x, j) => ({
    k: (i * 3 + j) % GROUPS, c: BULBS[(i * 3 + j) % BULBS.length],
    t: `translate(${i * seg + x} ${y(x)}) rotate(${(x - seg / 2) / 6})`,
  }))).flat();
  return (
    <span className={`xmas-lights anim-${mode}${className ? ` ${className}` : ''}`} aria-hidden>
      <svg width={W} height={28} viewBox={`0 0 ${W} 28`}>
        <path d={Array.from({ length: segments }, (_, i) => `M${i * seg} 2Q${i * seg + seg / 2} 30 ${(i + 1) * seg} 2`).join('')} fill="none" stroke="#3a4a36" strokeWidth="1.6" />
        {bulbs.map((b, i) => (
          <g key={i} transform={b.t}>
            <rect x="-2" y="-1" width="4" height="3.5" rx="1" fill="#2b2b2b" />
            <ellipse className="unlit" cx="0" cy="7" rx="3.4" ry="5" fill={b.c} />
          </g>
        ))}
      </svg>
      {Array.from({ length: GROUPS }, (_, k) => (
        <svg key={k} ref={(el) => { layers.current[k] = el; }} className={`xl-glow g${k}`} width={W} height={28} viewBox={`0 0 ${W} 28`}>
          {bulbs.filter((b) => b.k === k).map((b, i) => (
            <g key={i} transform={b.t} style={{ color: b.c }}>
              <ellipse className="lit" cx="0" cy="7" rx="3.4" ry="5" fill="currentColor" />
              <ellipse cx="-1.1" cy="5.4" rx="1" ry="1.8" fill="#fff" opacity=".55" />
            </g>
          ))}
        </svg>
      ))}
    </span>
  );
}
