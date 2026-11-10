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
| **Treinar** | Começa perguntando se você quer treinar de **brancas** ou de **pretas**. Depois você escolhe uma abertura (ou defesa) entre as ~150 famílias e ~3.900 variantes do banco do Lichess, ou uma das linhas "Para começar", que têm uma explicação para cada lance. O treino mostra o lance certo com seta e palavras, o app joga como adversário e corrige seus erros. Dá para desligar a seta para praticar de memória. Também há "Partida livre" contra o Stockfish (Fácil/Médio/Difícil) com avisos de erros e ameaças. |
| **Exercícios** | Problemas criados a partir dos erros das suas partidas e sessões temáticas (garfo, cravada, mate em 2…) com problemas do Lichess. |
| **Meu perfil** | Carrega suas partidas do chess.com (últimos 6 meses de arquivos) e resume aberturas, resultados e erros, incluindo o histórico acumulado de lances salvo no navegador. |
| **Revisar** | Revisão lance a lance de uma partida sua, com classificação de cada lance. |

Também: arrastar e soltar peças, animação de movimento, barra de avaliação (na partida livre), sons, dois conjuntos de peças (Clássico e Moderno) e layout de uma tela só (em telas ≥ 900 px, sem rolagem da página).

### Fluxo da aba Treinar

1. **Início:** dois botões grandes, *Brancas* e *Pretas*, e um atalho para a *Partida livre*.
2. **Escolha da abertura:** campo de busca (por exemplo "Siciliana"), a seção "⭐ Para começar" (linhas do repertório em [book.js](public/book.js), com uma explicação por lance), a lista de aberturas ou defesas do lado escolhido e, recolhida, a lista do outro lado.
3. **Treino:** o tabuleiro vira para a sua cor, o adversário joga a linha e o painel mostra o lance certo (seta verde e frase em palavras). Uma barra mostra o nome da abertura, o progresso e os botões *Dica*, *Recomeçar* e *Outra abertura*. Lance errado volta à posição e mostra o certo.
4. **Fim:** "Abertura completa!" e, na lista, uma ✓ nas linhas já concluídas.

Na *Partida livre*, as opções são cor, nível do adversário, defesa contra 1.e4 (Caro-Kann ou 1...e5) e tipo de aviso.

## Estrutura

```
server.js                servidor estático (Node)
public/
  index.html             estrutura da página
  style.css              tema verde-floresta com destaque dourado
  coach.png              personagem do cabeçalho e ícone da aba (criação própria)
  app.js                 interface e lógica principal (tabuleiro, abas, treino, exercícios)
  engine.js              classe Engine (Web Worker do Stockfish), cálculo de win%
  explain.js             explicações em português (peças soltas, ameaças, garfos, mates)
  book.js                repertório de aberturas por posição (FEN)
  profile.js             leitura e resumo das partidas do chess.com
  openings.js            carrega openings.json e identifica o nome da abertura
  openings.json          banco de aberturas (gerado; veja tools/build-openings.mjs)
  themes.js              lista dos 16 temas táticos dos exercícios
  sounds.js              sons sintetizados (Web Audio)
  sounds/                sobrescrita opcional de sons (index.json, LEIA-ME.txt)
  puzzles/*.json         16 temas de problemas, ratings 400–1300, até 120 por tema (alguns têm menos, como clearance com 57)
  vendor/                chess.js, Stockfish WASM, conjuntos de peças, LICENSES.txt
tools/
  build-openings.mjs     gera public/openings.json a partir do banco de aberturas do Lichess
  build-puzzles.mjs      gera public/puzzles a partir do banco de problemas do Lichess
```

## Como funciona por dentro

- **Regras:** chess.js. **Engine:** Stockfish 19 lite (WASM) em Web Workers, em três papéis: analista (avalia o que você joga), oponente e minerador (acha problemas nas suas partidas).
- **Níveis do adversário:** Fácil = profundidade 3, sorteia entre as 5 melhores jogadas; Médio = profundidade 6, entre as 3 melhores; Difícil = profundidade 10, sempre a melhor.
- **Análise:** o treinador analisa em profundidade 12 durante a partida e 10 na revisão.
- **Classificação de lances:** pela perda de chance de vitória, `winPct(cp) = 50 + 50·(2/(1+e^(−0,00368208·cp)) − 1)`. Perda < 2% melhor; < 5% bom; < 10% imprecisão; < 20% erro; acima disso, gafe. Erros e gafes (perda ≥ 10%) pausam a partida com opções de desfazer, continuar ou ver o detalhe, exceto com avisos em "Nenhum".
- **Explicações:** regras escritas à mão em [explain.js](public/explain.js) (peças sem defesa, ameaças, garfos, ameaças de mate), baseadas nas linhas do Stockfish.
- **Treino de aberturas:** os dados vêm de https://github.com/lichess-org/chess-openings (domínio público, CC0). Cada família é classificada como abertura das brancas ou defesa das pretas pelo nome e pela linha mais curta; a lista do lado escolhido aparece primeiro e o resto fica numa seção recolhida. Os nomes das famílias mais conhecidas estão em português; os das variantes ficam no nome original. O app só aceita o lance exato da linha escolhida e avisa quando o seu lance pertence a outra variante conhecida.
- **Repertório da partida livre:** [book.js](public/book.js) indexa as linhas pelos 4 primeiros campos do FEN. Brancas: Italiana (3 linhas), Petrov, Escandinava, Alekhine, Francesa, Caro-Kann Avanço. Pretas contra 1.e4: Caro-Kann (padrão) ou 1...e5, escolhido no setup. Também há linhas contra 1.d4, London e 1.Nf3. As linhas foram checadas só quanto a legalidade e solidez segundo o Stockfish, **não** contra a teoria dos cursos.
- **Exercícios das suas partidas:** o minerador ignora os 8 primeiros meio-lances (abertura) e guarda a posição só se havia uma única resposta clara (a segunda melhor perde ≥ 10% de chance de vitória) e o seu lance perdeu ≥ 20%.
- **Chess.com:** só a API pública de arquivos de partidas, para perfil, revisão e problemas das suas partidas.

