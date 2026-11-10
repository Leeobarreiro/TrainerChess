// Lê o banco de exercícios do Lichess (CC0) e gera arquivos pequenos por tema para o treinador.
// Uso: node tools/build-puzzles.mjs <caminho do lichess_db_puzzle.csv.zst>
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createZstdDecompress } from 'node:zlib';

const input = process.argv[2];
if (!input) throw new Error('Informe o caminho do arquivo .csv.zst');

// Ordem de prioridade: cada exercício entra no primeiro tema da lista que ele tiver.
const TEMAS = ['mateIn1', 'backRankMate', 'mateIn2', 'doubleCheck', 'discoveredAttack', 'fork', 'pin', 'skewer',
  'deflection', 'attraction', 'capturingDefender', 'clearance', 'interference', 'trappedPiece', 'promotion', 'hangingPiece'];
const POR_TEMA = 120;
const RATING_MIN = 400;
const RATING_MAX = 1300;
const MIN_POPULARIDADE = 85;
const MIN_JOGADAS = 200;
const MAX_LANCES = 6; // até 3 jogadas suas

const pool = Object.fromEntries(TEMAS.map((t) => [t, []]));
let lidas = 0;
let aceitas = 0;

// O arquivo começa com um quadro "pulável" de 12 bytes (usado pelo pzstd) que o Node não lê.
const rl = createInterface({ input: createReadStream(input, { start: 12 }).pipe(createZstdDecompress()), crlfDelay: Infinity });
for await (const line of rl) {
  if (lidas++ === 0) continue; // cabeçalho
  const [id, fen, moves, rating, , popularity, nbPlays, themes] = line.split(',');
  if (!themes) continue; // linha incompleta
  const r = +rating;
  if (r < RATING_MIN || r > RATING_MAX || +popularity < MIN_POPULARIDADE || +nbPlays < MIN_JOGADAS) continue;
  const lances = moves.split(' ');
  if (lances.length > MAX_LANCES) continue;
  const tema = TEMAS.find((t) => themes.split(' ').includes(t));
  if (!tema) continue;
  pool[tema].push({ id, fen, moves, rating: r, pop: +popularity, plays: +nbPlays });
  aceitas++;
}

const resumo = {};
for (const t of TEMAS) {
  const escolhidos = pool[t]
    .sort((a, b) => b.pop - a.pop || b.plays - a.plays)
    .slice(0, POR_TEMA)
    .sort((a, b) => a.rating - b.rating)
    .map((p) => [p.id, p.fen, p.moves, p.rating]);
  writeFileSync(new URL(`../public/puzzles/${t}.json`, import.meta.url), JSON.stringify(escolhidos));
  resumo[t] = { candidatos: pool[t].length, gravados: escolhidos.length };
}
console.log({ linhas: lidas, aceitas });
console.table(resumo);

// Índice com o total de exercícios de cada tema.
writeFileSync(new URL('../public/puzzles/index.json', import.meta.url), JSON.stringify(Object.fromEntries(TEMAS.map((t) => [t, resumo[t].gravados]))));
