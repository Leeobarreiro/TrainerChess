// Transforma posições e lances em explicações simples, em português.
import { Chess } from './vendor/chess.js';

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NOME = { p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Dama', k: 'Rei' };
const FEM = { q: 1, r: 1 };
const other = (c) => (c === 'w' ? 'b' : 'w');

export const det = (t) => (FEM[t] ? 'a ' : 'o ') + NOME[t]; // "o Cavalo"
export const seu = (t) => (FEM[t] ? 'sua ' : 'seu ') + NOME[t]; // "seu Cavalo"
const dele = (t) => det(t) + ' do adversário';
const atacada = (t) => (FEM[t] ? 'atacada' : 'atacado');
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);

function piecesOf(chess, color) {
  const out = [];
  for (const row of chess.board()) for (const p of row) if (p && p.color === color) out.push(p);
  return out;
}

function kingSquare(chess, color) {
  return piecesOf(chess, color).find((p) => p.type === 'k').square;
}

// Peças de `color` que o adversário pode ganhar: sem proteção, ou atacadas por algo de menos valor.
export function hanging(chess, color) {
  const opp = other(color);
  const out = [];
  for (const p of piecesOf(chess, color)) {
    if (p.type === 'k') continue;
    const att = chess.attackers(p.square, opp);
    if (!att.length) continue;
    const defended = chess.attackers(p.square, color).length > 0;
    const weakest = att.reduce((a, s) => (VAL[chess.get(s).type] < VAL[chess.get(a).type] ? s : a), att[0]);
    const weakestVal = VAL[chess.get(weakest).type];
    if (!defended || weakestVal < VAL[p.type]) {
      out.push({
        sq: p.square,
        type: p.type,
        defended,
        attacker: weakest,
        attackerType: chess.get(weakest).type,
        gain: defended ? VAL[p.type] - weakestVal : VAL[p.type],
      });
    }
  }
  return out.sort((a, b) => b.gain - a.gain);
}

// O adversário teria um xeque-mate se passássemos a vez?
function mateThreat(chess) {
  if (chess.isCheck()) return null;
  try {
    const parts = chess.fen().split(' ');
    parts[1] = other(parts[1]);
    parts[3] = '-';
    const c2 = new Chess(parts.join(' '));
    for (const m of c2.moves({ verbose: true })) {
      c2.move(m.san);
      const mate = c2.isCheckmate();
      c2.undo();
      if (mate) return m;
    }
  } catch {
    /* posição inválida ao trocar a vez: ignora */
  }
  return null;
}

// Radar: o que o adversário está ameaçando agora (para quem tem a vez).
export function threatReport(chess) {
  const me = chess.turn();
  const opp = other(me);
  const lines = [];
  const marks = [];
  const arrows = [];

  if (chess.isCheck()) {
    const k = kingSquare(chess, me);
    lines.push('Seu Rei está em <b>xeque</b>! Você é obrigado a resolver: mova o Rei, bloqueie o ataque ou capture a peça que dá o xeque.');
    marks.push(k);
    for (const s of chess.attackers(k, opp)) arrows.push({ from: s, to: k, color: 'red' });
  }

  for (const h of hanging(chess, me)) {
    const motivo = h.defended
      ? `e vale mais do que ${det(h.attackerType)} que a ataca`
      : 'e <b>não tem nenhuma proteção</b>';
    lines.push(`${cap1(seu(h.type))} (casa ${h.sq}) está sendo ${atacada(h.type)} por ${dele(h.attackerType)} ${motivo}.`);
    marks.push(h.sq);
    arrows.push({ from: h.attacker, to: h.sq, color: 'red' });
  }

  const mt = mateThreat(chess);
  if (mt) {
    lines.push('⚠️ Cuidado: se você não fizer nada, o adversário pode dar <b>xeque-mate</b> no próximo lance.');
    arrows.push({ from: mt.from, to: mt.to, color: 'red' });
  }
  return { lines, marks, arrows };
}

