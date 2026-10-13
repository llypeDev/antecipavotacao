/*
 * Votômetro: mostra, no estilo do painel de apuração do seuimposto.com, como
 * ficaram os votos simulados NESTE aparelho (fica salvo só no navegador;
 * nada é enviado).
 *
 *  - duelo: foto, partido, porcentagem dos votos válidos e votos de cada um,
 *    barra dividida (vermelho x azul) com a marca dos 50% e a diferença;
 *  - "Ao longo das simulações": linha de cada candidato a cada voto válido.
 *
 * Não junta votos de outras pessoas de propósito: divulgar enquete sobre a
 * eleição é proibido durante o período eleitoral (Resolução TSE 23.600/2019).
 */
(function () {
  'use strict';

  var D = window.DADOS_ELEICAO;
  var CAND = D.candidatos;
  var CHAVE = 'urna-votometro-2turno-2026';
  var MAX_PONTOS = 300;   // pontos guardados para o gráfico de linha
  var DURACAO = 550;      // ms da contagem animada
  var SVGNS = 'http://www.w3.org/2000/svg';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    manchete: $('vm-manchete'), duelo: $('vm-duelo'), barra: $('vm-barra'),
    dif: $('vm-dif'), total: $('vm-total'), validos: $('vm-validos'),
    branco: $('vm-branco'), nulo: $('vm-nulo'), zerar: $('vm-zerar'),
    legenda: $('vm-legenda'), grafico: $('vm-grafico')
  };

  /* ---------- dados salvos ---------- */

  function inteiro(v) {
    v = Number(v);
    return isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  function vazio() {
    var c = { branco: 0, nulo: 0, serie: [] };
    CAND.forEach(function (k) { c[k.numero] = 0; });
    return c;
  }

  function carregar() {
    var c = vazio();
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {};
      c.branco = inteiro(s.branco);
      c.nulo = inteiro(s.nulo);
      CAND.forEach(function (k) { c[k.numero] = inteiro(s[k.numero]); });
      if (Array.isArray(s.serie)) {
        c.serie = s.serie.filter(function (p) { return Array.isArray(p) && p.length === CAND.length; })
          .map(function (p) { return p.map(inteiro); }).slice(-MAX_PONTOS);
      }
    } catch (e) { /* armazenamento indisponível ou corrompido */ }
    // contagem antiga, de antes do gráfico: começa a linha do ponto atual
    if (!c.serie.length && validos(c)) c.serie.push(CAND.map(function (k) { return c[k.numero]; }));
    return c;
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(contagem)); } catch (e) { /* ignora */ }
  }

  function validos(c) {
    return CAND.reduce(function (s, k) { return s + c[k.numero]; }, 0);
  }

  var contagem = carregar();

  /* ---------- formatação ---------- */

  var NUM = new Intl.NumberFormat('pt-BR');
  var PCT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function pct(n, total) { return total ? (n / total) * 100 : 0; }
  function votos(n) { return NUM.format(n) + (n === 1 ? ' voto' : ' votos'); }

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // tom mais escuro da cor do partido, para texto pequeno sobre fundo claro
  function escurecer(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- montagem ---------- */

  function montar() {
    var raiz = document.querySelector('.painel');
    CAND.forEach(function (k) {
      raiz.style.setProperty('--cor-' + k.numero, k.cor);
      raiz.style.setProperty('--texto-' + k.numero, escurecer(k.cor, .84));
    });

    // manchete em ordem numérica, cada nome na cor do partido
    el.manchete.innerHTML = CAND.map(function (k) {
      return '<span style="color:var(--texto-' + k.numero + ');white-space:nowrap">' + esc(k.exibicao) + '</span>';
    }).join(' e ') + ' no 2º turno';

    el.duelo.innerHTML = CAND.map(function (k, i) {
      return '<div class="vm-cand' + (i ? ' vm-cand-dir' : '') + '" data-chave="' + esc(k.numero) + '"' +
        ' style="--cor:var(--cor-' + k.numero + ');--texto:var(--texto-' + k.numero + ')">' +
        '<div class="vm-quem"><img src="' + esc(k.foto) + '" alt="">' +
        '<div><b class="vm-nome">' + esc(k.exibicao) + '</b>' +
        '<span class="vm-partido">' + esc(k.partido) + ' ' + esc(k.numero) + '</span></div></div>' +
        '<p class="vm-pct"><span class="vm-pct-n">0,00</span><sup>%</sup></p>' +
        '<p class="vm-votos">0 votos</p></div>';
    }).join('');

    el.barra.innerHTML = CAND.map(function (k, i) {
      return '<i class="vm-fatia' + (i ? ' vm-fatia-dir' : '') + '" style="background:var(--cor-' + k.numero + ')"></i>';
    }).join('') + '<span class="vm-meio"></span>';

    el.legenda.innerHTML = CAND.map(function (k) {
      return '<li><i style="background:var(--cor-' + k.numero + ')"></i>' + esc(k.exibicao) + '</li>';
    }).join('');
  }

  /* ---------- números animados ---------- */

  function animar(alvo, de, para, formato) {
    if (alvo._raf) cancelAnimationFrame(alvo._raf);
    if (de === para || !window.requestAnimationFrame ||
        (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      alvo.textContent = formato(para);
      return;
    }
    var inicio = null;
    function passo(t) {
      if (inicio === null) inicio = t;
      var p = Math.min(1, (t - inicio) / DURACAO);
      p = 1 - Math.pow(1 - p, 3);
      alvo.textContent = formato(de + (para - de) * p);
      if (p < 1) alvo._raf = requestAnimationFrame(passo);
    }
    alvo._raf = requestAnimationFrame(passo);
  }

  /* ---------- gráfico de linha ---------- */

  function svg(nome, attrs) {
    var n = document.createElementNS(SVGNS, nome);
    Object.keys(attrs || {}).forEach(function (a) { n.setAttribute(a, attrs[a]); });
    return n;
  }

  // faixa do eixo y com folga, em passos "redondos" (como 38%–54% de 2 em 2)
  function faixa(min, max) {
    var passos = [1, 2, 5, 10, 20, 25];
    var amp = Math.max(max - min, 4);
    var passo = passos.filter(function (p) { return amp / p <= 6; })[0] || 25;
    var lo = Math.max(0, Math.floor((min - passo / 2) / passo) * passo);
    var hi = Math.min(100, Math.ceil((max + passo / 2) / passo) * passo);
    if (hi - lo < passo * 2) { lo = Math.max(0, lo - passo); hi = Math.min(100, hi + passo); }
    return { lo: lo, hi: hi, passo: passo };
  }

  function desenharGrafico(novoPonto) {
    var serie = contagem.serie;
    el.grafico.innerHTML = '';
    if (!serie.length) {
      el.grafico.innerHTML = '<p class="vm-vazio">Confirme um voto em um candidato para começar o gráfico.</p>';
      return;
    }

    var W = 300, H = 176, ml = 34, mr = 10, mt = 8, mb = 22;
    var pw = W - ml - mr, ph = H - mt - mb;
    var linhas = CAND.map(function (k, i) {
      return serie.map(function (p) { var t = p.reduce(function (s, v) { return s + v; }, 0); return pct(p[i], t); });
    });
    var todos = [].concat.apply([], linhas);
    var f = faixa(Math.min.apply(null, todos), Math.max.apply(null, todos));
    var x = function (i) { return ml + (serie.length > 1 ? (i / (serie.length - 1)) * pw : pw / 2); };
    var y = function (v) { return mt + ph - ((v - f.lo) / (f.hi - f.lo)) * ph; };

    var ultimo = linhas.map(function (l) { return l[l.length - 1]; });
    var raiz = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': CAND.map(function (k, i) { return k.exibicao + ' ' + PCT.format(ultimo[i]) + '%'; }).join(' e ') +
        ' dos votos válidos, depois de ' + votos(validos(contagem)) + ' válidos simulados neste aparelho'
    });

    var grade = svg('g', { class: 'vm-grade' });
    for (var v = f.lo; v <= f.hi + 1e-9; v += f.passo) {
      grade.appendChild(svg('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v) }));
      var t = svg('text', { x: ml - 6, y: y(v) + 3.5, 'text-anchor': 'end' });
      t.textContent = NUM.format(v) + '%';
      grade.appendChild(t);
    }
    raiz.appendChild(grade);

    var eixo = svg('g', { class: 'vm-eixo' });
    var n = validos(contagem);
    [[ml, 'start', '1º voto'], [W - mr, 'end', NUM.format(n) + (n === 1 ? ' voto válido' : ' votos válidos')]]
      .forEach(function (a) {
        var t = svg('text', { x: a[0], y: H - 6, 'text-anchor': a[1] });
        t.textContent = a[2];
        eixo.appendChild(t);
      });
    raiz.appendChild(eixo);

    CAND.forEach(function (k, i) {
      var cor = 'var(--cor-' + k.numero + ')';
      var d = linhas[i].map(function (val, j) { return (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(val).toFixed(1); }).join('');
      if (serie.length > 1) {
        raiz.appendChild(svg('path', { d: d, class: 'vm-linha', style: 'stroke:' + cor }));
      }
      var j = serie.length - 1;
      raiz.appendChild(svg('circle', {
        cx: x(j), cy: y(linhas[i][j]), r: 3.6,
        class: 'vm-ponto' + (novoPonto ? ' vm-ponto-novo' : ''), style: 'fill:' + cor
      }));
    });

    el.grafico.appendChild(raiz);
  }

  /* ---------- atualização ---------- */

  var mostrado = {}; // porcentagens na tela, para animar a partir delas

  function atualizar(destaque) {
    var v = validos(contagem);
    var total = v + contagem.branco + contagem.nulo;
    var p = CAND.map(function (k) { return pct(contagem[k.numero], v); });

    CAND.forEach(function (k, i) {
      var bloco = el.duelo.querySelector('[data-chave="' + k.numero + '"]');
      var alvo = bloco.querySelector('.vm-pct-n');
      animar(alvo, mostrado[k.numero] || 0, p[i], function (x) { return PCT.format(x); });
      mostrado[k.numero] = p[i];
      bloco.querySelector('.vm-votos').textContent = votos(contagem[k.numero]);
      bloco.setAttribute('aria-label', k.exibicao + ', ' + k.partido + ' ' + k.numero + ': ' +
        PCT.format(p[i]) + '% dos votos válidos, ' + votos(contagem[k.numero]));
    });

    var fatias = el.barra.querySelectorAll('.vm-fatia');
    // folga de 3px de cada lado da marca dos 50%, como no painel do seuimposto
    CAND.forEach(function (k, i) { fatias[i].style.width = p[i] ? 'calc(' + p[i] + '% - 3px)' : '0px'; });

    if (!v) el.dif.textContent = '—';
    else if (contagem[CAND[0].numero] === contagem[CAND[1].numero]) el.dif.textContent = 'Empate';
    else {
      var pontos = Math.abs(p[0] - p[1]);
      var dv = Math.abs(contagem[CAND[0].numero] - contagem[CAND[1].numero]);
      el.dif.textContent = PCT.format(pontos) + ' pontos · ' + votos(dv);
    }

    el.total.textContent = NUM.format(total);
    el.validos.textContent = NUM.format(v);
    el.branco.textContent = NUM.format(contagem.branco);
    el.nulo.textContent = NUM.format(contagem.nulo);

    desenharGrafico(destaque && destaque !== 'branco' && destaque !== 'nulo');

    if (destaque) {
      var alvo = el.duelo.querySelector('[data-chave="' + destaque + '"]') ||
        (el[destaque] && el[destaque].parentNode);
      if (alvo) {
        alvo.classList.remove('vm-subiu');
        void alvo.offsetWidth; // reinicia a animação
        alvo.classList.add('vm-subiu');
      }
    }
  }

  el.zerar.addEventListener('click', function () {
    if (!validos(contagem) && !contagem.branco && !contagem.nulo) return;
    if (!window.confirm('Zerar o votômetro deste aparelho?')) return;
    contagem = vazio();
    salvar();
    atualizar();
  });

  // Mantém abas abertas ao mesmo tempo em sincronia
  window.addEventListener('storage', function (ev) {
    if (ev.key !== CHAVE) return;
    contagem = carregar();
    atualizar();
  });

  montar();
  atualizar();

  window.Votometro = {
    // voto: { tipo: 'nominal' | 'branco' | 'nulo', numero }
    registrar: function (voto) {
      var chave = voto.tipo === 'nominal' ? voto.numero : voto.tipo;
      if (!(chave in contagem) || chave === 'serie') return;
      contagem[chave] += 1;
      if (voto.tipo === 'nominal') {
        contagem.serie.push(CAND.map(function (k) { return contagem[k.numero]; }));
        // muitos votos: guarda um ponto sim, outro não (mantém o formato da curva)
        if (contagem.serie.length > MAX_PONTOS) {
          var ult = contagem.serie[contagem.serie.length - 1];
          contagem.serie = contagem.serie.filter(function (_, i) { return i % 2 === 0; });
          if (contagem.serie[contagem.serie.length - 1] !== ult) contagem.serie.push(ult);
        }
      }
      salvar();
      atualizar(chave);
    },
    contagem: function () { return JSON.parse(JSON.stringify(contagem)); }
  };
})();
