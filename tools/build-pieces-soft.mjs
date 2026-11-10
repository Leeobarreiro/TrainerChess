// Gera public/vendor/pieces-soft.svg: conjunto de peças ORIGINAL (desenhado aqui, sem derivar de nenhum conjunto existente).
import { writeFileSync } from 'node:fs';

const base = '<rect x="9.5" y="29.5" width="21" height="6" rx="3"/>';
const shapes = {
  p: (f) => `<path d="M15 30 C15 25 17.5 23 17.5 19.5 H22.5 C22.5 23 25 25 25 30Z"/><circle cx="20" cy="14" r="5"/>${base}`,
  r: () => `<path d="M12.5 13.5 V8 H16 V10.5 H18.3 V8 H21.7 V10.5 H24 V8 H27.5 V13.5 L25.5 15.5 V29.5 H14.5 V15.5Z"/>${base}`,
  n: () => `<path d="M12.5 30 C12.5 24.5 14 21 17.5 18 C15.5 17.3 13 18.3 10.8 20 C10.4 17.8 12 15.2 14.5 13.8 L16.5 8 L19.5 10.2 C20.5 9.2 21.5 8.4 22.5 8 L23.3 11.2 C28.3 13.2 30 18 30 24 V30Z"/><circle cx="20.8" cy="15.2" r="1.2" class="ink"/>${base}`,
  b: () => `<path d="M20 7 C25 11 26.5 14.5 26.5 17.5 C26.5 20.5 24.5 22 23.3 24 H16.7 C15.5 22 13.5 20.5 13.5 17.5 C13.5 14.5 15 11 20 7Z"/><circle cx="20" cy="5.6" r="1.6"/><path d="M17.6 14.5 H22.4 M20 12 V17" class="line"/><path d="M14.5 24 H25.5 V27.5 H14.5Z"/>${base}`,
  q: () => `<path d="M13 29.5 L10.5 14.5 L13.7 20 L15.5 10.5 L17.9 18 L20 9 L22.1 18 L24.5 10.5 L26.3 20 L29.5 14.5 L27 29.5Z"/><circle cx="10.5" cy="13.5" r="1.6"/><circle cx="15.5" cy="9.7" r="1.6"/><circle cx="20" cy="8" r="1.6"/><circle cx="24.5" cy="9.7" r="1.6"/><circle cx="29.5" cy="13.5" r="1.6"/>${base}`,
  k: () => `<path d="M18.5 3.5 H21.5 V5.5 H23.5 V8.3 H21.5 V10.5 H18.5 V8.3 H16.5 V5.5 H18.5Z"/><path d="M20 11 C26.5 11 30.5 16 28.5 22 C27.8 24 26.8 25.2 26.3 26.5 L27.3 29.5 H12.7 L13.7 26.5 C13.2 25.2 12.2 24 11.5 22 C9.5 16 13.5 11 20 11Z"/>${base}`,
};
const PAL = { w: { fill: '#f6f5f1', stroke: '#45433f', shade: '#dedcd5' }, b: { fill: '#5f5d59', stroke: '#1f1e1c', shade: '#4a4845' } };

let out = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Peças "soft": desenho original deste projeto (formas geométricas simples). Sem licença externa. -->
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
`;
for (const c of ['w', 'b']) {
  const { fill, stroke } = PAL[c];
  for (const t of 'pnbrqk') {
    const body = shapes[t]().replaceAll('class="ink"', `fill="${stroke}" stroke="none"`).replaceAll('class="line"', `fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"`);
    out += `<g id="${c}${t}" transform="translate(20 20) scale(1.12) translate(-20 -19.5)" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${body}</g>\n`;
  }
}
out += '</svg>\n';
writeFileSync(new URL('../public/vendor/pieces-soft.svg', import.meta.url), out);
console.log('ok', out.length);