// Chances: peças do adversário que dá para ganhar agora.
export function opportunityReport(chess) {
  const me = chess.turn();
  const opp = other(me);
  const lines = [];
  const marks = [];
  const arrows = [];
  for (const h of hanging(chess, opp)) {
    const motivo = h.defended
      ? `Ele está protegido, mas vale mais do que ${det(h.attackerType)} que o ataca, então a troca seria boa para você.`
      : 'Ele <b>não tem proteção</b>: dá para capturar de graça!';
    lines.push(`Você ataca ${dele(h.type)} (casa ${h.sq}). ${motivo}`);
    marks.push(h.sq);
    arrows.push({ from: h.attacker, to: h.sq, color: 'green' });
  }
  return { lines, marks, arrows };
}

const CENTRO = ['d4', 'e4', 'd5', 'e5'];

// Explica o que um lance faz, do ponto de vista de quem joga.
export function explainMove(fen, mv) {
  const c = new Chess(fen);
  const me = c.turn();
  const opp = other(me);
  const moveNo = parseInt(fen.split(' ')[5], 10) || 1;
  const hangBefore = hanging(c, me).map((h) => h.sq);
  const enemyBefore = hanging(c, opp).map((h) => h.sq);
  const piece = c.get(mv.from);
  const m = c.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
  const reasons = [];
  let freeCapture = false;

  if (c.isCheckmate()) {
    reasons.push('Dá <b>xeque-mate</b>! O Rei adversário não tem como escapar e você vence a partida.');
  }
  if (m.promotion) {
    reasons.push(`O Peão chegou ao final do tabuleiro e virou ${det(m.promotion)}.`);
  }
  if (m.captured) {
    const defended = c.attackers(m.to, opp).length > 0;
    if (!defended) {
      freeCapture = true;
      reasons.push(`Captura ${dele(m.captured)} <b>de graça</b>: ele estava sem proteção.`);
    } else if (VAL[m.captured] > VAL[m.piece]) {
      reasons.push(`Captura ${dele(m.captured)}, que vale mais do que ${det(m.piece)} que captura. Mesmo que ele recapture, você sai ganhando.`);
    } else if (VAL[m.captured] === VAL[m.piece]) {
      reasons.push(`Troca ${det(m.piece)} por ${dele(m.captured)}. Trocas iguais são boas quando você está na frente ou quer simplificar.`);
    } else {
      reasons.push(`Captura ${dele(m.captured)}, mas ele pode recapturar e a sua peça vale mais. Só compensa por outro motivo.`);
    }
  }
  if (m.flags.includes('k') || m.flags.includes('q')) {
    reasons.push('Faz o <b>roque</b>: coloca o Rei em segurança e traz a Torre para o jogo, tudo em um lance só.');
  }
  if (c.isCheck() && !c.isCheckmate()) {
    reasons.push('Dá <b>xeque</b>: o adversário é obrigado a responder e perde a chance de executar os planos dele.');
  }

  const hangAfter = hanging(c, me);
  if (hangBefore.includes(mv.from) && !hangAfter.some((h) => h.sq === m.to)) {
    reasons.push(`Tira ${seu(piece.type)} do ataque: ela estava ameaçada.`);
  }
  for (const sq of hangBefore) {
    if (sq === mv.from) continue;
    if (!hangAfter.some((h) => h.sq === sq)) {
      const t = c.get(sq).type;
      reasons.push(`Protege ${seu(t)} que estava ameaçad${FEM[t] ? 'a' : 'o'}.`);
    }
  }

  const threats = hanging(c, opp).filter((h) => !enemyBefore.includes(h.sq));
  if (threats.length >= 2) {
    reasons.push('Ataca <b>duas peças ao mesmo tempo</b> (o adversário só consegue salvar uma).');
  } else if (threats.length === 1) {
    reasons.push(`Passa a ameaçar ${dele(threats[0].type)}.`);
  }

  const casaInicial = piece.color === 'w' ? '1' : '8';
  if ((piece.type === 'n' || piece.type === 'b') && mv.from[1] === casaInicial && moveNo <= 12 && !m.captured) {
    reasons.push(`Coloca ${det(piece.type)} em jogo. Peças desenvolvidas no começo dão mais opções depois.`);
  }
  if (piece.type === 'p' && CENTRO.includes(mv.to)) {
    reasons.push('Ocupa o <b>centro</b> do tabuleiro, o que dá espaço para suas peças.');
  }
  if (!reasons.length) {
    reasons.push(`Melhora a posição ${piece.type === 'p' ? 'do seu Peão' : 'da sua peça'} sem deixar nada desprotegido. É uma jogada tranquila e segura.`);
  }

  return {
    reasons,
    freeCapture,
    fork: threats.length >= 2,
    mate: c.isCheckmate(),
    san: m.san,
    risks: hangAfter.map((h) => ({ sq: h.sq, type: h.type, defended: h.defended })),
  };
}

