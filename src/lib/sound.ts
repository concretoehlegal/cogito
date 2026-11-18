/*
 * Sons da interface, gerados na hora pelo próprio aplicativo (Web Audio).
 * Não há arquivos de áudio nem acesso à internet: clique e dados são sintetizados.
 */

export const soundSettings = { enabled: true, volume: 0.6 };

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (!soundSettings.enabled || soundSettings.volume <= 0) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch { return null; }
}

/** Estalo curto de ruído filtrado — a base tanto do clique quanto do dado batendo. */
function burst(c: AudioContext, at: number, freq: number, q: number, dur: number, gain: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(at, Math.random() * 0.9);
  src.stop(at + dur + 0.02);
}

/** Nota curta com queda de tom — dá "corpo" ao clique e à batida na mesa. */
function thump(c: AudioContext, at: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Clique discreto ao selecionar opções. */
export function playClick(kind: 'tap' | 'soft' = 'tap') {
  const c = audio();
  if (!c) return;
  const v = soundSettings.volume;
  const t = c.currentTime + 0.001;
  if (kind === 'soft') { burst(c, t, 1700, 1.4, 0.022, 0.1 * v); return; }
  burst(c, t, 2600, 1.8, 0.02, 0.22 * v);
  thump(c, t, 900, 520, 0.035, 0.07 * v, 'triangle');
}

/** Dados chacoalhando e batendo na mesa durante `ms` milissegundos. */
export function playDice(ms: number, dice = 1) {
  const c = audio();
  if (!c) return;
  const v = soundSettings.volume;
  const start = c.currentTime + 0.01;
  const total = ms / 1000;
  const hits = Math.min(26, 9 + Math.round(dice * 2.5));
  for (let i = 0; i < hits; i++) {
    // As batidas ficam mais espaçadas e mais fracas conforme o dado perde força.
    const p = i / (hits - 1);
    const at = start + total * Math.pow(p, 1.7) * 0.92 + (Math.random() - 0.5) * 0.018;
    const strength = (1 - p * 0.65) * (0.7 + Math.random() * 0.3);
    burst(c, at, 1400 + Math.random() * 2600, 2.2 + Math.random() * 2, 0.03 + Math.random() * 0.025, 0.34 * v * strength);
    thump(c, at, 240 + Math.random() * 120, 110, 0.05, 0.16 * v * strength);
  }
  // Assentar: última batida, mais seca.
  burst(c, start + total, 1900, 3, 0.03, 0.2 * v);
  thump(c, start + total, 300, 150, 0.06, 0.12 * v);
}

/** Resultado máximo: arpejo brilhante subindo. */
export function playCrit() {
  const c = audio();
  if (!c) return;
  const v = soundSettings.volume; const t = c.currentTime + 0.02;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => {
    thump(c, t + k * 0.075, f, f * 1.002, 0.55 - k * 0.05, 0.12 * v, 'triangle');
    thump(c, t + k * 0.075, f * 2, f * 2, 0.25, 0.03 * v, 'sine');
  });
  burst(c, t + 0.38, 6000, 0.8, 0.5, 0.05 * v);
}

/** Resultado mínimo: tom grave descendo e uma batida seca. */
export function playFumble() {
  const c = audio();
  if (!c) return;
  const v = soundSettings.volume; const t = c.currentTime + 0.02;
  thump(c, t, 220, 70, 0.7, 0.2 * v, 'sawtooth');
  thump(c, t + 0.12, 160, 55, 0.6, 0.16 * v, 'square');
  burst(c, t, 300, 0.7, 0.35, 0.3 * v);
}
