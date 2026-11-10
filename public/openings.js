// Banco de aberturas do Lichess (CC0), convertido por tools/build-openings.mjs em openings.json.
// Cada família tem um lado ('w' = abertura das brancas, 'b' = defesa das pretas) e várias linhas (lances em SAN).
let data = null;
const prefixes = new Set();
const names = new Map();

export async function loadOpenings() {
  if (data) return data;
  data = await (await fetch('openings.json')).json();
  for (const f of data) {
    for (const l of f.lines) {
      const m = l.m.split(' ');
      for (let k = 1; k <= m.length; k++) prefixes.add(m.slice(0, k).join(' '));
      names.set(l.m, l.n === 'Linha básica' ? f.name : `${f.name}: ${l.n}`);
    }
  }
  return data;
}

export const getOpenings = () => data;

// A sequência é o começo de alguma abertura conhecida?
export const isKnown = (moves) => prefixes.has(moves.join(' '));

// Nome da abertura mais específica que combina com o começo da sequência.
export function nameAt(moves) {
  for (let k = moves.length; k > 0; k--) {
    const n = names.get(moves.slice(0, k).join(' '));
    if (n) return n;
  }
  return null;
}
