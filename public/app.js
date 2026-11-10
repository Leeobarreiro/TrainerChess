import { Chess } from './vendor/chess.js';
import { Engine, winPct, scoreFor, lineCp } from './engine.js';
import {
  explainMove, moveWords, replyWords, threatReport, opportunityReport, mistakeReport, det,
} from './explain.js';
import { bookFor, LINES, getBlackChoice, setBlackChoice } from './book.js';
import { loadProfile, summarize, gameRows } from './profile.js';
import { SYNTH } from './sounds.js';
import { TEMAS } from './themes.js';
import { loadOpenings, getOpenings, isKnown, nameAt } from './openings.js';

const ext = (url, label, cls = '') => `<a class="btnlink ${cls}" href="${url}" target="_blank" rel="noopener">${label}</a>`;

const $ = (s) => document.querySelector(s);
const FILES = 'abcdefgh';
let pieceSet = 'classic';
const pieceSvg = (color, type, cls = 'piece') =>
  `<svg class="${cls}" viewBox="0 0 40 40"><use href="vendor/pieces-${pieceSet}.svg#${color}${type}"/></svg>`;
const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const PVAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const LEVEL_NAME = { easy: 'Fácil', mid: 'Médio', hard: 'Difícil' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const li = (a) => a.map((x) => `<li>${x}</li>`).join('');

const analyst = new Engine();
const opponent = new Engine();
let miner = null; // terceiro motor, só para criar exercícios sem travar o jogo

const LEVELS = {
  easy: { depth: 3, multipv: 5, w: [0.3, 0.25, 0.2, 0.15, 0.1] },
  mid: { depth: 6, multipv: 3, w: [0.6, 0.28, 0.12] },
  hard: { depth: 10, multipv: 1, w: [1] },
};

const S = {
  chess: new Chess(), view: null, user: 'w', level: 'easy', gid: 0,
  flip: false, coords: true, mode: 'play', last: null, sel: null, legal: [],
  marks: {}, arrows: [], lock: true, pre: null, preRes: null, help: null,
  pending: null, rows: null, avisos: 'erros', detail: null, fbLine: null, fbFull: null, lastCoach: null, tally: { best: 0, good: 0, inacc: 0, mistake: 0, blunder: 0 },
};
S.view = S.chess;
let R = null; // revisão de partida

// ---------- armazenamento simples ----------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
const lifetime = () => store.get('chess_life', { moves: { best: 0, good: 0, inacc: 0, mistake: 0, blunder: 0 }, causes: { hung: 0, mate: 0, missed: 0, other: 0 } });

// ---------- tabuleiro ----------
function render() {
  if (!drag) document.querySelectorAll('.ghost').forEach((g) => g.remove());
  const el = $('#board');
  el.classList.toggle('nocoords', !S.coords);
  const v = S.view;
  const board = v.board();
  let html = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rank = S.flip ? r + 1 : 8 - r;
      const file = S.flip ? 7 - f : f;
      const sq = FILES[file] + rank;
      const p = board[8 - rank][file];
      const cls = ['sq', (file + rank) % 2 === 0 ? 'dark' : 'light'];
      if (S.last && (S.last.from === sq || S.last.to === sq)) cls.push('last');
      if (S.marks[sq]) cls.push(S.marks[sq]);
      if (S.sel === sq) cls.push('sel');
      if (S.legal.includes(sq)) cls.push('dot', p ? 'has' : '');
      let inner = '';
      if (f === 0) inner += `<span class="coord rank">${rank}</span>`;
      if (r === 7) inner += `<span class="coord file">${FILES[file]}</span>`;
      if (p) inner += pieceSvg(p.color, p.type);
      html += `<div class="${cls.join(' ')}" data-sq="${sq}">${inner}</div>`;
    }
  }
  el.innerHTML = html;
  drawArrows();
  renderStatus();
  renderPlayers();
}

// Faixas acima e abaixo do tabuleiro: quem joga, e as peças que cada lado capturou.
function renderPlayers() {
  const pieces = S.view.board().flat().filter(Boolean);
  const count = (color, t) => pieces.filter((p) => p.color === color && p.type === t).length;
  const userColor = S.mode === 'review' && R ? R.color : S.mode === 'puzzle' && P.current ? P.current.side : S.user;
  const vsComputer = S.mode === 'play' || S.mode === 'puzzle-home';
  const uname = $('#user').value.trim() || 'Você';
  const rating = store.get('chess_rating', null);
  const gained = (color) => {
    const other = color === 'w' ? 'b' : 'w';
    let icons = '';
    let value = 0;
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const missing = Math.max(0, START[t] - count(other, t));
      value += missing * PVAL[t];
      icons += pieceSvg(other, t, 'mini').repeat(missing);
    }
    return { icons, value };
  };
  const fill = (el, color) => {
    const mine = gained(color);
    const theirs = gained(color === 'w' ? 'b' : 'w');
    const diff = mine.value - theirs.value;
    const isUser = color === userColor;
    const name = isUser ? uname : vsComputer ? `Computador <small>${LEVEL_NAME[S.level]}</small>` : 'Adversário';
    const rate = isUser && rating ? `<small>(${rating})</small>` : '';
    const avatar = isUser ? `<div class="avatar me">${pieceSvg(color, 'k', 'av')}</div>` : `<div class="avatar">${vsComputer ? '🤖' : '👤'}</div>`;
    el.innerHTML = `${avatar}<div class="who"><span class="name">${isUser ? esc(uname) : name} ${rate}</span><span class="caps">${mine.icons}${diff > 0 ? `<b>+${diff}</b>` : ''}</span></div>`;
  };
  const bottom = S.flip ? 'b' : 'w';
  fill($('#p-bottom'), bottom);
  fill($('#p-top'), bottom === 'w' ? 'b' : 'w');
}

function center(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = +sq[1];
  return S.flip ? [7 - f + 0.5, r - 1 + 0.5] : [f + 0.5, 8 - r + 0.5];
}

const COLORS = { green: '#2ecc71', red: '#e74c3c', orange: '#f39c12' };

function drawArrows() {
  let svg = '';
  for (const a of S.arrows) {
    const [x1, y1] = center(a.from);
    const [x2, y2] = center(a.to);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const sx = x1 + ux * 0.2;
    const sy = y1 + uy * 0.2;
    const bx = x2 - ux * 0.32;
    const by = y2 - uy * 0.32;
    const col = COLORS[a.color] || COLORS.green;
    svg += `<line x1="${sx}" y1="${sy}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width=".14" stroke-linecap="round" opacity=".85"/>`;
    svg += `<polygon points="${x2},${y2} ${bx - uy * 0.2},${by + ux * 0.2} ${bx + uy * 0.2},${by - ux * 0.2}" fill="${col}" opacity=".9"/>`;
  }
  $('#arrows').innerHTML = svg;
}

function renderStatus() {
  const s = $('#status');
  if (S.mode === 'review') { s.textContent = R ? `Revisão: ${R.title}` : ''; return; }
  if (S.mode === 'puzzle') { s.textContent = 'Exercício: ache a melhor jogada.'; return; }
  if (S.mode === 'puzzle-home') { s.textContent = ''; return; }
  if (S.mode === 'drill') { s.textContent = D.done ? 'Abertura completa!' : S.chess.turn() === S.user ? 'Sua vez.' : 'Adversário jogando…'; return; }
  const c = S.chess;
  if (c.isCheckmate()) s.textContent = c.turn() === S.user ? 'Xeque-mate. Você perdeu.' : 'Xeque-mate! Você venceu! 🎉';
  else if (c.isGameOver()) s.textContent = 'Empate.';
  else if (S.pending) s.textContent = 'Decida: desfazer ou continuar.';
  else if (c.turn() === S.user) s.textContent = c.isCheck() ? 'Sua vez — seu Rei está em xeque!' : 'Sua vez.';
  else s.textContent = 'Adversário pensando…';
}

function setEval(cp) {
  const p = winPct(cp);
  $('#evalfill').style.height = p.toFixed(0) + '%';
  $('#evaltext').textContent = p > 70 ? 'Você está bem melhor' : p > 57 ? 'Você está melhor' : p > 43 ? 'Posição igual' : p > 30 ? 'Você está pior' : 'Você está bem pior';
}

// ---------- animação, som e arrastar ----------
// A peça desliza da casa de origem até a de destino.
function animate(from, to) {
  const b = $('#board');
  const dst = b.querySelector(`[data-sq="${to}"] .piece`);
  const src = b.querySelector(`[data-sq="${from}"]`);
  if (!dst || !src) return;
  const a = src.getBoundingClientRect();
  const d = dst.getBoundingClientRect();
  dst.style.transition = 'none';
  dst.style.transform = `translate(${a.left - d.left}px, ${a.top - d.top}px)`;
  dst.style.zIndex = 4;
  dst.getBoundingClientRect();
  dst.style.transition = 'transform .18s ease-out';
  dst.style.transform = '';
}

// Sons de peça. Se existirem arquivos em public/sounds (move, capture, check, castle, promote, end), eles são usados.
// Caso contrário, o treinador sintetiza sons parecidos com os de tabuleiro de madeira.
let audio = null;
let soundOn = store.get('chess_sound', true);
const soundBuffers = {};
let soundsLoaded = false;

async function loadSoundFiles() {
  let lista = {};
  try { lista = await (await fetch('sounds/index.json')).json(); } catch { return; }
  for (const [k, arquivo] of Object.entries(lista)) {
    try {
      const r = await fetch('sounds/' + arquivo);
      if (r.ok) soundBuffers[k] = await audio.decodeAudioData(await r.arrayBuffer());
    } catch { /* arquivo ausente ou inválido: usa o som sintetizado */ }
  }
}