## Visual

- **Tema:** fundo verde-floresta, tabuleiro verde e creme, destaque dourado (aba ativa e botões principais), cantos arredondados. As cores ficam em variáveis no início de [style.css](public/style.css).
- **Fontes:** Bricolage Grotesque (títulos) e Figtree (texto), carregadas do Google Fonts. Sem internet, o app usa as fontes do sistema.
- **Personagem:** `public/coach.png` aparece no cabeçalho e como ícone da aba. O jogador aparece nas faixas do tabuleiro com o Rei da cor que joga; o computador, com um robô.
- **Acessibilidade:** foco de teclado visível e animações desligadas quando o sistema pede "reduzir movimento".

## Sons e peças

- **Sons:** sintetizados em [sounds.js](public/sounds.js), com parâmetros ajustados a medidas (duração, tom, volume) de um tabuleiro online de referência. Não há arquivos de áudio de terceiros. Cobrem lance, lance do adversário, captura, xeque/mate e roque; promoção e fim de partida usam variações do lance, sem medida de referência. Para usar seus próprios arquivos (que você tenha direito de usar), liste-os em `public/sounds/index.json`; chaves: `move`, `opp`, `capture`, `check`, `castle`, `promote`, `end`. Veja [LEIA-ME.txt](public/sounds/LEIA-ME.txt).
- **Peças:** *Clássico* (Cburnett, padrão) e *Moderno* (Staunty, CC BY-NC-SA 4.0, uso não comercial). Licenças em [LICENSES.txt](public/vendor/LICENSES.txt). Peças e sons do chess.com não são usados por serem protegidos por direitos autorais.

## Dados salvos no navegador (localStorage)

`chess_user`, `chess_rating`, `chess_life` (histórico acumulado de lances), `chess_black_e4` (defesa escolhida contra 1.e4), `chess_drills` (aberturas já completadas), `chess_drill_show` (mostrar a seta no treino), `chess_puzzles`, `chess_theme_solved`, `chess_sound`, `chess_pieces`, `chess_avisos`. Limpar os dados do site apaga o progresso nos exercícios.

## Dependências

`chess.js`, `stockfish` e `cm-chessboard` ficam em `node_modules`, mas o navegador carrega as cópias em `public/vendor/`. O código não importa `cm-chessboard`; ele serviu só como fonte dos arquivos de peças Staunty e Clássico.

## Depuração

No console do navegador, `window.__chess` expõe `S` (estado geral), `D` (treino de aberturas), `T` (tela do Treinar), `analyst`, `opponent`, `sound` e `moveSound`.

## Regenerar os dados

```bash
node tools/build-openings.mjs <pasta com a.tsv ... e.tsv do repositório lichess-org/chess-openings>
node tools/build-puzzles.mjs <lichess_db_puzzle.csv.zst>   # banco baixado do Lichess (CC0)
```

## Licença

Código do projeto sob a licença MIT ([LICENSE](LICENSE)). Componentes de terceiros mantêm as próprias licenças, listadas em [LICENSES.txt](public/vendor/LICENSES.txt): o Stockfish é GPL-3.0 (código-fonte em https://github.com/official-stockfish/Stockfish) e as peças "Moderno" são CC BY-NC-SA 4.0, só para uso não comercial.

## Limitações conhecidas

- Os sons foram medidos, mas nunca ouvidos durante o desenvolvimento; podem precisar de ajuste fino.
- Layout testado em 1280×720; no celular (375 px) só a tela inicial foi vista. O treino de aberturas não foi testado em tela pequena.
- As explicações do treino só são escritas à mão nas linhas "Para começar"; nas demais vêm das regras automáticas de [explain.js](public/explain.js), mais genéricas.
- A divisão entre aberturas das brancas e defesas das pretas é feita por regra e pelo nome; algumas famílias raras podem ficar do lado errado.
- O treino aceita só o lance exato da linha escolhida, não outras ordens de lances que chegam à mesma posição.
- O app depende do servidor local ativo e, para perfil/revisão, de acesso à internet (API do chess.com). As fontes também vêm da internet.
