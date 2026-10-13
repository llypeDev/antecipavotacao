/*
 * Brasão simplificado, gerado em SVG, usado no rótulo da urna e na cabina.
 */
(function () {
  'use strict';

  /* ---------- utilitários ---------- */

  function paraDataUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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
    brasao: function () {
      if (!brasaoSvg) brasaoSvg = gerarBrasao();
      return brasaoSvg;
    },
    brasaoUri: function () {
      return paraDataUri(window.GraficosUrna.brasao());
    }
  };
})();