function sound(kind) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    if (!soundsLoaded) { soundsLoaded = true; loadSoundFiles(); }
    if (soundBuffers[kind]) {
      const src = audio.createBufferSource();
      src.buffer = soundBuffers[kind];
      src.connect(audio.destination);
      src.start();
    } else {
      (SYNTH[kind] || SYNTH.move)(audio, audio.currentTime + 0.005, audio.destination);
    }
  } catch { /* sem áudio */ }
}

// Escolhe o som certo para o lance que acabou de ser jogado em `c`. `mine`: foi você quem jogou.
// No mate toca o som de xeque, como no tabuleiro de referência.
function moveSound(c, m, mine = true) {
  if (c.isCheck()) return sound('check');
  if (c.isGameOver()) return sound('end');
  if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) return sound('castle');
  if (m.promotion) return sound('promote');
  if (m.captured) return sound('capture');
  return sound(mine ? 'move' : 'opp');
}

// Arrastar e soltar: a peça acompanha o mouse; soltar numa casa permitida faz o lance.
let drag = null;
const canMove = () =>
  (S.mode === 'play' && !S.lock && S.chess.turn() === S.user && !S.chess.isGameOver()) ||
  (S.mode === 'puzzle' && P.current && !P.done && !P.locked) ||
  (S.mode === 'drill' && D.active && !D.done && !S.lock && S.chess.turn() === S.user);

function moveGhost(e) {
  drag.ghost.style.left = e.clientX - drag.size / 2 + 'px';
  drag.ghost.style.top = e.clientY - drag.size / 2 + 'px';
}

// Encerra qualquer arrasto em andamento e remove peças-fantasma que tenham sobrado.
function endDrag() {
  drag = null;
  document.querySelectorAll('.ghost').forEach((g) => g.remove());
}

$('#board').addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('pointercancel', () => { if (drag) { endDrag(); render(); } });
window.addEventListener('blur', () => { if (drag) { endDrag(); render(); } });

$('#board').addEventListener('pointerdown', (e) => {
  endDrag();
  if (e.button !== 0 || !canMove()) return;
  const el = e.target.closest('.sq');
  if (!el) return;
  const sq = el.dataset.sq;
  const p = S.view.get(sq);
  if (!p || p.color !== S.view.turn() || ((S.mode === 'play' || S.mode === 'drill') && p.color !== S.user)) return;
  e.preventDefault();
  S.sel = sq;
  S.legal = S.view.moves({ square: sq, verbose: true }).map((m) => m.to);
  render();
  const size = $('#board').clientWidth / 8;
  const ghost = document.createElement('div');
  ghost.className = 'ghost';
  ghost.style.width = ghost.style.height = size + 'px';
  ghost.innerHTML = pieceSvg(p.color, p.type);
  document.body.appendChild(ghost);
  drag = { from: sq, ghost, size, moved: false, x: e.clientX, y: e.clientY };
  document.querySelector(`[data-sq="${sq}"] .piece`)?.classList.add('lifted');
  moveGhost(e);
});

document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (e.buttons === 0) { endDrag(); render(); return; } // o botão foi solto fora do tabuleiro
  if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5) drag.moved = true;
  moveGhost(e);
});

document.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const d = drag;
  endDrag();
  if (!d.moved) return render();
  const to = document.elementFromPoint(e.clientX, e.clientY)?.closest('.sq')?.dataset.sq;
  if (to && to !== d.from && S.legal.includes(to)) {
    if (S.mode === 'puzzle') puzzleMove(d.from, to, true);
    else if (S.mode === 'drill') drillMove(d.from, to, true);
    else userMove(d.from, to, true);
  } else {
    render();
  }
});

// ---------- cartões do treinador ----------
function coach(html, cls = '', btns = [], save = true) {
  if (save) S.lastCoach = { html, cls, btns };
  const b = btns.length
    ? `<div class="btns">${btns.map((x) => `<button class="${x.primary ? 'primary' : ''}" data-act="${x.act}" ${x.data || ''}>${x.label}</button>`).join('')}</div>`
    : '';
  $('#coach').innerHTML = `<div class="card slim ${cls}">${html}${b}</div>`;
}

const helpBtn = { act: 'help', label: '💡 Me ajude', primary: true };
const detailBtn = { act: 'detail', label: 'ℹ️ Sobre minha jogada' };

function showDetail() {
  if (!S.detail) return;
  coach(S.detail, '', [{ act: 'detail-close', label: '← Voltar' }], false);
}

function closeDetail() {
  const c = S.lastCoach;
  if (c) coach(c.html, c.cls, c.btns);
}

function welcome() {
  const bk = bookFor(S.chess.fen());
  const inicio = S.user === 'w' ? 'Você joga de <b>brancas</b> (embaixo).' : 'Você joga de <b>pretas</b> (embaixo).';
  coach(`<div class="headline">Sua vez</div><p>${inicio} Clique na peça e na casa, ou arraste.</p>${bk ? `<p class="muted small">📖 Repertório: ${esc(bk.name)}</p>` : ''}`, '', [helpBtn]);
}

// ---------- fluxo da partida ----------
function startPre() {
  const fen = S.chess.fen();
  const gid = S.gid;
  S.preRes = null;
  S.pre = analyst.go(fen, { depth: 12 }).then((r) => {
    if (gid === S.gid && fen === S.chess.fen()) {
      S.preRes = r;
      setEval(scoreFor(r, S.user));
    }
    return r;
  });
}

function newGame() {
  let c = $('#opt-color').value;
  if (c === 'r') c = Math.random() < 0.5 ? 'w' : 'b';
  S.gid++;
  S.user = c;
  S.level = $('#opt-level').value;
  S.chess = new Chess();
  S.view = S.chess;
  S.mode = 'play';
  S.flip = c === 'b';
  S.last = null; S.sel = null; S.legal = []; S.marks = {}; S.arrows = [];
  S.help = null; S.pending = null; S.fb = null; S.detail = null; S.fbLine = null; S.fbFull = null;
  S.tally = { best: 0, good: 0, inacc: 0, mistake: 0, blunder: 0 };
  setEval(0);
  render();
  if (S.chess.turn() !== S.user) {
    S.lock = true;
    opponentMove();
  } else {
    S.lock = false;
    startPre();
    welcome();
  }
}

function classify(loss) {
  if (loss < 2) return { k: 'best', t: 'Ótima jogada!', e: '🌟', cls: 'good' };
  if (loss < 5) return { k: 'good', t: 'Boa jogada', e: '✅', cls: 'good' };
  if (loss < 10) return { k: 'inacc', t: 'Pequena imprecisão', e: '🤔', cls: 'warn' };
  if (loss < 20) return { k: 'mistake', t: 'Erro', e: '⚠️', cls: 'bad' };
  return { k: 'blunder', t: 'Gafe', e: '❌', cls: 'bad' };
}

function tally(k, cause) {
  S.tally[k]++;
  const life = lifetime();
  life.moves[k]++;
  if (cause) life.causes[cause]++;
  store.set('chess_life', life);
}

async function onSquare(sq) {
  if (S.mode === 'puzzle') return puzzleSquare(sq);
  if (S.mode === 'drill') return drillSquare(sq);
  if (S.mode !== 'play' || S.lock || S.chess.turn() !== S.user || S.chess.isGameOver()) return;
  const p = S.chess.get(sq);
  if (S.sel && S.legal.includes(sq)) return userMove(S.sel, sq);
  if (p && p.color === S.user) {
    S.sel = sq;
    S.legal = S.chess.moves({ square: sq, verbose: true }).map((m) => m.to);
  } else {
    S.sel = null;
    S.legal = [];
  }
  render();
}

async function userMove(from, to, dropped = false) {
  const gid = S.gid;
  const fenBefore = S.chess.fen();
  const book = bookFor(fenBefore);
  const piece = S.chess.get(from);
  const promotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
  const mv = { from, to, promotion };
  const exMove = explainMove(fenBefore, mv);
  const pre = S.pre || analyst.go(fenBefore, { depth: 12 });
  const m = S.chess.move(mv);
  S.last = m; S.sel = null; S.legal = []; S.marks = {}; S.arrows = []; S.help = null;
  S.lock = true;
  render();
  if (!dropped) animate(from, to);
  moveSound(S.chess, m);
  if (S.chess.isGameOver()) return endGame();

  coach('<p class="muted">Analisando sua jogada…</p>');
  const fenAfter = S.chess.fen();
  const [preRes, post] = await Promise.all([pre, analyst.go(fenAfter, { depth: 12 })]);
  if (gid !== S.gid) return;

  const same = preRes.best === from + to + (promotion || '');
  const bestCp = scoreFor(preRes, S.user);
  const afterCp = scoreFor(post, S.user);
  const loss = same ? 0 : Math.max(0, winPct(bestCp) - winPct(afterCp));
  const cl = classify(loss);
  setEval(afterCp);

  let html = `<h3>${cl.e} ${cl.t}</h3><p><b>O que a sua jogada faz:</b></p><ul>${li(exMove.reasons)}</ul>`;
  let cause = null;
  let problema = '';
  let melhor = null;
  S.arrows = [];
  if (loss >= 5) {
    const rep = mistakeReport(fenBefore, mv, fenAfter, preRes.best, post.best);
    cause = rep.cause;
    problema = rep.problem[0] || '';
    melhor = rep.better;
    if (rep.problem.length) html += `<p><b>Atenção:</b></p><ul>${li(rep.problem)}</ul>`;
    if (rep.better) {
      html += `<p><b>Uma jogada melhor:</b> ${rep.better.words}</p><ul>${li(rep.better.reasons)}</ul>`;
      S.arrows.push({ from: rep.better.mv.from, to: rep.better.mv.to, color: 'green' });
      S.marks[rep.better.mv.from] = 'from';
      S.marks[rep.better.mv.to] = 'to';
    }
    if (post.best) S.arrows.push({ from: post.best.slice(0, 2), to: post.best.slice(2, 4), color: 'red' });
  } else if (exMove.risks.length) {
    html += `<p class="muted">Fique de olho: ${exMove.risks.map((r) => det(r.type)).join(', ')} pode ficar ameaçad${exMove.risks.length > 1 ? 'os' : 'o'}.</p>`;
  }
  if (book && book.san !== m.san) {
    html += `<p>📖 No seu repertório (${esc(book.name)}), a jogada era outra: ${esc(book.why || '')}</p>`;
  }
  tally(cl.k, cause);
  S.detail = html;
  const modo = S.avisos;

  // Erro ou gafe: é o único caso em que o treinador interrompe a partida (a não ser que os avisos estejam desligados).
  if (loss >= 10 && modo !== 'nenhum') {
    S.pending = { fenBefore };
    let curto = `<h3>${cl.e} ${cl.t}</h3>`;
    if (problema) curto += `<p>${problema}</p>`;
    if (melhor) curto += `<p><b>Melhor:</b> ${melhor.words}</p><p class="muted small">${melhor.reasons[0]}</p>`;
    curto += '<p class="muted small">Seta verde: a melhor jogada. Vermelha: o perigo.</p>';
    coach(curto, cl.cls, [
      { act: 'undo', label: '↩ Desfazer e tentar de novo', primary: true },
      { act: 'continue', label: 'Continuar' },
      { act: 'detail', label: 'ℹ️ Mais detalhes' },
    ]);
    render();
    return;
  }
  S.arrows = []; S.marks = {};
  S.fbLine = modo === 'nenhum' ? null : `${cl.e} ${cl.t}`;
  S.fbFull = modo === 'todos' ? html : null;
  if (modo === 'todos') coach(html, cl.cls);
  else if (S.fbLine) coach(`<div class="headline">${S.fbLine}</div>`, cl.cls);
  render();
  setTimeout(() => gid === S.gid && opponentMove(), modo === 'todos' ? 1500 : 700);
}

