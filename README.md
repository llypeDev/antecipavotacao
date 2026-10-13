# Simulador de Votação · Presidente · 2º turno 2026

Simulador **não oficial** da urna eletrônica brasileira para treinar o voto do **2º turno da eleição para
Presidente da República (25 de outubro de 2026)**. Fundo latte bem claro, só a urna em evidência, e um
votômetro no estilo do painel de apuração do [seuimposto.com](https://seuimposto.com/).

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
- **Votômetro** no estilo do painel de apuração do seuimposto.com (ao lado da urna em telas largas, abaixo
  dela no celular):
  - duelo com foto, partido, porcentagem dos votos válidos e votos de cada candidato (vermelho do PT, azul do
    PL), barra dividida com a marca dos 50% e a diferença em pontos e em votos;
  - votos válidos, brancos e nulos;
  - gráfico de linha "Ao longo das simulações", com a porcentagem de cada um a cada voto válido.

  Ele conta **só as simulações feitas no próprio aparelho**, fica salvo no navegador (`localStorage`) e tem o
  botão "Zerar". Nada é enviado: juntar votos de várias pessoas e divulgar seria uma enquete, proibida no
  período eleitoral (Resolução TSE nº 23.600/2019).
- **Colinha** com os dois candidatos e **resumo** do voto no final da simulação.
- Funciona no computador e no celular; a urna aparece sempre inteira na primeira tela (no celular em pé ela
  ocupa a largura da tela, e deitado fica maior).
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
index.html          página (urna, votômetro e colinha)
css/estilo.css      página, urna, telas e votômetro
js/dados.js         candidatos do 2º turno (edite aqui)
js/urna.js          lógica da votação, telas e teclado
js/votometro.js     votômetro e gráfico (contagem salva só no navegador)
js/som.js           sons da urna
img/urna.webp       foto da urna (com a tela limpa)
img/candidatos/     fotos oficiais dos candidatos
som/                som do fim da votação
fontes/             Liberation Sans (mesmas medidas do Arial da tela da urna), Faustina e Geist (votômetro)
```

### Como a tela é posicionada

A foto da urna tem 1480×684 px. Tudo o que fica por cima dela (teclas e tela) usa essas coordenadas e é
escalado junto com a foto. A tela é montada numa área de 785×400 px e projetada sobre o vidro com um
`matrix3d` calculado a partir dos quatro cantos do vidro na foto, por isso o texto acompanha a perspectiva.
As posições e os tamanhos dos textos foram medidos sobre fotos da urna real.

## Créditos

- Foto da urna e referências das telas: imagens fornecidas pelo autor do projeto.
- Visual do votômetro: inspirado no painel "Apuração 2026" do [seuimposto.com](https://seuimposto.com/).
- Fotos dos candidatos: divulgação oficial do TSE (DivulgaCandContas), obtidas via
  [minhacolinha.com](https://minhacolinha.com/simulador).
- Som do fim da votação e timbre do clique das teclas: [minhacolinha.com](https://minhacolinha.com/simulador).
- Fontes, todas com licença SIL Open Font License 1.1:
  - Liberation Sans: Red Hat / Google (`fontes/LICENSE.txt`);
  - Faustina: The Faustina Project Authors (`fontes/LICENSE-Faustina.txt`);
  - Geist: Vercel (`fontes/LICENSE-Geist.txt`).

## Aviso

Este projeto **não tem vínculo** com o Tribunal Superior Eleitoral (TSE) nem com a Justiça Eleitoral, e não
apoia nenhum candidato. O votômetro não é pesquisa nem enquete: ele mostra apenas as simulações feitas no seu
aparelho, e nenhum voto é enviado a servidor algum.
