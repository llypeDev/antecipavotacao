/*
 * Gráficos gerados em SVG (sem imagens externas):
 *  - Fotos ilustrativas dos candidatos fictícios (geradas a partir do nome)
 *  - Brasão simplificado usado no teclado da urna e na cabina
 */
(function () {
  'use strict';

  /* ---------- utilitários ---------- */

  function hash(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function sorteador(semente) {
    var a = semente || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function escolher(r, lista) {
    return lista[Math.floor(r() * lista.length)];
  }

  function escurecer(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v * f)));
    });
    return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }

  function paraDataUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- fotos dos candidatos ---------- */

  var PELES = ['#f4d6ba', '#ebc39f', '#dcab82', '#c99063', '#ad7448', '#8e5737', '#6e4029'];
  var CABELOS = ['#1b1411', '#2b1c14', '#3f2a1d', '#5a3d27', '#7a5634', '#a37f4f', '#caa56a'];
  var GRISALHOS = ['#b9b5ae', '#d2cec7', '#9d9892'];
  var FUNDOS = ['#dfe6ee', '#e7e8ea', '#e2e9e1', '#ece6dc', '#dde2ea', '#e8e3ea'];
  var TERNOS = ['#1e2836', '#2a2a2d', '#38404f', '#2b3a52', '#3e3329'];
  var GRAVATAS = ['#8c1d2c', '#1f4e8c', '#2f6b3a', '#6b4d8c', '#b5862a', '#5c5c5c'];
  var BLUSAS = ['#7a1f3d', '#1f2a3a', '#2f5d62', '#8a4b2a', '#3d3a6b', '#a33a3a', '#4f6d8f', '#2e4a3a'];

  var cacheFotos = {};

  function cabeloMasculino(r, cor) {
    var estilo = escolher(r, ['curto', 'curto', 'topete', 'entradas']);
    if (estilo === 'entradas') {
      return '<path fill="' + cor + '" d="M37 66 C35 52 37 44 42 40 C44 47 44 54 43 60 Z"/>' +
        '<path fill="' + cor + '" d="M83 66 C85 52 83 44 78 40 C76 47 76 54 77 60 Z"/>' +
        '<path fill="' + cor + '" opacity=".55" d="M44 40 C50 34 70 34 76 40 C70 38 50 38 44 40 Z"/>';
    }
    if (estilo === 'topete') {
      return '<path fill="' + cor + '" d="M37 64 C33 40 44 26 61 27 C79 27 88 40 83 64 C81 53 79 47 75 44 C67 47 52 47 45 43 C41 47 39 55 37 64 Z"/>' +
        '<path fill="' + cor + '" d="M44 42 C46 30 58 24 70 28 C78 31 80 37 78 44 C70 38 56 36 44 42 Z"/>';
    }
    return '<path fill="' + cor + '" d="M37 64 C35 40 46 31 60 31 C75 31 86 40 83 64 C81 54 79 47 74 45 C66 49 52 49 45 45 C41 48 39 55 37 64 Z"/>';
  }

  function cabeloFeminino(r, cor) {
    var estilo = escolher(r, ['longo', 'longo', 'chanel', 'coque', 'cacheado']);
    var tras, frente;
    if (estilo === 'chanel') {
      tras = '<path fill="' + cor + '" d="M33 62 C30 36 44 27 60 27 C77 27 90 36 87 62 L89 90 C82 96 74 93 72 90 L48 90 C46 93 38 96 31 90 Z"/>';
    } else if (estilo === 'coque') {
      tras = '<circle fill="' + cor + '" cx="60" cy="29" r="11"/>';
    } else if (estilo === 'cacheado') {
      var cachos = '';
      for (var i = 0; i < 16; i++) {
        var ang = Math.PI * (0.95 + i * 1.1 / 15);
        var x = 60 + Math.cos(ang) * 30;
        var y = 62 + Math.sin(ang) * 34;
        cachos += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (9 + r() * 3).toFixed(1) + '"/>';
      }
      for (var j = 0; j < 8; j++) {
        cachos += '<circle cx="' + (34 + j * 7.5).toFixed(1) + '" cy="' + (92 + r() * 8).toFixed(1) + '" r="8"/>';
      }
      tras = '<g fill="' + cor + '">' + cachos + '</g>';
    } else {
      tras = '<path fill="' + cor + '" d="M34 62 C30 36 44 26 60 26 C78 26 90 36 86 62 C88 80 90 100 93 116 C80 122 40 122 27 116 C30 100 32 80 34 62 Z"/>';
    }
    frente = '<path fill="' + cor + '" d="M37 63 C35 40 47 31 60 31 C75 31 86 41 83 63 C79 51 71 43 58 43 C50 47 42 53 37 63 Z"/>';
    return { tras: tras, frente: frente };
  }

  function gerarFoto(nome, opcoes) {
    opcoes = opcoes || {};
    var chave = nome + '|' + (opcoes.g || '') + '|' + (opcoes.grisalho ? 1 : 0);
    if (cacheFotos[chave]) return cacheFotos[chave];

    var r = sorteador(hash(chave));
    var feminino = opcoes.g === 'f';
    var pele = escolher(r, PELES);
    var peleSombra = escurecer(pele, 0.86);
    var cabelo = opcoes.grisalho ? escolher(r, GRISALHOS) : escolher(r, CABELOS);
    var fundo = escolher(r, FUNDOS);
    var oculos = r() < 0.28;
    var barba = !feminino && r() < 0.3;

    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">';
    s += '<defs><radialGradient id="f" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="120" height="150" fill="' + fundo + '"/><rect width="120" height="150" fill="url(#f)"/>';

    var cab = feminino ? cabeloFeminino(r, cabelo) : null;
    if (cab) s += cab.tras;

    // pescoço
    s += '<path fill="' + peleSombra + '" d="M49 84 L49 106 C55 110 65 110 71 106 L71 84 Z"/>';

    // roupa
    if (feminino) {
      var blusa = escolher(r, BLUSAS);
      s += '<path fill="' + blusa + '" d="M10 150 C12 122 28 108 48 103 C52 112 68 112 72 103 C92 108 108 122 110 150 Z"/>';
      s += '<path fill="' + peleSombra + '" d="M48 103 C52 114 68 114 72 103 L69 102 C64 108 56 108 51 102 Z" opacity=".6"/>';
      if (r() < 0.5) {
        s += '<path fill="none" stroke="#e9e1c8" stroke-width="1.6" stroke-dasharray="0.1 3.2" stroke-linecap="round" d="M50 106 C54 114 66 114 70 106"/>';
      }
      if (r() < 0.5) {
        s += '<path fill="' + escurecer(blusa, 0.75) + '" d="M10 150 C12 124 26 111 42 106 L54 150 Z"/><path fill="' + escurecer(blusa, 0.75) + '" d="M110 150 C108 124 94 111 78 106 L66 150 Z"/>';
      }
    } else {
      var terno = escolher(r, TERNOS);
      s += '<path fill="' + terno + '" d="M10 150 C12 122 28 108 49 103 L60 114 L71 103 C92 108 108 122 110 150 Z"/>';
      s += '<path fill="#f4f4f2" d="M49 103 L60 132 L71 103 L67 101 L60 111 L53 101 Z"/>';
      if (r() < 0.8) {
        s += '<path fill="' + escolher(r, GRAVATAS) + '" d="M57.5 111 L62.5 111 L64.5 136 L60 142 L55.5 136 Z"/>';
      }
      s += '<path fill="' + escurecer(terno, 0.78) + '" d="M49 103 L60 132 L52 150 L42 150 L46 124 L41 112 Z"/><path fill="' + escurecer(terno, 0.78) + '" d="M71 103 L60 132 L68 150 L78 150 L74 124 L79 112 Z"/>';
    }

    // orelhas e rosto
    s += '<ellipse cx="38" cy="66" rx="4" ry="6.5" fill="' + peleSombra + '"/><ellipse cx="82" cy="66" rx="4" ry="6.5" fill="' + peleSombra + '"/>';
    s += '<ellipse cx="60" cy="64" rx="22.5" ry="27.5" fill="' + pele + '"/>';
    s += '<path fill="' + peleSombra + '" opacity=".45" d="M40 74 C44 88 52 92 60 92 C68 92 76 88 80 74 C76 84 69 89 60 89 C51 89 44 84 40 74 Z"/>';

    if (barba) {
      s += '<path fill="' + cabelo + '" opacity=".85" d="M39 68 C40 86 50 94 60 94 C70 94 80 86 81 68 C78 78 72 81 66 80 C62 79 58 79 54 80 C48 81 42 78 39 68 Z"/>';
    }

    // olhos, sobrancelhas, nariz e boca
    var olho = '#2a1d17';
    s += '<ellipse cx="51" cy="64.5" rx="2.3" ry="2.6" fill="' + olho + '"/><ellipse cx="69" cy="64.5" rx="2.3" ry="2.6" fill="' + olho + '"/>';
    s += '<circle cx="51.8" cy="63.6" r=".7" fill="#fff"/><circle cx="69.8" cy="63.6" r=".7" fill="#fff"/>';
    var corSobr = opcoes.grisalho ? escurecer(cabelo, 0.7) : cabelo;
    s += '<path d="M45.5 58.5 Q51 55.5 56 58" stroke="' + corSobr + '" stroke-width="' + (feminino ? 1.5 : 2.2) + '" fill="none" stroke-linecap="round"/>';
    s += '<path d="M64 58 Q69 55.5 74.5 58.5" stroke="' + corSobr + '" stroke-width="' + (feminino ? 1.5 : 2.2) + '" fill="none" stroke-linecap="round"/>';
    s += '<path d="M60 66 Q57.5 74 60.8 75.2" stroke="' + escurecer(pele, 0.72) + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    if (feminino) {
      s += '<path d="M53 81 Q60 86.5 67 81 Q60 83.2 53 81 Z" fill="#b5504c" stroke="#b5504c" stroke-width="1.2" stroke-linejoin="round"/>';
    } else {
      s += '<path d="M53.5 81.5 Q60 85.5 66.5 81.5" stroke="' + escurecer(pele, 0.55) + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>';
    }

    // cabelo da frente
    s += feminino ? cab.frente : cabeloMasculino(r, cabelo);

    if (oculos) {
      s += '<g fill="rgba(255,255,255,.18)" stroke="#1f1f1f" stroke-width="1.4"><rect x="44" y="59" width="13.5" height="10.5" rx="3.5"/><rect x="62.5" y="59" width="13.5" height="10.5" rx="3.5"/></g>' +
        '<path d="M57.5 63.5 Q60 62 62.5 63.5 M44 63 L38.5 61.5 M76 63 L81.5 61.5" stroke="#1f1f1f" stroke-width="1.3" fill="none"/>';
    }

    s += '</svg>';
    cacheFotos[chave] = paraDataUri(s);
    return cacheFotos[chave];
  }

  /* ---------- brasão simplificado ---------- */

  function pontosEstrela(cx, cy, rExt, rInt, pontas, giro) {
    var pts = [];
    for (var i = 0; i < pontas * 2; i++) {
      var raio = i % 2 === 0 ? rExt : rInt;
      var ang = giro + (Math.PI * i) / pontas;
      pts.push([cx + Math.cos(ang) * raio, cy + Math.sin(ang) * raio]);
    }
    return pts;
  }

  function poly(pts, fill, extra) {
    return '<polygon fill="' + fill + '" ' + (extra || '') + ' points="' +
      pts.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ') + '"/>';
  }

  function gerarBrasao() {
    var cx = 50, cy = 45;
    var topo = -Math.PI / 2;
    var ouro = '#e9b824', ouroEsc = '#a77c10', verde = '#0f8a3c', amarelo = '#ffd21f', vermelho = '#c8102e', azul = '#1d3f91';
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';

    // resplendor de 20 pontas
    s += poly(pontosEstrela(cx, cy, 45, 37, 20, topo), ouro, 'stroke="' + ouroEsc + '" stroke-width=".6"');

    // espada
    s += '<rect x="48.7" y="3" width="2.6" height="80" fill="#d5dade" stroke="#6b7177" stroke-width=".5"/>';
    s += '<rect x="42" y="80" width="16" height="2.6" rx="1" fill="' + ouro + '" stroke="' + ouroEsc + '" stroke-width=".4"/>';
    s += '<rect x="48.4" y="82.5" width="3.2" height="8" fill="#6b4a22"/><circle cx="50" cy="92" r="2.2" fill="' + ouro + '"/>';

    // ramos de café (esquerda) e fumo (direita)
    var folhas = '';
    for (var i = 0; i < 9; i++) {
      var a1 = Math.PI * (0.62 + i * 0.07);
      var x1 = cx + Math.cos(a1) * 37, y1 = cy + Math.sin(a1) * 37;
      folhas += '<ellipse cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" rx="5" ry="2.2" transform="rotate(' + (a1 * 180 / Math.PI + 60).toFixed(0) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ')" fill="#2f7d32" stroke="#1d5220" stroke-width=".4"/>';
      if (i % 2 === 0) folhas += '<circle cx="' + (x1 + 2).toFixed(1) + '" cy="' + (y1 - 1).toFixed(1) + '" r="1.1" fill="#c62828"/>';
      var a2 = Math.PI * (0.38 - i * 0.07);
      var x2 = cx + Math.cos(a2) * 37, y2 = cy + Math.sin(a2) * 37;
      folhas += '<ellipse cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" rx="5.4" ry="2.6" transform="rotate(' + (a2 * 180 / Math.PI - 60).toFixed(0) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ')" fill="#43a047" stroke="#1d5220" stroke-width=".4"/>';
      if (i % 3 === 1) folhas += '<circle cx="' + (x2 - 2).toFixed(1) + '" cy="' + (y2 - 1).toFixed(1) + '" r="1.1" fill="#f3e5f5"/>';
    }
    s += folhas;

    // estrela de 5 pontas: bordas ouro e vermelha + gironado verde/amarelo
    s += poly(pontosEstrela(cx, cy, 33, 13.6, 5, topo), ouro);
    s += poly(pontosEstrela(cx, cy, 30.5, 12.6, 5, topo), vermelho);
    var est = pontosEstrela(cx, cy, 28.5, 11.8, 5, topo);
    for (var k = 0; k < 10; k++) {
      var p1 = est[k], p2 = est[(k + 1) % 10];
      s += poly([[cx, cy], p1, p2], k % 2 === 0 ? verde : amarelo);
    }

    // escudo azul com o Cruzeiro do Sul e bordadura de estrelas
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="' + ouro + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="10.6" fill="' + azul + '"/>';
    for (var e = 0; e < 27; e++) {
      var ae = (Math.PI * 2 * e) / 27;
      s += '<circle cx="' + (cx + Math.cos(ae) * 11.8).toFixed(2) + '" cy="' + (cy + Math.sin(ae) * 11.8).toFixed(2) + '" r=".5" fill="#fff"/>';
    }
    [[50, 38], [50, 51], [44.5, 45], [55.5, 43.5], [52.5, 47.5]].forEach(function (p, idx) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (idx === 4 ? 0.8 : 1.25) + '" fill="#fff"/>';
    });

    // laço/fita azul
    s += '<path d="M13 79 C30 86 70 86 87 79 L90 87 C70 95 30 95 10 87 Z" fill="' + azul + '" stroke="#102a66" stroke-width=".5"/>';
    s += '<path d="M18 85 C35 90 65 90 82 85" stroke="#fff" stroke-width=".7" stroke-dasharray="1.3 .9" fill="none" opacity=".85"/>';

    s += '</svg>';
    return s;
  }

  var brasaoSvg = null;

  window.GraficosUrna = {
    foto: gerarFoto,
    brasao: function () {
      if (!brasaoSvg) brasaoSvg = gerarBrasao();
      return brasaoSvg;
    },
    brasaoUri: function () {
      return paraDataUri(window.GraficosUrna.brasao());
    }
  };
})();
