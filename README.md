# Treinador de Xadrez

App local de aprendizado de xadrez para iniciantes que não leem notação algébrica. Usa o Stockfish para mostrar a melhor jogada **em palavras e setas**, em português do Brasil. Tudo roda no navegador; não há banco de dados nem conta.

## Como rodar

```bash
npm install   # só na primeira vez
npm start     # sobe o servidor em http://localhost:5173
```

O servidor ([server.js](server.js)) apenas serve a pasta `public/`. Ele para quando o terminal fecha; basta rodar `npm start` de novo.

## O que o app faz

| Aba | Função |
|---|---|
| **Treinar** | Joga contra o Stockfish (Fácil/Médio/Difícil). O treinador avisa de erros e ameaças em frases curtas. Botão "Me ajude" mostra a melhor jogada com seta. Opção "Avisos": só erros (padrão), todos os lances ou nenhum. |
| **Exercícios** | Problemas criados a partir dos erros das suas partidas e sessões temáticas (garfo, cravada, mate em 2…) com problemas do Lichess. |
| **Meu perfil** | Carrega suas partidas do chess.com (últimos 6 meses de arquivos) e resume aberturas, resultados e erros, incluindo o histórico acumulado de lances salvo no navegador. |
| **Revisar** | Revisão lance a lance de uma partida sua, com classificação de cada lance. |

Também: arrastar e soltar peças, animação de movimento, barra de avaliação, sons, três conjuntos de peças e layout de uma tela só (em telas ≥ 900 px, sem rolagem da página).

## Estrutura

```
server.js                servidor estático (Node)
public/
  index.html             estrutura da página
  style.css              tema escuro estilo chess.com
  app.js                 interface e lógica principal (tabuleiro, abas, treino, exercícios)
  engine.js              classe Engine (Web Worker do Stockfish), cálculo de win%
  explain.js             explicações em português (peças soltas, ameaças, garfos, mates)
  book.js                repertório de aberturas por posição (FEN)
  profile.js             leitura e resumo das partidas do chess.com
  themes.js              lista dos 16 temas táticos dos exercícios
  sounds.js              sons sintetizados (Web Audio)
  sounds/                sobrescrita opcional de sons (index.json, LEIA-ME.txt)
  puzzles/*.json         16 temas de problemas, ratings 400–1300, até 120 por tema (alguns têm menos, como clearance com 57)
  vendor/                chess.js, Stockfish WASM, conjuntos de peças, LICENSES.txt
tools/
  build-puzzles.mjs      gera public/puzzles a partir do banco de problemas do Lichess
  build-pieces-soft.mjs  gera public/vendor/pieces-soft.svg
```

## Como funciona por dentro

- **Regras:** chess.js. **Engine:** Stockfish 19 lite (WASM) em Web Workers, em três papéis: analista (avalia o que você joga), oponente e minerador (acha problemas nas suas partidas).
- **Níveis do adversário:** Fácil = profundidade 3, sorteia entre as 5 melhores jogadas; Médio = profundidade 6, entre as 3 melhores; Difícil = profundidade 10, sempre a melhor.
- **Análise:** o treinador analisa em profundidade 12 durante a partida e 10 na revisão.
- **Classificação de lances:** pela perda de chance de vitória, `winPct(cp) = 50 + 50·(2/(1+e^(−0,00368208·cp)) − 1)`. Perda < 2% melhor; < 5% bom; < 10% imprecisão; < 20% erro; acima disso, gafe. Erros e gafes (perda ≥ 10%) pausam a partida com opções de desfazer, continuar ou ver o detalhe, exceto com avisos em "Nenhum".
- **Explicações:** regras escritas à mão em [explain.js](public/explain.js) (peças sem defesa, ameaças, garfos, ameaças de mate), baseadas nas linhas do Stockfish.
- **Repertório:** [book.js](public/book.js) indexa as linhas pelos 4 primeiros campos do FEN. Brancas: Italiana (3 linhas), Petrov, Escandinava, Alekhine, Francesa, Caro-Kann Avanço. Pretas contra 1.e4: Caro-Kann (padrão) ou 1...e5, escolhido no setup. Também há linhas contra 1.d4, London e 1.Nf3. As linhas foram checadas só quanto a legalidade e solidez segundo o Stockfish, **não** contra a teoria dos cursos.
- **Exercícios das suas partidas:** o minerador ignora os 8 primeiros meio-lances (abertura) e guarda a posição só se havia uma única resposta clara (a segunda melhor perde ≥ 10% de chance de vitória) e o seu lance perdeu ≥ 20%.
- **Chess.com:** só a API pública de arquivos de partidas, para perfil, revisão e problemas das suas partidas.

## Sons e peças

- **Sons:** sintetizados em [sounds.js](public/sounds.js), com parâmetros ajustados a medidas (duração, tom, volume) de um tabuleiro online de referência. Não há arquivos de áudio de terceiros. Cobrem lance, lance do adversário, captura, xeque/mate e roque; promoção e fim de partida usam variações do lance, sem medida de referência. Para usar seus próprios arquivos (que você tenha direito de usar), liste-os em `public/sounds/index.json`; chaves: `move`, `opp`, `capture`, `check`, `castle`, `promote`, `end`. Veja [LEIA-ME.txt](public/sounds/LEIA-ME.txt).
- **Peças:** *Moderno* (Staunty, CC BY-NC-SA 4.0, uso não comercial), *Suave* (desenho original deste projeto) e *Clássico* (Cburnett). Licenças em [LICENSES.txt](public/vendor/LICENSES.txt). Peças e sons do chess.com não são usados por serem protegidos por direitos autorais.

## Dados salvos no navegador (localStorage)

`chess_user`, `chess_rating`, `chess_life` (histórico acumulado de lances), `chess_black_e4` (defesa escolhida contra 1.e4), `chess_puzzles`, `chess_theme_solved`, `chess_sound`, `chess_pieces`, `chess_avisos`. Limpar os dados do site apaga o progresso nos exercícios.

## Dependências

`chess.js`, `stockfish` e `cm-chessboard` ficam em `node_modules`, mas o navegador carrega as cópias em `public/vendor/`. O código não importa `cm-chessboard`; ele serviu só como fonte dos arquivos de peças Staunty e Clássico.

## Depuração

No console do navegador, `window.__chess` expõe `S` (estado), `analyst`, `opponent`, `sound` e `moveSound`.

## Regenerar os dados

```bash
node tools/build-pieces-soft.mjs
node tools/build-puzzles.mjs <lichess_db_puzzle.csv.zst>   # banco baixado do Lichess (CC0)
```

## Licença

Código do projeto sob a licença MIT ([LICENSE](LICENSE)). Componentes de terceiros mantêm as próprias licenças, listadas em [LICENSES.txt](public/vendor/LICENSES.txt): o Stockfish é GPL-3.0 (código-fonte em https://github.com/official-stockfish/Stockfish) e as peças "Moderno" são CC BY-NC-SA 4.0, só para uso não comercial.

## Limitações conhecidas

- Os sons foram medidos, mas nunca ouvidos durante o desenvolvimento; podem precisar de ajuste fino.
- Layout testado apenas em 1280×720; celular não foi testado.
- O app depende do servidor local ativo e, para perfil/revisão, de acesso à internet (API do chess.com).