export function moveWords(fen, mv) {
  const c = new Chess(fen);
  const p = c.get(mv.from);
  const alvo = c.get(mv.to);
  let t = `Mova ${det(p.type)} da casa ${mv.from} para a casa ${mv.to}`;
  if (alvo) t += `, capturando ${dele(alvo.type)}`;
  return t + '.';
}

// Frase neutra sobre o que o adversário provavelmente responde.
export function replyWords(fenAfterMyMove, uci) {
  const c = new Chess(fenAfterMyMove);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const p = c.get(from);
  if (!p) return '';
  const alvo = c.get(to);
  const m = c.move({ from, to, promotion: uci[4] });
  let t = `${cap1(dele(p.type))} (casa ${from} para ${to})`;
  if (alvo) t += `, capturando ${seu(alvo.type)}`;
  if (c.isCheckmate()) t += ' e dando xeque-mate';
  else if (c.isCheck()) t += ' e dando xeque';
  return t + '.';
}

// Por que a jogada foi ruim e qual era melhor.
export function mistakeReport(fenBefore, mv, fenAfter, bestUci, replyUci) {
  const problem = [];
  let cause = 'other';
  if (fenAfter && replyUci) {
    const c = new Chess(fenAfter);
    const from = replyUci.slice(0, 2);
    const to = replyUci.slice(2, 4);
    const alvo = c.get(to);
    const m = c.move({ from, to, promotion: replyUci[4] });
    if (c.isCheckmate()) {
      cause = 'mate';
      problem.push('Depois dela, o adversário pode dar <b>xeque-mate</b> no próximo lance.');
    } else if (m.captured) {
      cause = 'hung';
      if (to === mv.to) {
        problem.push(`${cap1(det(m.captured))} que você acabou de mover pode ser capturad${FEM[m.captured] ? 'a' : 'o'} logo em seguida.`);
      } else {
        problem.push(`Depois dela, o adversário pode capturar ${seu(m.captured)} (casa ${to}).`);
      }
      const defended = new Chess(fenAfter).attackers(to, alvo.color === 'w' ? 'w' : 'b').length > 0;
      problem.push(defended ? 'A peça até estava protegida, mas a troca é ruim para você.' : 'A peça estava <b>sem nenhuma proteção</b>.');
    } else {
      problem.push('Depois dela, o adversário tem uma resposta forte que melhora muito a posição dele.');
    }
  }
  let better = null;
  let freeCapture = false;
  if (bestUci && bestUci !== mv.from + mv.to + (mv.promotion || '')) {
    const bm = { from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] };
    const ex = explainMove(fenBefore, bm);
    freeCapture = ex.freeCapture;
    better = { words: moveWords(fenBefore, bm), reasons: ex.reasons, mv: bm };
  }
  if (cause === 'other' && freeCapture) cause = 'missed';
  return { problem, better, cause };
}
