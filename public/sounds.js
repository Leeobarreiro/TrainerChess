// Sons de peça sintetizados (síntese própria, sem arquivos de áudio).
// Os parâmetros foram ajustados para chegar perto das MEDIDAS de um tabuleiro online de referência:
// duração do estalo, tom principal, distribuição de frequências e velocidade de decaimento.
// Cada "batida" é uma soma de senoides que morrem rápido (como madeira batendo em madeira) mais um clique curto.

// modos: [frequência Hz, amplitude, constante de decaimento em segundos]
const MOVE = [[465, 1.0, 0.0055], [926, 0.6, 0.0045], [200, 0.3, 0.006], [600, 0.25, 0.005], [1313, 1.0, 0.0035], [1900, 0.6, 0.003]];
const MOVE_OPP = [[457, 1.0, 0.0055], [902, 0.7, 0.0045], [328, 0.3, 0.006], [609, 0.22, 0.005], [1289, 0.9, 0.0035], [1066, 0.4, 0.004], [1900, 0.6, 0.003], [200, 0.2, 0.006]];
const CAPTURE_LOW = [[465, 1.0, 0.006], [200, 0.45, 0.008], [926, 0.4, 0.005]];
const CAPTURE_CLACK = [[1242, 1.0, 0.0065], [1348, 0.9, 0.0065], [1453, 1.0, 0.0065], [1008, 0.5, 0.006], [1301, 0.6, 0.0065], [465, 0.1, 0.03]];
const CHECK = [[938, 1.0, 0.0075], [879, 0.9, 0.0075], [1031, 0.8, 0.0075], [1090, 0.7, 0.0075], [1230, 1.0, 0.006], [1500, 1.0, 0.005], [1750, 0.5, 0.0045], [656, 0.3, 0.0075]];

function noise(ctx, dur) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  return buf;
}

// Uma batida: senoides amortecidas + clique inicial.
function strike(ctx, t, modes, level, clickLevel = 0.25, out = ctx.destination) {
  const attack = 0.0006;
  for (const [f, a, tau] of modes) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a * level, t + attack);
    g.gain.setTargetAtTime(0, t + attack, tau);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + tau * 9);
  }
  if (clickLevel > 0) {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx, 0.0015);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 3500;
    const g = ctx.createGain();
    g.gain.value = clickLevel * level;
    s.connect(f).connect(g).connect(out);
    s.start(t);
  }
}

// Níveis (amplitude de cada batida) ajustados na medição.
export const LEVEL = { move: 0.36, opp: 0.24, captureLow: 0.025, captureClack: 0.14, check: 0.12, castleSoft: 0.02, castleMain: 0.39 };

export const SYNTH = {
  // seu lance
  move: (ctx, t, out) => strike(ctx, t, MOVE, LEVEL.move, 0.9, out),
  // lance do adversário: um pouco mais baixo e com mais brilho
  opp: (ctx, t, out) => strike(ctx, t, MOVE_OPP, LEVEL.opp, 0.9, out),
  // captura: toque grave quase imperceptível e, 10 ms depois, um estalo mais agudo
  capture: (ctx, t, out) => {
    strike(ctx, t, CAPTURE_LOW, LEVEL.captureLow, 0.2, out);
    strike(ctx, t + 0.010, CAPTURE_CLACK, LEVEL.captureClack, 0.35, out);
  },
  // xeque (e mate): estalo em torno de 1 kHz, que começa uns 10 ms depois
  check: (ctx, t, out) => strike(ctx, t + 0.010, CHECK, LEVEL.check, 0.4, out),
  // roque: dois toques baixos e, ~93 ms depois, a batida principal
  castle: (ctx, t, out) => {
    strike(ctx, t, MOVE, LEVEL.castleSoft, 0.1, out);
    strike(ctx, t + 0.032, MOVE, LEVEL.castleSoft, 0.1, out);
    strike(ctx, t + 0.093, MOVE, LEVEL.castleMain, 0.9, out);
  },
  // promoção e fim sem mate: sem medida de referência, usam variações do lance
  promote: (ctx, t, out) => {
    strike(ctx, t, MOVE, LEVEL.move, 0.25, out);
    strike(ctx, t + 0.05, CHECK, LEVEL.check * 0.6, 0.1, out);
  },
  end: (ctx, t, out) => strike(ctx, t, MOVE, LEVEL.move, 0.25, out),
};