function undoMove() {
  if (!S.pending) return;
  S.chess.undo();
  const h = S.chess.history({ verbose: true });
  S.last = h.length ? h[h.length - 1] : null;
  S.pending = null; S.marks = {}; S.arrows = []; S.lock = false;
  if (!S.preRes) startPre();
  else setEval(scoreFor(S.preRes, S.user));
  coach('<h3>Tente de novo 💪</h3><p>Olhe a posição com calma: o que o adversário ameaça e o que cada peça sua protege?</p>', '', [helpBtn]);
  render();
}

function continueGame() {
  S.pending = null; S.marks = {}; S.arrows = [];
  render();
  opponentMove();
}

async function pickOpponent(fen) {
  const lv = LEVELS[S.level];
  const res = await opponent.go(fen, { depth: lv.depth, multipv: lv.multipv });
  const options = res.lines.map((l) => l.pv[0]);
  if (!options.length) return res.best;
  let x = Math.random() * lv.w.slice(0, options.length).reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    x -= lv.w[i];
    if (x <= 0) return options[i];
  }
  return options[0];
}

async function opponentMove() {
  const gid = S.gid;
  S.lock = true;
  renderStatus();
  const uci = await pickOpponent(S.chess.fen());
  if (gid !== S.gid || !uci) return;
  await new Promise((r) => setTimeout(r, 400));
  if (gid !== S.gid) return;
  const m = S.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  if (S.mode === 'play') S.last = m;
  if (S.chess.isGameOver()) { if (S.mode === 'play') render(); return endGame(); }
  const th = threatReport(S.chess);
  const op = opportunityReport(S.chess);
  const modo = S.avisos;
  if (S.mode === 'play') {
    S.marks = {};
    if (modo !== 'nenhum') th.marks.forEach((sq) => (S.marks[sq] = 'danger'));
    if (modo === 'todos') op.marks.forEach((sq) => (S.marks[sq] = 'chance'));
  }
  S.lock = false;
  startPre();
  const o = `O adversário moveu ${det(m.piece)} (casa ${m.from} → ${m.to})${m.captured ? ` e capturou ${det(m.captured)} seu` : ''}.`;
  let corpo = `<div class="headline">Sua vez</div><p>${o}</p>`;
  if (modo !== 'nenhum' && th.lines.length) corpo += `<p class="alert">🔴 ${th.lines[0]}</p>`;
  if (modo === 'todos') {
    if (th.lines.length > 1) corpo += `<ul>${li(th.lines.slice(1))}</ul>`;
    if (op.lines.length) corpo += `<p><b>🟢 Chance:</b></p><ul>${li(op.lines)}</ul>`;
  }
  const bk = bookFor(S.chess.fen());
  if (bk && modo !== 'nenhum') corpo += `<p class="muted small">📖 Repertório: ${esc(bk.name)}</p>`;
  const prev = modo === 'todos' && S.fbFull ? `<div class="prev">${S.fbFull}</div><hr>` : S.fbLine ? `<div class="prevline">${S.fbLine}</div>` : '';
  S.fbLine = null; S.fbFull = null;
  coach(`${prev}${corpo}`, modo !== 'nenhum' && th.lines.length ? 'warn' : '', S.detail && modo !== 'nenhum' ? [helpBtn, detailBtn] : [helpBtn]);
  if (S.mode === 'play') {
    render();
    animate(m.from, m.to);
  }
  moveSound(S.chess, m, false);
}

function endGame() {
  S.lock = true;
  const c = S.chess;
  let titulo;
  if (c.isCheckmate()) titulo = c.turn() === S.user ? 'Você perdeu 😕' : 'Você venceu! 🎉';
  else titulo = 'Empate 🤝';
  const t = S.tally;
  coach(`<h3>${titulo}</h3><p>Suas jogadas: ${t.best} ótimas, ${t.good} boas, ${t.inacc} imprecisões, ${t.mistake} erros e ${t.blunder} gafes.</p><p>Quer ver onde a partida mudou?</p>`, '', [
    { act: 'review-self', label: '🔍 Revisar esta partida', primary: true },
    { act: 'new', label: 'Nova partida' },
  ]);
  render();
}

// ---------- passo a passo ("Me ajude") ----------
async function showHelp() {
  if (S.mode !== 'play' || S.lock || S.chess.turn() !== S.user) return;
  coach('<p class="muted">Pensando na melhor jogada…</p>');
  const res = await (S.pre || analyst.go(S.chess.fen(), { depth: 12 }));
  const fen = S.chess.fen();
  const c = new Chess(fen);
  const steps = [];
  const bk = bookFor(fen);
  if (bk) {
    const t = c.moves({ verbose: true }).find((m) => m.san === bk.san);
    if (t) {
      steps.push({
        title: '📖 Seu repertório',
        html: `<p>Esta posição faz parte do seu repertório: <b>${esc(bk.name)}</b>.</p><p>${moveWords(fen, t)}</p><p>${esc(bk.why)}</p>`,
        marks: { [t.from]: 'from', [t.to]: 'to' },
        arrows: [{ from: t.from, to: t.to, color: 'green' }],
      });
    }
  }
  const th = threatReport(c);
  steps.push({
    title: '1. O que o adversário está ameaçando?',
    html: th.lines.length ? `<ul>${li(th.lines)}</ul><p class="muted">As casas em vermelho mostram o perigo.</p>` : '<p>Nada à vista: nenhuma peça sua está ameaçada. 👍</p>',
    marks: Object.fromEntries(th.marks.map((s) => [s, 'danger'])),
    arrows: th.arrows,
  });
  const op = opportunityReport(c);
  steps.push({
    title: '2. Dá para ganhar alguma coisa?',
    html: op.lines.length ? `<ul>${li(op.lines)}</ul>` : '<p>Nenhuma peça do adversário está de graça agora. Vamos procurar uma boa jogada.</p>',
    marks: Object.fromEntries(op.marks.map((s) => [s, 'chance'])),
    arrows: op.arrows,
  });
  if (res.best) {
    const bm = { from: res.best.slice(0, 2), to: res.best.slice(2, 4), promotion: res.best[4] };
    const ex = explainMove(fen, bm);
    steps.push({
      title: '3. A melhor jogada',
      html: `<p><b>${moveWords(fen, bm)}</b></p><p class="muted">Origem em verde, destino em amarelo.</p><p>Por que é boa:</p><ul>${li(ex.reasons)}</ul>`,
      marks: { [bm.from]: 'from', [bm.to]: 'to' },
      arrows: [{ from: bm.from, to: bm.to, color: 'green' }],
    });
    const reply = res.lines[0]?.pv?.[1];
    if (reply) {
      const after = new Chess(fen);
      after.move(bm);
      steps.push({
        title: '4. O que ele pode responder?',
        html: `<p>Depois dessa jogada, o adversário provavelmente fará: ${replyWords(after.fen(), reply)}</p><p class="muted">Pensar na resposta dele evita surpresas.</p>`,
        marks: { [bm.from]: 'from', [bm.to]: 'to' },
        arrows: [
          { from: bm.from, to: bm.to, color: 'green' },
          { from: reply.slice(0, 2), to: reply.slice(2, 4), color: 'orange' },
        ],
      });
    }
  }
  S.help = { steps, i: 0 };
  showStep();
}

function showStep() {
  const h = S.help;
  if (!h) return;
  const st = h.steps[h.i];
  S.marks = st.marks;
  S.arrows = st.arrows;
  const btns = [];
  if (h.i > 0) btns.push({ act: 'step', data: 'data-d="-1"', label: '‹ Voltar' });
  if (h.i < h.steps.length - 1) btns.push({ act: 'step', data: 'data-d="1"', label: 'Próximo ›', primary: true });
  btns.push({ act: 'close-help', label: 'Fechar' });
  coach(`<h3>${st.title}</h3>${st.html}<p class="muted">Passo ${h.i + 1} de ${h.steps.length}</p>`, '', btns);
  render();
}

function closeHelp() {
  S.help = null; S.marks = {}; S.arrows = [];
  coach('<p>Agora é com você. Escolha a peça e a casa de destino.</p>', '', [helpBtn]);
  render();
}

