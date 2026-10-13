# Simulador de Votação · Eleições 2026

Simulador **não oficial** da urna eletrônica brasileira para treinar o voto antes de ir à seção eleitoral.
A página mostra a urna como se você estivesse dentro da cabina de votação de papelão, com os bipes das teclas
e o famoso "pi-pi-pi-piiii" do fim da votação.

## O que tem

- **Urna completa**: tela de LCD, teclado numérico com braille e as teclas BRANCO, CORRIGE e CONFIRMA.
- **Mesma ordem da urna real em 2026**:
  1. Deputado Federal (4 dígitos)
  2. Deputado Estadual (5 dígitos)
  3. Senador – 1ª vaga (3 dígitos)
  4. Senador – 2ª vaga (3 dígitos)
  5. Governador (2 dígitos)
  6. Presidente (2 dígitos)
- **Regras da urna**: voto nominal, voto de legenda (só para deputado: 2 dígitos do partido + CONFIRMA),
  voto em branco (só com o campo vazio), voto nulo (número inexistente), 2ª vaga de senador repetida é anulada,
  barra de gravação e tela **FIM**.
- **1º e 2º turno** (o 2º turno tem só Governador e Presidente). Link direto para o 2º turno: `index.html#2turno`.
- **Sons sintetizados** com a Web Audio API: nenhum arquivo de áudio é necessário.
- **Colinha eleitoral** com a lista de candidatos fictícios e **resumo** dos votos no final da simulação.
- Funciona no computador e no celular (em pé, a tela fica em cima e o teclado embaixo).
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
index.html        página (cabina + urna + colinha)
css/estilo.css    visual da cabina de papelão, da urna e da tela
js/dados.js       partidos, candidatos e ordem dos cargos (edite aqui)
js/urna.js        lógica da votação, desenho da tela e teclado
js/som.js         efeitos sonoros (Web Audio API)
js/graficos.js    fotos ilustrativas dos candidatos e brasão, gerados em SVG
```

### Trocar candidatos

Edite `js/dados.js`. Cada cargo tem o número de dígitos e a lista de candidatos. As fotos são desenhadas
automaticamente a partir do nome (use `g: 'f'` ou `g: 'm'` e `grisalho: true` para variar o desenho).
Em `turnos` fica a ordem das telas de cada turno; `somente` limita os candidatos do 2º turno.

### Ajustar os sons

Os parâmetros (frequência, duração e volume dos bipes) ficam no objeto `SOM`, no início de `js/som.js`.

## Aviso

Este projeto **não tem vínculo** com o Tribunal Superior Eleitoral (TSE) nem com a Justiça Eleitoral.
Todos os partidos e candidatos são **fictícios** e servem apenas para treino. Nenhum voto é enviado ou
armazenado: tudo acontece no seu navegador.
