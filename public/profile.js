// Busca e resume as partidas do chess.com (API pública, só leitura).
const API = 'https://api.chess.com/pub/player/';

export async function loadProfile(user, onProgress) {
  const base = API + encodeURIComponent(user.toLowerCase());
  const [stats, arch] = await Promise.all([
    fetch(base + '/stats').then((r) => (r.ok ? r.json() : null)),
    fetch(base + '/games/archives').then((r) => {
      if (!r.ok) throw new Error('Usuário não encontrado no chess.com');
      return r.json();
    }),
  ]);
  const urls = arch.archives.slice(-6);
  const games = [];
  for (let i = 0; i < urls.length; i++) {
    onProgress?.(i + 1, urls.length);
    const j = await fetch(urls[i]).then((r) => r.json());
    games.push(...j.games);
  }
  return { stats, games };
}

const DRAWS = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];

function tag(pgn, name) {
  const m = (pgn || '').match(new RegExp('\\[' + name + ' "([^"]*)"\\]'));
  return m ? m[1] : '';
}

function openingName(pgn) {
  const slug = (tag(pgn, 'ECOUrl').split('/openings/')[1] || 'Sem nome').split('-');
  const parts = [];
  for (const s of slug) {
    if (/\d/.test(s)) break;
    parts.push(s);
  }
  return parts.join(' ') || 'Sem nome';
}

export function gameRows(games, user) {
  const me = user.toLowerCase();
  return games
    .filter((g) => g.rules === 'chess' && g.pgn)
    .map((g) => {
      const white = g.white.username.toLowerCase() === me;
      const mine = white ? g.white : g.black;
      const theirs = white ? g.black : g.white;
      const out = mine.result === 'win' ? 'W' : DRAWS.includes(mine.result) ? 'D' : 'L';
      return {
        pgn: g.pgn,
        color: white ? 'w' : 'b',
        out,
        how: mine.result === 'win' ? theirs.result : mine.result,
        opp: theirs.username,
        oppRating: theirs.rating,
        rating: mine.rating,
        cls: g.time_class,
        end: g.end_time,
        opening: openingName(g.pgn),
        url: g.url,
        acc: g.accuracies ? g.accuracies[white ? 'white' : 'black'] : null,
      };
    })
    .sort((a, b) => b.end - a.end);
}

const pct = (w, d, n) => (n ? Math.round((100 * (w + d / 2)) / n) : 0);

export function summarize(rows) {
  const normal = rows.filter((r) => r.cls !== 'daily');
  const count = (a) => ({
    n: a.length,
    w: a.filter((r) => r.out === 'W').length,
    d: a.filter((r) => r.out === 'D').length,
    l: a.filter((r) => r.out === 'L').length,
  });
  const tot = count(normal);
  const lossHow = {};
  for (const r of normal) if (r.out === 'L') lossHow[r.how] = (lossHow[r.how] || 0) + 1;

  const byOpening = (color) => {
    const m = {};
    for (const r of normal.filter((x) => x.color === color)) (m[r.opening] ??= []).push(r);
    return Object.entries(m)
      .map(([name, a]) => ({ name, ...count(a), score: pct(count(a).w, count(a).d, a.length) }))
      .filter((o) => o.n >= 5)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  };

  const accGames = normal.filter((r) => r.acc != null);
  const accBuckets = [
    ['abaixo de 50%', 0, 50],
    ['50% a 65%', 50, 65],
    ['65% a 80%', 65, 80],
    ['80% ou mais', 80, 101],
  ].map(([label, lo, hi]) => {
    const a = accGames.filter((r) => r.acc >= lo && r.acc < hi);
    return { label, ...count(a) };
  });

  return {
    total: tot,
    ignoredDaily: rows.length - normal.length,
    white: count(normal.filter((r) => r.color === 'w')),
    black: count(normal.filter((r) => r.color === 'b')),
    lossHow,
    openingsW: byOpening('w'),
    openingsB: byOpening('b'),
    accBuckets,
    score: pct(tot.w, tot.d, tot.n),
  };
}
