// Repertório sugerido para um jogador iniciante (brancas com 1.e4; pretas com Caro-Kann ou 1...e5).
import { Chess } from './vendor/chess.js';

// moves: sequência a partir do início. notes: uma explicação para cada lance SEU, na ordem.
export const LINES = [
  {
    side: 'w',
    name: 'Brancas: Italiana',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1',
    notes: [
      'Abra com o Peão do Rei duas casas: ocupa o centro e libera a Dama e o Bispo.',
      'O Cavalo do Rei sai e ataca o Peão central preto.',
      'O Bispo aponta para o ponto mais fraco do adversário, perto do Rei dele. Essa é a Italiana.',
      'Prepare o Peão da Dama para ocupar o centro mais tarde. Também dá uma casa de saída para o Bispo.',
      'Proteja o Peão do Rei e solte o Bispo da Dama. É o plano calmo e seguro da Italiana.',
      'Roque: o Rei fica seguro e a Torre entra no jogo.',
      'A Torre protege o Peão do Rei e fica pronta para o centro.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: Italiana (quando ele joga o Cavalo para f6)',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6',
    notes: [
      'Abra com o Peão do Rei duas casas.',
      'O Cavalo do Rei sai e ataca o Peão central preto.',
      'O Bispo aponta para o ponto mais fraco do adversário, perto do Rei dele.',
      'Jogada calma: protege o Peão do Rei e evita uma armadilha em que o Cavalo dele avança cedo demais.',
      'Roque: Rei seguro e Torre no jogo.',
      'A Torre protege o Peão do Rei e fica pronta para o centro.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: Italiana (ele joga Cavalo e depois Bispo para c5)',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1',
    notes: [
      'Abra com o Peão do Rei duas casas.',
      'O Cavalo do Rei sai e ataca o Peão central preto.',
      'O Bispo aponta para o ponto mais fraco do adversário, perto do Rei dele.',
      'Jogada calma que protege o Peão do Rei.',
      'Prepare o Peão da Dama para ocupar o centro mais tarde.',
      'Roque: Rei seguro e Torre no jogo.',
      'A Torre protege o Peão do Rei e fica pronta para o centro.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: contra a defesa Petrov',
    moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 Bb5',
    notes: [
      'Abra com o Peão do Rei duas casas.',
      'O Cavalo do Rei sai e ataca o Peão central preto.',
      'Desenvolver o outro Cavalo é simples e evita a armadilha de capturar o Peão central cedo demais.',
      'O Bispo sai e aumenta a pressão sobre o Cavalo que defende o centro.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: contra a Escandinava',
    moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6',
    notes: [
      'Abra com o Peão do Rei.',
      'Capture o Peão: ele fica sem recompensa, a Dama preta vai aparecer cedo demais.',
      'Cavalo ataca a Dama e ganha tempo (você desenvolve enquanto ele foge).',
      'Avance o Peão da Dama: centro forte e seu Bispo ganha caminho.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: contra a Alekhine',
    moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3',
    notes: [
      'Abra com o Peão do Rei.',
      'Avance e expulsa o Cavalo: ele perde tempo.',
      'Ocupe o centro com os dois Peões.',
      'Desenvolva o Cavalo e proteja o Peão e5.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: contra a Francesa',
    moves: 'e4 e6 d4 d5 Nc3',
    notes: [
      'Abra com o Peão do Rei.',
      'Ocupe o centro com o segundo Peão.',
      'Desenvolva o Cavalo e pressione o Peão d5.',
    ],
  },
  {
    side: 'w',
    name: 'Brancas: contra a Caro-Kann (variante do avanço)',
    moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nc6 O-O',
    notes: [
      'Abra com o Peão do Rei.',
      'Ocupe o centro com o segundo Peão.',
      'Avance o Peão: ele ganha espaço e prende o Bispo preto numa zona mais apertada. É o "avanço".',
      'Desenvolva o Cavalo do Rei, protegendo o Peão avançado.',
      'O Bispo sai e prepara o roque.',
      'Desenvolva o outro Bispo e fique de olho no Peão d4.',
      'Roque: Rei seguro e Torre no jogo.',
    ],
  },
  {
    side: 'b',
    group: 'caro',
    name: 'Pretas: Caro-Kann clássica (ele joga Cavalo para c3)',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6',
    notes: [
      'O Peão do Bispo prepara o Peão da Dama no centro, e protege o seu Rei. Essa é a ideia da Caro-Kann.',
      'Agora o Peão da Dama vai ao centro, com apoio do Peão c6.',
      'Capture o Peão do centro dele e abra o caminho do seu Bispo.',
      'Solte o Bispo da Dama ANTES de fechar com ...e6. É a grande vantagem da Caro-Kann sobre a Francesa.',
      'Recue o Bispo, ele fica seguro e continua apontando para a diagonal.',
      'Pergunte ao Peão dele: o Bispo precisa de uma casa de fuga em h7.',
      'Desenvolva o Cavalo da Dama, sem bloquear o Bispo da Dama.',
      'Retire o Bispo para a casa segura.',
      'Troque o Bispo dele: o seu era o mais ativo e a troca dá segurança.',
      'Agora sim, feche com o Peão do Rei: estrutura sólida e Rei seguro.',
    ],
  },
  {
    side: 'b',
    group: 'caro',
    name: 'Pretas: Caro-Kann contra o avanço (e5)',
    moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5',
    notes: [
      'O Peão do Bispo prepara o centro.',
      'Ocupe o centro com o Peão da Dama.',
      'Tire o Bispo da Dama para fora ANTES de fechar com ...e6.',
      'Feche com o Peão do Rei: Bispo livre e estrutura sólida.',
      'Ataque o centro dele: o Peão de d4 fica sob pressão.',
    ],
  },
  {
    side: 'b',
    group: 'caro',
    name: 'Pretas: Caro-Kann contra a troca de Peões',
    moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4',
    notes: [
      'O Peão do Bispo prepara o centro.',
      'Ocupe o centro com o Peão da Dama.',
      'Recapture com o Peão do Bispo: o centro fica simétrico e seu jogo é fácil.',
      'Desenvolva o Cavalo e pressione o centro dele.',
      'Desenvolva o Cavalo do Rei e controle o centro.',
      'Prenda o Cavalo dele com o Bispo, antes de ele abrir a diagonal.',
    ],
  },
  {
    side: 'b',
    group: 'caro',
    name: 'Pretas: Caro-Kann contra o Panov (c4)',
    moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6',
    notes: [
      'O Peão do Bispo prepara o centro.',
      'Ocupe o centro com o Peão da Dama.',
      'Recapture com o Peão do Bispo.',
      'Desenvolva o Cavalo e proteja o Peão d5.',
      'Feche com o Peão do Rei: solidez no centro e Bispo livre para jogar.',
    ],
  },
  {
    side: 'b',
    group: 'caro',
    name: 'Pretas: Caro-Kann contra o Cavalo cedo',
    moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6',
    notes: [
      'O Peão do Bispo prepara o centro.',
      'Ocupe o centro com o Peão da Dama.',
      'Prenda o Cavalo dele com o Bispo, antes de fechar o jogo.',
      'Troque o Bispo pelo Cavalo dele: sai da pressão e deixa o jogo simples.',
      'Feche com o Peão do Rei: estrutura sólida.',
    ],
  },
  {
    side: 'b',
    group: 'e5',
    name: 'Pretas: contra a Italiana (Bispo dele aponta para f7)',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
    notes: [
      'Responda com o mesmo tipo de jogada: Peão do Rei duas casas. Defende o centro e libera a Dama e o Bispo.',
      'O Cavalo da Dama defende o Peão e5 e desenvolve uma peça.',
      'O Bispo sai e espelha o jogo dele, é seguro e aponta para o rei branco.',
    ],
  },
  {
    side: 'b',
    group: 'e5',
    name: 'Pretas: contra a Espanhola (Bispo dele ataca seu Cavalo)',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6',
    notes: [
      'Peão do Rei duas casas.',
      'Cavalo defende o Peão e5.',
      'Peão da torre pergunta ao Bispo o que ele quer fazer. Ele precisa recuar ou trocar.',
      'Desenvolva o Cavalo e ataque o Peão central dele.',
    ],
  },
  {
    side: 'b',
    group: 'e5',
    name: 'Pretas: contra a Escocesa (Peão dele abre o centro)',
    moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6',
    notes: [
      'Peão do Rei duas casas.',
      'Cavalo defende o Peão e5.',
      'Capture o Peão. Seu centro fica menos pressionado.',
      'Desenvolva o Cavalo, atacando o Peão e4.',
    ],
  },
  {
    side: 'b',
    group: 'e5',
    name: 'Pretas: contra a Dama cedo',
    moves: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6',
    notes: [
      'Peão do Rei duas casas.',
      'Cavalo defende o Peão e5 e já ameaça a Dama.',
      'Peão do Bispo ataca a Dama e tira a ameaça de xeque-mate no f7.',
      'Desenvolva o Cavalo e continue protegendo seu Rei.',
    ],
  },
  {
    side: 'b',
    name: 'Pretas: contra o Peão da Dama',
    moves: 'd4 d5 c4 e6 Nc3 Nf6',
    notes: [
      'Responda com o mesmo Peão central. Simples e sólido.',
      'O Peão do Rei protege o Peão d5 e abre caminho para o Bispo.',
      'Desenvolva o Cavalo e proteja o centro.',
    ],
  },
  {
    side: 'b',
    name: 'Pretas: contra o sistema London',
    moves: 'd4 d5 Bf4 Nf6 e3 e6',
    notes: [
      'Peão central.',
      'Desenvolva o Cavalo.',
      'O Peão do Rei deixa o Bispo preto livre e protege o Peão d5.',
    ],
  },
  {
    side: 'b',
    name: 'Pretas: contra o Cavalo na abertura',
    moves: 'Nf3 d5 d4 Nf6',
    notes: ['Peão central.', 'Cavalo do Rei desenvolve e defende o centro.'],
  },
];

const key = (fen) => fen.split(' ').slice(0, 4).join(' ');

// Defesa de pretas contra 1.e4: 'caro' (Caro-Kann) ou 'e5'. A escolha fica guardada no navegador.
let choice = 'caro';
try { choice = localStorage.getItem('chess_black_e4') || 'caro'; } catch { /* sem armazenamento */ }

let book = new Map();
function build() {
  book = new Map();
  for (const line of LINES) {
    if (line.group && line.group !== choice) continue;
    const c = new Chess();
    let n = 0;
    line.moves.split(' ').forEach((san, i) => {
      const mine = (i % 2 === 0) === (line.side === 'w');
      if (mine) {
        const k = key(c.fen());
        if (!book.has(k)) book.set(k, { san, name: line.name, why: line.notes[n] || '' });
        n++;
      }
      c.move(san);
    });
  }
}
build();

export const getBlackChoice = () => choice;
export function setBlackChoice(c) {
  choice = c;
  try { localStorage.setItem('chess_black_e4', c); } catch { /* sem armazenamento */ }
  build();
}
export const bookFor = (fen) => book.get(key(fen));