// ---------- perfil ----------
const COMO = { checkmated: 'Xeque-mate', resigned: 'Desistiu', timeout: 'Tempo acabou', abandoned: 'Abandono', lose: 'Derrota' };

function bar(o) {
  return `<div class="bar"><i class="w" style="width:${(100 * o.w) / o.n}%"></i><i class="d" style="width:${(100 * o.d) / o.n}%"></i><i class="l" style="width:${(100 * o.l) / o.n}%"></i></div>`;
}

function openingTable(list) {
  if (!list.length) return '<p class="muted">Poucas partidas.</p>';
  return `<table><tr><th>Abertura</th><th>Jogos</th><th>V-E-D</th><th>%</th></tr>${list
    .map((o) => `<tr><td>${esc(o.name)}</td><td>${o.n}</td><td>${o.w}-${o.d}-${o.l}</td><td class="${o.score < 45 ? 'res-L' : o.score > 60 ? 'res-W' : ''}">${o.score}%</td></tr>`)
    .join('')}</table>`;
}

function renderProfile(stats, sm) {
  const rap = stats?.chess_rapid?.last?.rating;
  const blz = stats?.chess_blitz?.last?.rating;
  const t = sm.total;
  const L = Object.values(sm.lossHow).reduce((a, b) => a + b, 0);
  const tips = [];
  if (L && (sm.lossHow.checkmated || 0) / L > 0.3) tips.push(`<b>${sm.lossHow.checkmated} de ${L} derrotas foram por xeque-mate.</b> Antes de cada lance, olhe os xeques e capturas que o adversário tem.`);
  if (L && (sm.lossHow.timeout || 0) / L > 0.1) tips.push(`<b>${sm.lossHow.timeout} derrotas por tempo.</b> Gaste menos tempo nos primeiros lances (o repertório ajuda) e guarde para o meio do jogo.`);
  const hi = sm.accBuckets[3];
  if (hi && hi.n >= 5 && hi.l / hi.n < 0.1) tips.push('Quando sua precisão passa de 80% você quase nunca perde. O problema são <b>gafes isoladas</b>, não a abertura.');
  for (const o of [...sm.openingsW, ...sm.openingsB].filter((o) => o.score < 45 && o.n >= 8)) tips.push(`Aproveitamento baixo em <b>${esc(o.name)}</b> (${o.score}% em ${o.n} jogos). Treine essa posição.`);
  const life = lifetime();
  const lm = life.moves;
  const totalLife = Object.values(lm).reduce((a, b) => a + b, 0);
  $('#profile-out').innerHTML = `
    <div class="card"><h3>${esc($('#user').value)}</h3>
      <p>Rapid: <b>${rap ?? '—'}</b> · Blitz: <b>${blz ?? '—'}</b></p>
      <p>${t.n} partidas (rapid/blitz): ${t.w} vitórias, ${t.d} empates, ${t.l} derrotas — aproveitamento ${sm.score}%.</p>${bar(t)}
      <p class="muted">Brancas: ${sm.white.w}-${sm.white.d}-${sm.white.l} · Pretas: ${sm.black.w}-${sm.black.d}-${sm.black.l}${sm.ignoredDaily ? ` · ${sm.ignoredDaily} partidas diárias ignoradas` : ''}</p></div>
    <div class="card"><h3>Como você perde</h3><table>${Object.entries(sm.lossHow).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${COMO[k] || k}</td><td>${v}</td></tr>`).join('')}</table></div>
    <div class="card"><h3>Precisão x resultado</h3><table><tr><th>Precisão</th><th>Jogos</th><th>V-E-D</th></tr>${sm.accBuckets.filter((b) => b.n).map((b) => `<tr><td>${b.label}</td><td>${b.n}</td><td>${b.w}-${b.d}-${b.l}</td></tr>`).join('')}</table></div>
    <div class="card"><h3>Aberturas (brancas)</h3>${openingTable(sm.openingsW)}</div>
    <div class="card"><h3>Aberturas (pretas)</h3>${openingTable(sm.openingsB)}</div>
    <div class="card"><h3>O que mais pesa para você</h3><ul>${li(tips.length ? tips : ['Sem alertas fortes por enquanto.'])}</ul></div>
    <div class="card"><h3>Seu repertório recomendado</h3><ul>${li(LINES.map((l) => esc(l.name)))}</ul><p class="muted">No modo Treinar eu aviso quando a posição está no repertório.</p></div>
    <div class="card"><h3>Seus lances aqui no treinador</h3>${totalLife ? `<p>${lm.best} ótimos, ${lm.good} bons, ${lm.inacc} imprecisões, ${lm.mistake} erros, ${lm.blunder} gafes.</p><p class="muted">Causas dos erros: ${life.causes.hung} peça deixada para captura, ${life.causes.mate} permitiu xeque-mate, ${life.causes.missed} não viu captura grátis.</p>` : '<p class="muted">Jogue algumas partidas para ver suas estatísticas.</p>'}</div>`;
}

function renderGameList() {
  const rows = (S.rows || []).filter((r) => r.cls !== 'daily').slice(0, 30);
  $('#review-out').innerHTML = `<div class="card"><h3>Escolha uma partida</h3><div class="gamelist">${rows
    .map((r, i) => `<button data-act="review-game" data-i="${i}"><b class="res-${r.out}">${r.out === 'W' ? 'Vitória' : r.out === 'D' ? 'Empate' : 'Derrota'}</b> · ${r.color === 'w' ? 'Brancas' : 'Pretas'} vs ${esc(r.opp)} (${r.oppRating}) · ${esc(r.opening)}</button>`)
    .join('')}</div></div>`;
}

async function doLoad() {
  const user = $('#user').value.trim();
  if (!user) return;
  store.set('chess_user', user);
  $('#who').textContent = user;
  const out = $('#profile-out');
  out.innerHTML = '<div class="card"><p>Carregando partidas do chess.com…</p><div class="progress"><i id="pbar"></i></div></div>';
  try {
    const { stats, games } = await loadProfile(user, (i, n) => { $('#pbar').style.width = (100 * i) / n + '%'; });
    S.rows = gameRows(games, user);
    store.set('chess_rating', stats?.chess_rapid?.last?.rating ?? null);
    renderPlayers();
    renderProfile(stats, summarize(S.rows));
    renderGameList();
  } catch (e) {
    out.innerHTML = `<div class="card bad">Não consegui carregar: ${esc(e.message)}</div>`;
  }
}

// ---------- revisão de partida ----------
async function startReview(pgn, color, title) {
  const gid = ++S.gid;
  const c = new Chess();
  c.loadPgn(pgn);
  const moves = c.history({ verbose: true });
  const g = new Chess();
  const fens = [g.fen()];
  for (const m of moves) { g.move(m.san); fens.push(g.fen()); }
  R = { fens, moves, color, title, an: [], loss: [], idx: 0 };
  S.mode = 'review'; S.flip = color === 'b'; S.help = null; S.sel = null; S.legal = [];
  selectTab('review', true);
  $('#review-out').innerHTML = `<div class="card"><h3>Analisando ${esc(title)}</h3><p class="muted">Isso leva alguns segundos…</p><div class="progress"><i id="rbar"></i></div></div>`;
  S.view = new Chess(fens[0]); S.last = null; S.marks = {}; S.arrows = [];
  render();
  for (let i = 0; i < fens.length; i++) {
    const over = new Chess(fens[i]).isGameOver();
    R.an[i] = over ? null : await analyst.go(fens[i], { depth: 10 });
    if (gid !== S.gid) return;
    $('#rbar').style.width = (100 * (i + 1)) / fens.length + '%';
  }
  moves.forEach((m, i) => {
    if (m.color !== color || !R.an[i] || !R.an[i + 1]) { R.loss[i] = null; return; }
    const same = R.an[i].best === m.from + m.to + (m.promotion || '');
    R.loss[i] = same ? 0 : Math.max(0, winPct(scoreFor(R.an[i], color)) - winPct(scoreFor(R.an[i + 1], color)));
  });
  const first = R.loss.findIndex((l) => l != null && l >= 10);
  reviewGo(first >= 0 ? first + 1 : 0);
}

function reviewGo(idx) {
  idx = Math.max(0, Math.min(R.fens.length - 1, idx));
  const stepForward = idx === R.idx + 1;
  R.idx = idx;
  S.view = new Chess(R.fens[idx]);
  const m = idx > 0 ? R.moves[idx - 1] : null;
  S.last = m;
  S.marks = {}; S.arrows = [];
  if (R.an[idx]) setEval(scoreFor(R.an[idx], R.color));
  let info = '<p class="muted">Use as setas para avançar pela partida.</p>';
  let cls = '';
  if (m && R.loss[idx - 1] != null) {
    const loss = R.loss[idx - 1];
    const cl = classify(loss);
    cls = cl.cls;
    const lance = Math.ceil(idx / 2);
    info = `<h3>${cl.e} Lance ${lance}: ${cl.t}</h3>`;
    if (loss >= 5) {
      const mv = { from: m.from, to: m.to, promotion: m.promotion };
      const rep = mistakeReport(R.fens[idx - 1], mv, R.fens[idx], R.an[idx - 1].best, R.an[idx]?.best);
      if (rep.problem.length) info += `<ul>${li(rep.problem)}</ul>`;
      if (rep.better) {
        info += `<p><b>Melhor jogada:</b> ${rep.better.words}</p><ul>${li(rep.better.reasons)}</ul><p class="muted">Seta verde: a melhor. Vermelha: a sua. Laranja: a resposta dele.</p>`;
        S.arrows.push({ from: rep.better.mv.from, to: rep.better.mv.to, color: 'green' });
      }
      S.arrows.push({ from: m.from, to: m.to, color: 'red' });
      const r = R.an[idx]?.best;
      if (r) S.arrows.push({ from: r.slice(0, 2), to: r.slice(2, 4), color: 'orange' });
    } else {
      info += '<p>Jogada segura, sem perda importante.</p>';
    }
  } else if (m) {
    info = `<p>O adversário moveu ${det(m.piece)} (casa ${m.from} → ${m.to}).</p>`;
  }
  const bad = R.loss.map((l, i) => (l != null && l >= 10 ? i : -1)).filter((i) => i >= 0);
  $('#review-out').innerHTML = `
    <div class="card ${cls}">${info}
      <div class="btns">
        <button data-act="rv" data-i="0">⏮</button>
        <button data-act="rv" data-i="${idx - 1}">◀</button>
        <button data-act="rv" data-i="${idx + 1}">▶</button>
        <button data-act="rv" data-i="${R.fens.length - 1}">⏭</button>
      </div></div>
    <div class="card"><h3>Momentos críticos (${bad.length})</h3>${bad.length ? `<div class="gamelist">${bad.map((i) => {
      const cl = classify(R.loss[i]);
      return `<button data-act="rv" data-i="${i + 1}">${cl.e} Lance ${Math.ceil((i + 1) / 2)} — ${cl.t}</button>`;
    }).join('')}</div>` : '<p>Nenhum erro grave nesta partida. 👏</p>'}
      <div class="btns"><button data-act="back-list">← Outras partidas</button></div></div>`;
  render();
  if (stepForward && m) animate(m.from, m.to);
}

// ---------- exercícios ----------
const MAX_GAMES = 30;
const MAX_PUZZLES = 40;
const P = { list: [], run: [], token: 0, locked: false, i: 0, tries: 0, done: false, mining: false, stop: false, status: '' };
const loadPuzzles = () => store.get('chess_puzzles', []);
const savePuzzles = () => store.set('chess_puzzles', P.list);

// Acha, em uma partida, lances em que você tinha uma jogada muito melhor e jogou outra.
async function mineGame(row) {
  const c = new Chess();
  c.loadPgn(row.pgn);
  const moves = c.history({ verbose: true });
  const g = new Chess();
  const fens = [g.fen()];
  for (const m of moves) { g.move(m.san); fens.push(g.fen()); }
  const found = [];
  for (let i = 8; i < moves.length && !P.stop; i++) {
    const m = moves[i];
    if (m.color !== row.color) continue;
    const before = await miner.go(fens[i], { depth: 10, multipv: 2 });
    if (!before.best || !before.lines.length) continue;
    const played = m.from + m.to + (m.promotion || '');
    if (played === before.best) continue;
    const s1 = winPct(lineCp(before.lines[0]));
    if (s1 < 30) continue; // já estava perdido: pouco instrutivo
    const second = before.lines[1] ? winPct(lineCp(before.lines[1])) : 0;
    if (s1 - second < 10) continue; // há mais de uma boa resposta
    const after = await miner.go(fens[i + 1], { depth: 10 });
    if (!after.lines.length) continue;
    const loss = s1 - winPct(-lineCp(after.lines[0]));
    if (loss < 20) continue;
    found.push({
      id: fens[i], fen: fens[i], best: before.best, played, loss: Math.round(loss),
      side: row.color, opp: row.opp, moveNo: Math.floor(i / 2) + 1, solved: false, fails: 0,
      pv: before.lines[0].pv.slice(0, 4),
    });
  }
  return found.sort((a, b) => b.loss - a.loss).slice(0, 3);
}

async function mine() {
  if (P.mining) return;
  P.mining = true; P.stop = false;
  miner ??= new Engine();
  try {
    if (!S.rows) {
      P.status = 'Baixando suas partidas do chess.com…';
      renderPuzzleHome();
      const user = $('#user').value.trim();
      const { games } = await loadProfile(user);
      S.rows = gameRows(games, user);
    }
    const rows = S.rows.filter((r) => r.cls !== 'daily').slice(0, MAX_GAMES);
    const known = new Set(P.list.map((p) => p.id));
    for (let i = 0; i < rows.length && !P.stop && P.list.length < MAX_PUZZLES; i++) {
      P.status = `Analisando partida ${i + 1} de ${rows.length}…`;
      P.progress = (100 * i) / rows.length;
      renderPuzzleHome();
      for (const p of await mineGame(rows[i])) {
        if (!known.has(p.id)) { known.add(p.id); P.list.push(p); }
      }
      savePuzzles();
    }
    P.status = P.list.length ? '' : 'Não encontrei erros claros o bastante nas suas últimas partidas.';
  } catch (e) {
    P.status = 'Não consegui criar os exercícios: ' + e.message;
  }
  P.mining = false;
  renderPuzzleHome();
}

// ---- táticas por tema (banco aberto do Lichess) ----
const solvedThemes = () => store.get('chess_theme_solved', {});
let themeTotals = null;

async function loadThemeTotals() {
  if (themeTotals) return themeTotals;
  try { themeTotals = await (await fetch('puzzles/index.json')).json(); } catch { themeTotals = {}; }
  return themeTotals;
}

function themeCards() {
  const done = solvedThemes();
  const cell = (t) => {
    const feitos = Object.keys(done).filter((k) => k.startsWith(t.key + ':')).length;
    const total = (themeTotals || {})[t.key] || 0;
    return `<button class="theme" data-act="pz-theme" data-theme="${t.key}" title="${feitos} de ${total} resolvidos"><b>${esc(t.nome)}</b><span>${feitos}/${total}</span></button>`;
  };
  return `<div class="card"><h3>Táticas por tema</h3>
    <p>Exercícios curtos e fáceis (nível de 400 a 1300), do banco aberto do Lichess. Escolha um tema para praticar. O número mostra quantos você já resolveu.</p>
    <div class="themes">${TEMAS.map(cell).join('')}</div></div>`;
}

function renderPuzzleHome() {
  if (S.mode === 'puzzle' && P.current) return;
  const n = P.list.length;
  const solved = P.list.filter((p) => p.solved).length;
  const prog = P.mining ? `<div class="progress"><i style="width:${P.progress || 0}%"></i></div>` : '';
  loadThemeTotals().then(() => {
    if (S.mode !== 'puzzle' && !(S.mode === 'puzzle-home')) return;
    const box = $('#theme-box');
    if (box) box.innerHTML = themeCards();
  });
  $('#puzzle-out').innerHTML = `<div id="theme-box">${themeCards()}</div><div class="card"><h3>Exercícios das suas partidas</h3>
    <p>São posições reais das suas partidas em que existia uma jogada <b>muito melhor</b> do que a que você fez. Descubra qual era!</p>
    <p>${n ? `<b>${n}</b> exercícios · <b>${solved}</b> resolvidos.` : 'Ainda não há exercícios.'}</p>
    ${P.status ? `<p class="muted">${esc(P.status)}</p>` : ''}${prog}
    <div class="btns">
      ${n ? '<button class="primary" data-act="pz-start">▶ Praticar</button>' : ''}
      ${P.mining ? '<button data-act="pz-stop">Parar a busca</button>' : `<button ${n ? '' : 'class="primary"'} data-act="pz-mine">${n ? '🔄 Buscar mais' : '🔍 Criar exercícios'}</button>`}
      ${n && !P.mining ? '<button data-act="pz-clear">Apagar tudo</button>' : ''}
    </div></div>`;
}

function showPuzzle(i) {
  P.i = Math.max(0, Math.min(P.run.length - 1, i));
  const p = P.run[P.i];
  const gid = ++P.token;
  P.current = p; P.tries = 0; P.done = false; P.hinted = false; P.locked = false;
  S.mode = 'puzzle';
  S.view = new Chess(p.kind === 'theme' ? p.fenOriginal : p.fen);
  S.flip = p.side === 'b';
  S.last = null; S.marks = {}; S.arrows = []; S.sel = null; S.legal = [];
  $('#evalfill').style.height = '50%';
  $('#evaltext').textContent = 'Exercício';
  if (p.kind === 'theme') {
    P.locked = true;
    puzzleCard(`<p>Tema: <b>${esc(p.tema.nome)}</b> · dificuldade ${p.rating}. O adversário vai fazer o primeiro lance…</p>`);
    render();
    setTimeout(() => {
      if (gid !== P.token) return;
      const o = p.openingMove;
      const mo = S.view.move({ from: o.slice(0, 2), to: o.slice(2, 4), promotion: o[4] });
      S.last = { from: o.slice(0, 2), to: o.slice(2, 4) };
      render();
      animate(o.slice(0, 2), o.slice(2, 4));
      moveSound(S.view, mo, false);
      P.locked = false;
      puzzleCard(`<p>Tema: <b>${esc(p.tema.nome)}</b> · dificuldade ${p.rating}. É a vez das <b>${p.side === 'w' ? 'brancas' : 'pretas'}</b> (suas peças estão embaixo).</p><p><b>Ache a melhor jogada.</b> Pode ser preciso mais de um lance: eu respondo pelo adversário.</p>`);
    }, 700);
    return;
  }
  puzzleCard(`<p>Da sua partida contra <b>${esc(p.opp)}</b>, lance ${p.moveNo}. É a vez das <b>${p.side === 'w' ? 'brancas' : 'pretas'}</b> (suas peças estão embaixo).</p><p><b>Ache a melhor jogada.</b> Clique na peça e depois na casa.</p>`);
  render();
}

function puzzleCard(html, cls = '', extra = []) {
  const n = P.run.length;
  const btns = [];
  if (!P.done) {
    btns.push({ act: 'pz-hint', label: '💡 Dica' }, { act: 'pz-reveal', label: '👀 Ver resposta' });
  } else if (P.i < n - 1) {
    btns.push({ act: 'pz-next', label: 'Próximo ›', primary: true });
  }
  btns.push(...extra, { act: 'pz-home', label: 'Voltar' });
  const b = `<div class="btns">${btns.map((x) => `<button class="${x.primary ? 'primary' : ''}" data-act="${x.act}">${x.label}</button>`).join('')}</div>`;
  $('#puzzle-out').innerHTML = `<div class="card ${cls}"><h3>Exercício ${P.i + 1} de ${n}</h3>${html}${b}</div>`;
}

function puzzleSquare(sq) {
  const p = P.current;
  if (!p || P.done || P.locked) return;
  const v = S.view;
  const piece = v.get(sq);
  if (S.sel && S.legal.includes(sq)) return puzzleMove(S.sel, sq);
  if (piece && piece.color === v.turn()) {
    S.sel = sq;
    S.legal = v.moves({ square: sq, verbose: true }).map((m) => m.to);
  } else {
    S.sel = null; S.legal = [];
  }
  render();
}

// Frase com a resposta provável do adversário depois da melhor jogada.
function puzzleReply(p) {
  if (!p.pv || p.pv.length < 2) return '';
  const c = new Chess(p.fen);
  c.move({ from: p.pv[0].slice(0, 2), to: p.pv[0].slice(2, 4), promotion: p.pv[0][4] });
  return `<p>Depois disso, o adversário provavelmente fará: ${replyWords(c.fen(), p.pv[1])}</p>`;
}

// Exercício de tema: pode ter vários lances; eu jogo as respostas do adversário.
function themeMove(from, to, dropped) {
  const p = P.current;
  const v = S.view;
  const piece = v.get(from);
  const promotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
  const mv = { from, to, promotion };
  const uci = from + to + (promotion || '');
  S.sel = null; S.legal = [];
  let ok = uci === p.sol[p.idx];
  if (!ok) {
    // qualquer xeque-mate também vale
    try { const t = new Chess(v.fen()); t.move(mv); ok = t.isCheckmate(); } catch { ok = false; }
  }
  if (!ok) {
    P.tries++;
    const ex = explainMove(v.fen(), mv);
    let why = '<p>Pense: o que o adversário ameaça? Alguma peça sua fica sem proteção?</p>';
    if (ex.risks.length) why = `<p>Essa jogada deixa ${ex.risks.map((r) => det(r.type)).join(' e ')} em perigo.</p>`;
    if (P.tries >= 2 && !P.hinted) why += '<p class="muted">Está difícil? Clique em <b>Dica</b>.</p>';
    puzzleCard(`<h3 style="margin-top:0">🤔 Não é essa</h3>${why}<p class="muted">Tentativas: ${P.tries}. Tente outra jogada.</p>`, 'warn');
    render();
    return;
  }
  const primeiro = p.idx === 0;
  const exPrimeiro = primeiro ? explainMove(v.fen(), mv) : null;
  if (primeiro) p.explicacao = exPrimeiro.reasons;
  const mm = v.move(mv);
  S.last = { from, to }; S.marks = {}; S.arrows = [];
  p.idx++;
  render();
  if (!dropped) animate(from, to);
  moveSound(v, mm);
  if (p.idx >= p.sol.length || v.isCheckmate()) {
    P.done = true;
    const done = solvedThemes();
    done[`${p.tema.key}:${p.id}`] = true;
    store.set('chess_theme_solved', done);
    puzzleCard(`<h3 style="margin-top:0">🌟 Isso mesmo!</h3><p>Por que o primeiro lance funciona:</p><ul>${li(p.explicacao || ['Boa jogada!'])}</ul>`, 'good');
    return;
  }
  // resposta do adversário e continuação
  P.locked = true;
  puzzleCard('<p>✅ Certo! O adversário responde…</p>', 'good');
  const gid = P.token;
  setTimeout(() => {
    if (gid !== P.token) return;
    const r = p.sol[p.idx];
    const mr = v.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: r[4] });
    S.last = { from: r.slice(0, 2), to: r.slice(2, 4) };
    p.idx++;
    render();
    animate(r.slice(0, 2), r.slice(2, 4));
    moveSound(v, mr, false);
    P.locked = false;
    puzzleCard('<p>Sua vez de novo. Ache a <b>próxima</b> jogada.</p>');
  }, 650);
}

function puzzleMove(from, to, dropped = false) {
  const p = P.current;
  if (p.kind === 'theme') return themeMove(from, to, dropped);
  const piece = S.view.get(from);
  const promotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
  const uci = from + to + (promotion || '');
  const mv = { from, to, promotion };
  S.sel = null; S.legal = [];
  if (uci === p.best) {
    const ex = explainMove(p.fen, mv);
    P.done = true;
    const mg = S.view.move(mv);
    S.last = { from, to }; S.marks = {}; S.arrows = [];
    if (!p.solved) { p.solved = true; savePuzzles(); }
    puzzleCard(`<h3 style="margin-top:0">🌟 Isso mesmo!</h3><p>Por que é a melhor jogada:</p><ul>${li(ex.reasons)}</ul>${puzzleReply(p)}<p class="muted">Na partida você jogou outra coisa e perdeu cerca de ${p.loss}% das suas chances.</p>`, 'good');
    render();
    if (!dropped) animate(from, to);
    moveSound(S.view, mg);
    return;
  }
  P.tries++;
  const ex = explainMove(p.fen, mv);
  let why = '<p>Pense: o que o adversário ameaça? Alguma peça sua fica sem proteção?</p>';
  if (ex.risks.length) why = `<p>Essa jogada deixa ${ex.risks.map((r) => det(r.type)).join(' e ')} em perigo.</p>`;
  if (P.tries >= 2 && !P.hinted) why += '<p class="muted">Está difícil? Clique em <b>Dica</b>.</p>';
  puzzleCard(`<h3 style="margin-top:0">🤔 Não é essa</h3>${why}<p class="muted">Tentativas: ${P.tries}. Tente outra jogada.</p>`, 'warn');
  render();
}

function puzzleHint() {
  const p = P.current;
  if (!p || P.done || P.locked) return;
  P.hinted = true;
  const from = (p.kind === 'theme' ? p.sol[p.idx] : p.best).slice(0, 2);
  S.marks = { [from]: 'from' };
  const t = (p.kind === 'theme' ? S.view : new Chess(p.fen)).get(from).type;
  puzzleCard(`<p>💡 Dica: a jogada é feita com <b>${det(t)}</b>, a peça marcada em verde. Para onde ela deve ir?</p>`);
  render();
}

function themeReveal() {
  const p = P.current;
  const c = new Chess(S.view.fen());
  const passos = [];
  S.marks = {}; S.arrows = [];
  for (let k = p.idx; k < p.sol.length; k++) {
    const u = p.sol[k];
    const mine = (k - p.idx) % 2 === 0;
    const fen = c.fen();
    passos.push(mine ? moveWords(fen, { from: u.slice(0, 2), to: u.slice(2, 4) }) : `O adversário responde: ${replyWords(fen, u)}`);
    if (k - p.idx < 2) S.arrows.push({ from: u.slice(0, 2), to: u.slice(2, 4), color: mine ? 'green' : 'orange' });
    if (k === p.idx) S.marks = { [u.slice(0, 2)]: 'from', [u.slice(2, 4)]: 'to' };
    c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  }
  P.done = true;
  puzzleCard(`<p><b>A sequência certa:</b></p><ol>${li(passos)}</ol><p class="muted">Seta verde: sua jogada. Laranja: a resposta dele.</p>`, 'bad');
  render();
}

function puzzleReveal() {
  const p = P.current;
  if (!p || P.done || P.locked) return;
  if (p.kind === 'theme') return themeReveal();
  const bm = { from: p.best.slice(0, 2), to: p.best.slice(2, 4), promotion: p.best[4] };
  const ex = explainMove(p.fen, bm);
  const c = new Chess(p.fen);
  const pl = c.get(p.played.slice(0, 2));
  P.done = true;
  p.fails++;
  savePuzzles();
  S.marks = { [bm.from]: 'from', [bm.to]: 'to' };
  S.arrows = [
    { from: bm.from, to: bm.to, color: 'green' },
    { from: p.played.slice(0, 2), to: p.played.slice(2, 4), color: 'red' },
  ];
  if (p.pv && p.pv[1]) S.arrows.push({ from: p.pv[1].slice(0, 2), to: p.pv[1].slice(2, 4), color: 'orange' });
  puzzleCard(`<p><b>${moveWords(p.fen, bm)}</b></p><ul>${li(ex.reasons)}</ul>${puzzleReply(p)}<p class="muted">Seta verde: a melhor jogada. Vermelha: o que você jogou na partida (${det(pl.type)}), perdendo cerca de ${p.loss}% das chances. Laranja: a resposta dele.</p>`, 'bad');
  render();
}

function puzzleStart() {
  P.list.sort((a, b) => a.solved - b.solved || b.loss - a.loss);
  P.run = P.list;
  showPuzzle(0);
}

// Começa uma sessão de 10 exercícios de um tema, dos não resolvidos e mais fáceis primeiro.
async function startTheme(key) {
  const tema = TEMAS.find((t) => t.key === key);
  let rows;
  try {
    rows = await (await fetch(`puzzles/${key}.json`)).json();
  } catch {
    $('#puzzle-out').insertAdjacentHTML('afterbegin', '<div class="card bad">Não consegui carregar esse tema.</div>');
    return;
  }
  const done = solvedThemes();
  const pendentes = rows.filter((r) => !done[`${key}:${r[0]}`]);
  const escolhidos = (pendentes.length ? pendentes : rows).slice(0, 10);
  P.run = escolhidos.map(([id, fen, moves, rating]) => {
    const sol = moves.split(' ');
    const c = new Chess(fen);
    c.move({ from: sol[0].slice(0, 2), to: sol[0].slice(2, 4), promotion: sol[0][4] });
    return { kind: 'theme', tema, id, rating, fenOriginal: fen, openingMove: sol[0], side: c.turn(), sol: sol.slice(1), idx: 0 };
  });
  showPuzzle(0);
}

function puzzleHome() {
  P.current = null;
  P.token++; P.locked = false;
  S.mode = 'puzzle-home';
  S.marks = {}; S.arrows = []; S.sel = null; S.legal = [];
  renderPuzzleHome();
}

// ---------- treino de aberturas ----------
// Você escolhe a cor e a abertura; eu faço os lances do adversário e confiro os seus, um de cada vez.
const D = { active: false, color: 'w', name: '', key: '', moves: [], notes: null, ply: 0, mistakes: 0, done: false, show: store.get('chess_drill_show', true), token: 0 };
const T = { view: 'home', color: 'w', q: '', open: null, more: 40 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const drillsDone = () => store.get('chess_drills', {});

function setTrainView(v) {
  T.view = v;
  $('#tr-home').hidden = v !== 'home';
  $('#tr-pick').hidden = v !== 'pick';
  $('#tr-bar').hidden = v !== 'drill';
  $('#tr-free').hidden = v !== 'free';
  $('#tr-checklist').hidden = v !== 'free';
  $('#coach').hidden = v !== 'drill' && v !== 'free';
  if (v === 'home') renderTrainHome();
  if (v === 'pick') renderPick();
}

// Volta o tabuleiro para a posição inicial, parado.
function idleBoard() {
  S.gid++; D.token++; D.active = false;
  S.chess = new Chess(); S.view = S.chess; S.mode = 'play'; S.lock = true; S.pending = null;
  S.last = null; S.sel = null; S.legal = []; S.marks = {}; S.arrows = [];
  $('#coach').innerHTML = '';
  setEval(0);
  render();
}

function renderTrainHome() {
  $('#tr-home').innerHTML = `
    <div class="card hero">
      <h3>Treinar aberturas</h3>
      <p>Com qual cor você quer treinar? Eu mostro os lances certos, um de cada vez, e respondo como o adversário.</p>
      <div class="colorpick">
        <button class="colorcard" data-act="tr-color" data-color="w">${pieceSvg('w', 'k', 'big')}<b>Brancas</b><span>Aprenda a abrir o jogo</span></button>
        <button class="colorcard" data-act="tr-color" data-color="b">${pieceSvg('b', 'k', 'big')}<b>Pretas</b><span>Aprenda a se defender</span></button>
      </div>
    </div>
    <div class="card slim row">
      <span class="muted">Quer só jogar?</span>
      <button data-act="tr-free">Partida livre contra o computador</button>
    </div>`;
}

async function renderPick() {
  const w = T.color === 'w';
  $('#tr-pick').innerHTML = `
    <div class="trhead"><button data-act="tr-back">← Voltar</button><h3>Treinar de ${w ? 'brancas' : 'pretas'}</h3></div>
    <p class="muted">${w ? 'Escolha uma abertura. Você joga com as brancas e eu respondo com as pretas.' : 'Escolha uma defesa. Você joga com as pretas e eu faço os lances das brancas.'}</p>
    <input id="tr-search" type="search" placeholder="Buscar: Siciliana, Italiana, Gambito…" value="${esc(T.q)}" autocomplete="off">
    <div id="tr-list"><p class="muted">Carregando aberturas…</p></div>`;
  try { await loadOpenings(); } catch { $('#tr-list').innerHTML = '<div class="card bad">Não consegui carregar as aberturas.</div>'; return; }
  renderPickList();
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const repName = (n) => cap(n.replace(/^(Brancas|Pretas): /, ''));
const lineKey = (color, fam, l) => `${color}|${fam}|${l}`;

function renderPickList() {
  const list = $('#tr-list');
  if (!list) return;
  const data = getOpenings();
  const done = drillsDone();
  const q = norm(T.q.trim());
  const lineRow = (fi, lj, f, l, withFam) => {
    const k = lineKey(T.color, f.name, l.n);
    return `<button class="linerow" data-act="tr-line" data-f="${fi}" data-l="${lj}"><span><b>${withFam ? esc(f.name) + ': ' : ''}${esc(l.n)}</b>${done[k] ? ' <i class="ok">✓</i>' : ''}</span><small>${l.m.split(' ').length} lances</small></button>`;
  };
  if (q.length >= 2) {
    const rows = [];
    data.forEach((f, fi) => f.lines.forEach((l, lj) => {
      if (norm(f.name + ' ' + l.n).includes(q)) rows.push(lineRow(fi, lj, f, l, true));
    }));
    list.innerHTML = rows.length
      ? `<p class="muted small">${rows.length} resultado${rows.length > 1 ? 's' : ''}</p>${rows.slice(0, 60).join('')}${rows.length > 60 ? '<p class="muted small">Refine a busca para ver mais.</p>' : ''}`
      : '<p class="muted">Nada encontrado. Tente outro nome.</p>';
    return;
  }
  const fam = (f, fi) => {
    const open = T.open === fi;
    let inner = '';
    if (open) {
      const rows = f.lines.slice(0, T.more).map((l, lj) => lineRow(fi, lj, f, l, false)).join('');
      inner = `<div class="lines">${rows}${f.lines.length > T.more ? `<button class="more" data-act="tr-more">Mostrar mais (${f.lines.length - T.more})</button>` : ''}</div>`;
    }
    return `<div class="fam ${open ? 'open' : ''}"><button class="famhead" data-act="tr-fam" data-i="${fi}"><span><b>${esc(f.name)}</b> <small>${f.eco}</small></span><small>${f.lines.length} variante${f.lines.length > 1 ? 's' : ''} ${open ? '▴' : '▾'}</small></button>${inner}</div>`;
  };
  const mine = [];
  const other = [];
  data.forEach((f, fi) => (f.side === T.color ? mine : other).push(fam(f, fi)));
  const feat = LINES.map((l, i) => [l, i]).filter(([l]) => l.side === T.color)
    .map(([l, i]) => `<button class="linerow star" data-act="tr-cur" data-i="${i}"><span><b>⭐ ${esc(repName(l.name))}</b>${done[lineKey(T.color, 'rep', l.name)] ? ' <i class="ok">✓</i>' : ''}</span><small>${l.moves.split(' ').length} lances</small></button>`).join('');
  const w = T.color === 'w';
  list.innerHTML = `<h4>⭐ Para começar</h4><p class="muted small">Linhas simples para iniciantes, com uma explicação para cada lance.</p>${feat}
    <h4>${w ? 'Aberturas das brancas' : 'Defesas das pretas'} <small class="muted">(${mine.length})</small></h4>${mine.join('')}
    <details class="other"><summary>${w ? 'Defesas do adversário (você joga de brancas contra elas)' : 'Aberturas das brancas (você joga de pretas contra elas)'} <small class="muted">(${other.length})</small></summary>${other.join('')}</details>`;
}

function startDrill(spec) {
  S.gid++; D.token++;
  Object.assign(D, { active: true, color: spec.color, name: spec.name, key: spec.key, moves: spec.moves, notes: spec.notes || null, ply: 0, mistakes: 0, done: false });
  S.chess = new Chess(); S.view = S.chess; S.mode = 'drill'; S.user = D.color; S.flip = D.color === 'b';
  S.last = null; S.sel = null; S.legal = []; S.marks = {}; S.arrows = []; S.pending = null; S.lock = true;
  setTrainView('drill');
  setEval(0);
  $('#evaltext').textContent = '';
  render();
  renderDrillBar();
  drillAdvance();
}

function renderDrillBar() {
  const pct = D.moves.length ? Math.round((100 * D.ply) / D.moves.length) : 0;
  const now = nameAt(D.moves.slice(0, D.ply));
  $('#tr-bar').innerHTML = `<div class="card slim drillbar">
    <div class="dname">${esc(D.name)}</div>
    <div class="muted small">${now && now !== D.name ? 'Agora: ' + esc(now) + ' · ' : ''}${D.done ? 'completa' : `lance ${D.ply + 1} de ${D.moves.length}`}</div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="btns">
      <button data-act="dr-hint">💡 Dica</button>
      <button data-act="dr-restart">↻ Recomeçar</button>
      <button data-act="dr-exit">Outra abertura</button>
    </div>
    <label class="switch"><input type="checkbox" data-act="dr-show" ${D.show ? 'checked' : ''}> Mostrar o lance certo no tabuleiro</label>
  </div>`;
}

function expected() {
  const san = D.moves[D.ply];
  const m = new Chess(S.chess.fen()).move(san);
  return { san, from: m.from, to: m.to, promotion: m.promotion, fen: S.chess.fen() };
}

function userMoveIndex() { return D.color === 'w' ? Math.ceil(D.ply / 2) : Math.floor(D.ply / 2); }

function whyText(ex) {
  if (D.notes && D.notes[userMoveIndex()]) return `<p>${esc(D.notes[userMoveIndex()])}</p>`;
  try {
    const r = explainMove(ex.fen, { from: ex.from, to: ex.to, promotion: ex.promotion }).reasons.slice(0, 2);
    return r.length ? `<ul>${li(r)}</ul>` : '';
  } catch { return ''; }
}

function showDrillPrompt(forceShow = false) {
  const ex = expected();
  renderDrillBar();
  S.marks = {}; S.arrows = [];
  if (D.show || forceShow) {
    S.marks = { [ex.from]: 'from', [ex.to]: 'to' };
    S.arrows = [{ from: ex.from, to: ex.to, color: 'green' }];
    coach(`<div class="headline">Sua vez: faça este lance</div><p>${moveWords(ex.fen, ex)}</p>${whyText(ex)}`, 'good');
  } else {
    coach('<div class="headline">Sua vez</div><p>Qual é o próximo lance da abertura? Se travar, use a dica.</p>');
  }
  render();
}

async function drillAdvance() {
  const t = ++D.token;
  while (D.ply < D.moves.length && S.chess.turn() !== S.user) {
    S.lock = true;
    renderStatus();
    coach('<p class="muted">O adversário está jogando…</p>', '', [], false);
    await sleep(D.ply === 0 ? 350 : 650);
    if (t !== D.token) return;
    const m = S.chess.move(D.moves[D.ply]);
    D.ply++;
    S.last = m; S.marks = {}; S.arrows = [];
    render();
    animate(m.from, m.to);
    moveSound(S.chess, m, false);
    renderDrillBar();
  }
  if (t !== D.token) return;
  if (D.ply >= D.moves.length) return finishDrill();
  S.lock = false;
  showDrillPrompt();
}

function finishDrill() {
  D.done = true; S.lock = true; S.marks = {}; S.arrows = [];
  const done = drillsDone();
  const prev = done[D.key];
  done[D.key] = { times: (prev?.times || 0) + 1, best: prev ? Math.min(prev.best, D.mistakes) : D.mistakes };
  store.set('chess_drills', done);
  renderDrillBar();
  const nota = D.mistakes === 0 ? 'Sem nenhum erro. Ótimo!' : `Você errou ${D.mistakes} vez${D.mistakes > 1 ? 'es' : ''}. Repita para fixar.`;
  coach(`<h3>🎉 Abertura completa!</h3><p>${esc(D.name)}. ${nota}</p>`, 'good', [
    { act: 'dr-restart', label: '↻ Repetir', primary: true },
    { act: 'dr-exit', label: 'Escolher outra' },
  ]);
  render();
}

function drillSquare(sq) {
  if (S.lock || D.done || S.chess.turn() !== S.user) return;
  const p = S.chess.get(sq);
  if (S.sel && S.legal.includes(sq)) return drillMove(S.sel, sq);
  if (p && p.color === S.user) {
    S.sel = sq;
    S.legal = S.chess.moves({ square: sq, verbose: true }).map((m) => m.to);
  } else {
    S.sel = null; S.legal = [];
  }
  render();
}

function drillMove(from, to, dropped = false) {
  if (!D.active || D.done || S.lock || S.chess.turn() !== S.user) return;
  const piece = S.chess.get(from);
  const promotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
  const ex = expected();
  S.sel = null; S.legal = [];
  if (from === ex.from && to === ex.to && (promotion || undefined) === (ex.promotion || undefined)) {
    const m = S.chess.move({ from, to, promotion });
    D.ply++;
    S.last = m; S.marks = {}; S.arrows = [];
    render();
    if (!dropped) animate(from, to);
    moveSound(S.chess, m, true);
    renderDrillBar();
    if (D.ply >= D.moves.length) return finishDrill();
    return drillAdvance();
  }
  D.mistakes++;
  let m;
  try { m = new Chess(S.chess.fen()).move({ from, to, promotion }); } catch { return render(); }
  const seq = [...D.moves.slice(0, D.ply), m.san];
  const outra = isKnown(seq) ? nameAt(seq) : null;
  const msg = outra
    ? `<p>Esse lance existe em outra variante (<b>${esc(outra)}</b>), mas não é a que você está treinando.</p>`
    : '<p>Esse lance não faz parte da abertura que você está treinando.</p>';
  S.marks = { [ex.from]: 'from', [ex.to]: 'to' };
  S.arrows = [{ from: ex.from, to: ex.to, color: 'green' }];
  coach(`<h3>Quase! Tente o lance da abertura</h3>${msg}<p><b>O lance certo:</b> ${moveWords(ex.fen, ex)}</p>${whyText(ex)}`, 'warn');
  render();
}

function openPick(color) {
  T.color = color; T.q = ''; T.open = null; T.more = 40;
  idleBoard();
  S.flip = color === 'b';
  setTrainView('pick');
  render();
}

function pickLine(fi, lj) {
  const f = getOpenings()[fi];
  const l = f.lines[lj];
  startDrill({ color: T.color, name: l.n === 'Linha básica' ? f.name : `${f.name}: ${l.n}`, key: lineKey(T.color, f.name, l.n), moves: l.m.split(' ') });
}

function pickCurated(i) {
  const l = LINES[i];
  startDrill({ color: T.color, name: repName(l.name), key: lineKey(T.color, 'rep', l.name), moves: l.moves.split(' '), notes: l.notes });
}

function showFreeGame() {
  idleBoard();
  setTrainView('free');
  newGame();
}

// ---------- abas e eventos ----------
function selectTab(name, keepMode) {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== 'tab-' + name));
  if (name !== 'play' && D.active) D.token++; // pausa o treino enquanto você está em outra aba
  if (keepMode) return;
  if (name === 'play') {
    S.mode = D.active ? 'drill' : 'play'; S.view = S.chess; S.flip = T.view === 'pick' ? T.color === 'b' : S.user === 'b'; S.marks = {}; S.arrows = []; S.sel = null; S.legal = [];
    const m = S.chess.history({ verbose: true });
    S.last = m.length ? m[m.length - 1] : null;
    render();
    if (D.active && !D.done) { if (S.chess.turn() === S.user) { S.lock = false; showDrillPrompt(); } else drillAdvance(); }
  } else if (name === 'puzzle') {
    if (!P.list.length) P.list = loadPuzzles();
    if (P.current && S.mode === 'puzzle') return;
    S.view = S.chess; S.mode = 'puzzle-home'; S.flip = S.user === 'b'; S.last = null; S.marks = {}; S.arrows = [];
    render();
    renderPuzzleHome();
  } else if (name === 'review' && R && S.mode !== 'review') {
    S.mode = 'review'; S.flip = R.color === 'b'; reviewGo(R.idx);
  }
}

document.addEventListener('click', (e) => {
  const sq = e.target.closest('.sq');
  if (sq) return onSquare(sq.dataset.sq);
  const tab = e.target.closest('#tabs button');
  if (tab) return selectTab(tab.dataset.tab);
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'new') { selectTab('play'); setTrainView('free'); newGame(); }
  else if (a === 'tr-color') openPick(b.dataset.color);
  else if (a === 'tr-back') { idleBoard(); setTrainView(T.view === 'pick' ? 'home' : T.view === 'free' ? 'home' : 'pick'); S.flip = false; render(); }
  else if (a === 'tr-free') showFreeGame();
  else if (a === 'tr-fam') { T.open = T.open === +b.dataset.i ? null : +b.dataset.i; T.more = 40; renderPickList(); }
  else if (a === 'tr-more') { T.more += 60; renderPickList(); }
  else if (a === 'tr-line') pickLine(+b.dataset.f, +b.dataset.l);
  else if (a === 'tr-cur') pickCurated(+b.dataset.i);
  else if (a === 'dr-restart') startDrill({ color: D.color, name: D.name, key: D.key, moves: D.moves, notes: D.notes });
  else if (a === 'dr-exit') openPick(D.color);
  else if (a === 'dr-hint') { if (D.active && !D.done && !S.lock && S.chess.turn() === S.user) showDrillPrompt(true); }
  else if (a === 'dr-show') { D.show = b.checked; store.set('chess_drill_show', D.show); if (D.active && !D.done && !S.lock && S.chess.turn() === S.user) showDrillPrompt(); }
  else if (a === 'flip') { S.flip = !S.flip; render(); }
  else if (a === 'coords') { S.coords = !S.coords; render(); }
  else if (a === 'sound') {
    soundOn = !soundOn;
    store.set('chess_sound', soundOn);
    b.textContent = soundOn ? '🔊 Som' : '🔇 Som';
  }
  else if (a === 'help') showHelp();
  else if (a === 'detail') showDetail();
  else if (a === 'detail-close') closeDetail();
  else if (a === 'step') { S.help.i += +b.dataset.d; showStep(); }
  else if (a === 'close-help') closeHelp();
  else if (a === 'undo') undoMove();
  else if (a === 'continue') continueGame();
  else if (a === 'load') doLoad();
  else if (a === 'review-game') { const r = S.rows.filter((x) => x.cls !== 'daily')[+b.dataset.i]; startReview(r.pgn, r.color, `vs ${r.opp}`); }
  else if (a === 'review-self') startReview(S.chess.pgn(), S.user, 'sua partida');
  else if (a === 'pz-mine') mine();
  else if (a === 'pz-stop') P.stop = true;
  else if (a === 'pz-start') puzzleStart();
  else if (a === 'pz-theme') startTheme(b.dataset.theme);
  else if (a === 'pz-next') showPuzzle(P.i + 1);
  else if (a === 'pz-hint') puzzleHint();
  else if (a === 'pz-reveal') puzzleReveal();
  else if (a === 'pz-home') { puzzleHome(); S.view = S.chess; S.last = null; render(); }
  else if (a === 'pz-clear') { P.list = []; savePuzzles(); renderPuzzleHome(); }
  else if (a === 'rv') reviewGo(+b.dataset.i);
  else if (a === 'back-list') { S.mode = 'review'; renderGameList(); }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'tr-search') { T.q = e.target.value; renderPickList(); }
});

document.addEventListener('keydown', (e) => {
  if (S.mode === 'review' && R) {
    if (e.key === 'ArrowRight') reviewGo(R.idx + 1);
    if (e.key === 'ArrowLeft') reviewGo(R.idx - 1);
  }
});

S.avisos = store.get('chess_avisos', 'erros');
$('#opt-avisos').value = S.avisos;
$('#opt-avisos').addEventListener('change', (e) => { S.avisos = e.target.value; store.set('chess_avisos', S.avisos); });
$('#opt-black').value = getBlackChoice();
$('#opt-black').addEventListener('change', (e) => setBlackChoice(e.target.value));
pieceSet = ['staunty', 'classic'].includes(store.get('chess_pieces', 'classic')) ? store.get('chess_pieces', 'classic') : 'classic';
$('#opt-pieces').value = pieceSet;
$('#opt-pieces').addEventListener('change', (e) => {
  pieceSet = e.target.value;
  store.set('chess_pieces', pieceSet);
  render();
});
$('#btn-sound').textContent = soundOn ? '🔊 Som' : '🔇 Som';
$('#user').value = store.get('chess_user', '');
$('#who').textContent = $('#user').value;
setTrainView('home');
idleBoard();
window.__chess = { S, D, T, analyst, opponent, sound, moveSound }; // ajuda a depurar no console
