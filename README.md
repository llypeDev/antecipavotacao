# Simulador de Votação · Presidente · 2º turno 2026

Simulador **não oficial** da urna eletrônica brasileira para treinar o voto do **2º turno da eleição para
Presidente da República (25 de outubro de 2026)**. A página mostra a urna como se você estivesse dentro da
cabina de votação de papelão.

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
- **Colinha** com os dois candidatos e **resumo** do voto no final da simulação.
- Funciona no computador e no celular (em pé, a tela e o teclado aparecem um embaixo do outro).
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
index.html          página (cabina + urna + colinha)
css/estilo.css      cabina de papelão, urna e telas
js/dados.js         candidatos do 2º turno (edite aqui)
js/urna.js          lógica da votação, telas e teclado
js/som.js           sons da urna
js/graficos.js      brasão impresso na parede da cabina
img/urna.webp       foto da urna (com a tela limpa)
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
- Fotos dos candidatos: divulgação oficial do TSE (DivulgaCandContas), obtidas via
  [minhacolinha.com](https://minhacolinha.com/simulador).
- Som do fim da votação e timbre do clique das teclas: [minhacolinha.com](https://minhacolinha.com/simulador).
- Fonte Liberation Sans: Red Hat / Google, licença SIL Open Font License 1.1 (`fontes/LICENSE.txt`).

## Aviso

Este projeto **não tem vínculo** com o Tribunal Superior Eleitoral (TSE) nem com a Justiça Eleitoral, e não
apoia nenhum candidato. Nenhum voto é enviado ou armazenado: tudo acontece no seu navegador.
