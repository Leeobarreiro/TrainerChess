// Pequeno envelope em volta do Stockfish (roda em um Web Worker).
export class Engine {
  constructor() {
    this.worker = new Worker('vendor/stockfish-19-lite-single.js');
    this.onLine = null;
    this.queue = Promise.resolve();
    this.worker.onmessage = (e) => this.onLine && this.onLine(String(e.data));
    this.ready = this.init();
  }

  send(cmd) {
    this.worker.postMessage(cmd);
  }

  waitFor(done, each) {
    return new Promise((resolve) => {
      this.onLine = (line) => {
        if (each) each(line);
        if (done(line)) {
          this.onLine = null;
          resolve(line);
        }
      };
    });
  }

  async init() {
    this.send('uci');
    await this.waitFor((l) => l === 'uciok');
    this.send('setoption name Hash value 32');
    this.send('isready');
    await this.waitFor((l) => l === 'readyok');
  }

  // Analisa uma posição. Os placares vêm do ponto de vista de quem tem a vez.
  go(fen, { depth = 12, multipv = 1 } = {}) {
    const job = this.queue
      .then(() => this.ready)
      .then(async () => {
        const lines = {};
        let best = null;
        this.send('setoption name MultiPV value ' + multipv);
        this.send('position fen ' + fen);
        this.send('go depth ' + depth);
        await this.waitFor(
          (l) => l.startsWith('bestmove'),
          (l) => {
            if (l.startsWith('bestmove')) {
              best = l.split(' ')[1];
            } else if (l.startsWith('info') && l.includes(' pv ') && /score (cp|mate)/.test(l)) {
              const k = +(l.match(/multipv (\d+)/) || [0, 1])[1];
              const cp = l.match(/score cp (-?\d+)/);
              const mate = l.match(/score mate (-?\d+)/);
              lines[k] = {
                cp: cp ? +cp[1] : null,
                mate: mate ? +mate[1] : null,
                pv: l.split(' pv ')[1].trim().split(' '),
              };
            }
          }
        );
        if (best === '(none)') best = null;
        return {
          best,
          turn: fen.split(' ')[1],
          lines: Object.keys(lines)
            .sort((a, b) => a - b)
            .map((k) => lines[k]),
        };
      });
    this.queue = job.catch(() => {});
    return job;
  }
}

// Chance de vitória (0 a 100) a partir do placar em centipeões.
export const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

export function lineCp(line) {
  if (!line) return 0;
  if (line.mate != null) return (line.mate > 0 ? 1 : -1) * (10000 - Math.abs(line.mate) * 10);
  return line.cp;
}

// Placar da melhor linha, do ponto de vista de `player` ('w' ou 'b').
export function scoreFor(res, player) {
  const cp = lineCp(res.lines[0]);
  return res.turn === player ? cp : -cp;
}
