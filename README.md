# Simulador de Votação · Presidente · 2º turno 2026

Simulador **não oficial** da urna eletrônica brasileira para treinar o voto do **2º turno da eleição para
Presidente da República (25 de outubro de 2026)**. A urna fica sobre uma mesa numa sala de aula usada como
seção eleitoral, com a fila de eleitores esperando e os mesários ao fundo.

## O que tem

- **A urna de verdade**: a imagem é uma foto da urna eletrônica (`img/urna.webp`), com teclado, braille e
  rótulo originais. As teclas são clicáveis e "afundam" ao serem pressionadas.
- **Telas no padrão da urna**, desenhadas por cima do vidro com a mesma perspectiva da foto:
  - digitando: "Presidente" e as duas caixas do número;
  - voto pronto: "SEU VOTO PARA", "Presidente", "Número:", Nome, Partido, Vice-Presidente, fotos
    e "Confira seu voto";
  - NÚMERO ERRADO / VOTO NULO e VOTO EM BRANCO;
  - aviso quando se aperta BRANCO com número digitado;
  - **FIM** e "VOTOU".
- **Candidatos do 2º turno**, em ordem numérica, com nome de urna, partido, vice e fotos oficiais:
  - **13** LULA (PT) · vice GERALDO ALCKMIN (PSB)
  - **22** FLAVIO BOLSONARO (PL) · vice ALFREDO GASPAR (PL)
- **Sons**: clique das teclas e o "tirirí" do fim da votação (`som/urna-confirma.mp3`). Se o arquivo não
  tocar, o mesmo som é sintetizado (tom alternando 2204 Hz e 2307 Hz).
- **Votômetro** no topo da página: a cada CONFIRMA soma o voto ao candidato escolhido (ou a brancos/nulos),
  com barra e contagem animadas. Ele conta **só as simulações feitas no próprio aparelho**, fica salvo no
  navegador (`localStorage`) e tem o botão "zerar". Nada é enviado: juntar votos de várias pessoas e divulgar
  seria uma enquete, proibida no período eleitoral (Resolução TSE nº 23.600/2019).
- **Colinha** com os dois candidatos e **resumo** do voto no final da simulação.
- **Cenário em 2D**: ilustração de uma sala de aula de escola pública (quadro-negro com "Eleições 2026 ·
  2º turno", janelas, mural, porta com o número da seção), fila de eleitores e mesa receptora.
- Funciona no computador e no celular; a urna aparece sempre inteira (no celular em pé ela ocupa a largura da
  tela, e deitado fica maior).
- Teclado físico: números, <kbd>Enter</kbd> = CONFIRMA, <kbd>Backspace</kbd>/<kbd>Esc</kbd> = CORRIGE, <kbd>B</kbd> = BRANCO.

## Como rodar

É um site estático (HTML, CSS e JavaScript puros), sem dependências e sem etapa de build.

```bash
# qualquer servidor estático serve, por exemplo:
npx serve .
# ou
python3 -m http.server 8000
```

Também dá para abrir o `index.html` direto no navegador.

### Publicar

- **GitHub Pages**: em *Settings → Pages*, escolha *Deploy from a branch*, a branch principal e a pasta `/ (root)`.
- **Vercel / Netlify**: importe o repositório como projeto estático, sem comando de build.

## Estrutura

```
index.html          página (cenário + urna + colinha)
css/estilo.css      cenário, urna e telas
js/dados.js         candidatos do 2º turno (edite aqui)
js/urna.js          lógica da votação, telas e teclado
js/votometro.js     votômetro (contagem salva só no navegador)
js/som.js           sons da urna
img/urna.webp       foto da urna (com a tela limpa)
img/sala.webp       cenário: sala de aula com a fila de eleitores
ferramentas/        gerador do cenário (gerar_sala.py)
img/candidatos/     fotos oficiais dos candidatos
som/                som do fim da votação
fontes/             Liberation Sans (mesmas medidas do Arial usado na tela da urna)
```

### Como a tela é posicionada

A foto da urna tem 1480×684 px. Tudo o que fica por cima dela (teclas e tela) usa essas coordenadas e é
escalado junto com a foto. A tela é montada numa área de 785×400 px e projetada sobre o vidro com um
`matrix3d` calculado a partir dos quatro cantos do vidro na foto, por isso o texto acompanha a perspectiva.
As posições e os tamanhos dos textos foram medidos sobre fotos da urna real.

## Créditos

- Foto da urna e referências das telas: imagens fornecidas pelo autor do projeto.
- Cenário: ilustração criada para este projeto (`ferramentas/gerar_sala.py`).
- Fotos dos candidatos: divulgação oficial do TSE (DivulgaCandContas), obtidas via
  [minhacolinha.com](https://minhacolinha.com/simulador).
- Som do fim da votação e timbre do clique das teclas: [minhacolinha.com](https://minhacolinha.com/simulador).
- Fonte Liberation Sans: Red Hat / Google, licença SIL Open Font License 1.1 (`fontes/LICENSE.txt`).

## Aviso

Este projeto **não tem vínculo** com o Tribunal Superior Eleitoral (TSE) nem com a Justiça Eleitoral, e não
apoia nenhum candidato. O votômetro não é pesquisa nem enquete: ele mostra apenas as simulações feitas no seu
aparelho, e nenhum voto é enviado a servidor algum.
