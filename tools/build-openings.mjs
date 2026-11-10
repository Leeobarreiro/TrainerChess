// Gera public/openings.json a partir do banco de aberturas do Lichess (domínio público, CC0):
// https://github.com/lichess-org/chess-openings  (arquivos a.tsv ... e.tsv)
// Uso: node tools/build-openings.mjs <pasta com a.tsv ... e.tsv>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const dir = process.argv[2];
if (!dir) throw new Error('Informe a pasta com os arquivos a.tsv ... e.tsv');

// Nomes em português para as famílias mais conhecidas. As demais seguem uma regra simples (Defense -> Defesa etc.).
const PT = {
  'Italian Game': 'Abertura Italiana', 'Ruy Lopez': 'Ruy Lopez (Espanhola)', 'Scotch Game': 'Abertura Escocesa',
  'Russian Game': 'Defesa Petrov (Jogo Russo)', 'Vienna Game': 'Jogo de Viena', "Bishop's Opening": 'Abertura do Bispo',
  'Four Knights Game': 'Jogo dos Quatro Cavalos', 'Three Knights Opening': 'Abertura dos Três Cavalos',
  'Center Game': 'Jogo do Centro', "King's Gambit": 'Gambito do Rei', "King's Gambit Accepted": 'Gambito do Rei Aceito',
  "King's Gambit Declined": 'Gambito do Rei Recusado', 'Danish Gambit': 'Gambito Dinamarquês',
  'Sicilian Defense': 'Defesa Siciliana', 'French Defense': 'Defesa Francesa', 'Caro-Kann Defense': 'Defesa Caro-Kann',
  'Scandinavian Defense': 'Defesa Escandinava', 'Alekhine Defense': 'Defesa Alekhine', 'Pirc Defense': 'Defesa Pirc',
  'Modern Defense': 'Defesa Moderna', 'Philidor Defense': 'Defesa Philidor', 'Owen Defense': 'Defesa Owen',
  "Queen's Gambit": 'Gambito da Dama', "Queen's Gambit Accepted": 'Gambito da Dama Aceito',
  "Queen's Gambit Declined": 'Gambito da Dama Recusado', 'Slav Defense': 'Defesa Eslava', 'Semi-Slav Defense': 'Defesa Semi-Eslava',
  "King's Indian Defense": 'Defesa Índia do Rei', "Queen's Indian Defense": 'Defesa Índia da Dama',
  'Nimzo-Indian Defense': 'Defesa Nimzo-Índia', 'Grünfeld Defense': 'Defesa Grünfeld', 'Dutch Defense': 'Defesa Holandesa',
  'English Opening': 'Abertura Inglesa', 'London System': 'Sistema Londres', 'Catalan Opening': 'Abertura Catalã',
  'Zukertort Opening': 'Abertura Zukertort', 'Réti Opening': 'Abertura Réti', 'Bird Opening': 'Abertura Bird',
  'Colle System': 'Sistema Colle', 'Trompowsky Attack': 'Ataque Trompowsky', 'Torre Attack': 'Ataque Torre',
  'Benoni Defense': 'Defesa Benoni', 'Benko Gambit': 'Gambito Benko', 'Budapest Defense': 'Defesa Budapest',
  'Englund Gambit': 'Gambito Englund', 'Latvian Gambit': 'Gambito Letão', 'Evans Gambit': 'Gambito Evans',
  'Polish Opening': 'Abertura Polonesa', "Petrov's Defense": 'Defesa Petrov', 'Indian Defense': 'Defesa Índia (outras)',
  "King's Pawn Game": 'Jogo do Peão do Rei', "Queen's Pawn Game": 'Jogo do Peão da Dama', 'Old Indian Defense': 'Defesa Índia Antiga', 'Scandinavian Defense: Main Line': 'Defesa Escandinava',
};
const RULES = [[/^(.+) Defen[sc]e$/, 'Defesa $1'], [/^(.+) Opening$/, 'Abertura $1'], [/^(.+) Gambit$/, 'Gambito $1'],
  [/^(.+) Game$/, 'Jogo $1'], [/^(.+) Attack$/, 'Ataque $1'], [/^(.+) System$/, 'Sistema $1']];
const pt = (fam) => PT[fam] || RULES.reduce((n, [re, to]) => (n === fam && re.test(fam) ? fam.replace(re, to) : n), fam);

// Lado de quem joga a abertura: pelo nome; na dúvida, por quem faz o último lance da linha mais curta.
const BRANCAS = /^(Four Knights|Colle System|King's Indian Attack|Polish Opening|Vienna Gambit|Rapport|Yusupov|English Orangutan|Formation$|London System|Marienbad|Lasker Simul)/;
const PRETAS = /(Defen[sc]e|Countergambit|Declined|Accepted|Queen's Indian|Slav Indian|Benko Gambit|Englund Gambit|Latvian Gambit|Elephant Gambit|Duras Gambit)/;

const fams = new Map();
let total = 0;
for (const f of 'abcde') {
  const rows = readFileSync(join(dir, f + '.tsv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
  for (const row of rows) {
    const [eco, name, pgn] = row.split('\t');
    const moves = pgn.replace(/\d+\.\s*/g, '').trim().split(/\s+/);
    const c = new Chess();
    for (const m of moves) c.move(m); // lança erro se algum lance for ilegal
    const [fam, ...rest] = name.split(': ');
    if (!fams.has(fam)) fams.set(fam, { name: pt(fam), key: fam, eco, lines: [] });
    fams.get(fam).lines.push({ n: rest.join(': ') || 'Linha básica', m: moves.join(' ') });
    total++;
  }
}
const out = [...fams.values()].map((f) => {
  f.lines.sort((a, b) => a.m.split(' ').length - b.m.split(' ').length || a.n.localeCompare(b.n));
  // quem faz o último lance da linha mais curta "cria" a abertura: brancas = abertura, pretas = defesa
  f.side = BRANCAS.test(f.key) ? 'w' : PRETAS.test(f.key) ? 'b' : f.lines[0].m.split(' ').length % 2 === 1 ? 'w' : 'b';
  delete f.key;
  return f;
}).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
writeFileSync(new URL('../public/openings.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} famílias, ${total} linhas, ${out.filter((f) => f.side === 'w').length} de brancas, ${out.filter((f) => f.side === 'b').length} de pretas`);
