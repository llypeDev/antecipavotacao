/*
 * Lógica da urna (voto para Presidente, 2º turno): estados, telas e teclado.
 * As telas seguem o layout da urna no modo de treinamento do TSE.
 */
(function () {
  'use strict';

  var D = window.DADOS_ELEICAO;
  var Som = window.SomUrna;
  var G = window.GraficosUrna;
  var CARGO = D.cargo;

  var $ = function (sel) { return document.querySelector(sel); };

  var el = {
    tela: $('#tela'),
    anuncio: $('#anuncio'),
    btnCola: $('#btn-cola'),
    btnNova: $('#btn-nova'),
    btnResumo: $('#btn-resumo'),
    btnSom: $('#btn-som'),
    dlgCola: $('#dlg-cola'),
    dlgResumo: $('#dlg-resumo'),
    conteudoCola: $('#cola-conteudo'),
    conteudoResumo: $('#resumo-conteudo')
  };

  var estado = {
    digitos: '',
    branco: false,
    aviso: null,
    voto: null,
    fase: 'votando' // votando | fim
  };

  var relogio = null;

  /* ---------- dados ---------- */

  function buscar(numero) {
    return D.candidatos.filter(function (c) { return c.numero === numero; })[0] || null;
  }

  /*
   * Interpreta o que está digitado.
   * "pronto" indica que a tecla CONFIRMA registra o voto.
   */
  function analisar() {
    if (estado.branco) return { tipo: 'branco', pronto: true };
    if (estado.digitos.length < CARGO.digitos) return { tipo: 'digitando', pronto: false };
    var cand = buscar(estado.digitos);
    if (cand) return { tipo: 'nominal', candidato: cand, pronto: true };
    return { tipo: 'nulo', pronto: true };
  }

  /* ---------- telas ---------- */

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var TREINAMENTO = '<div class="tv-treinamento">TREINAMENTO</div>';

  function caixas() {
    var h = '';
    for (var k = 0; k < CARGO.digitos; k++) {
      var d = estado.digitos[k];
      var atual = !estado.aviso && k === estado.digitos.length;
      h += '<span class="caixa' + (atual ? ' atual' : '') + '">' + (d ? esc(d) : '') + '</span>';
    }
    return h;
  }

  function linha(rotulo, valor) {
    return '<div class="tv-linha"><span class="tv-rotulo">' + esc(rotulo) + ':</span> ' +
      '<span class="tv-valor">' + esc(valor) + '</span></div>';
  }

  function telaVotacao(r) {
    var h = '<div class="tv">' + TREINAMENTO;
    if (r.pronto && !estado.aviso) h += '<div class="tv-seu-voto">SEU VOTO PARA</div>';
    h += '<div class="tv-cargo">' + esc(CARGO.titulo) + '</div>';

    if (r.tipo !== 'branco') h += '<div class="tv-caixas">' + caixas() + '</div>';

    if (r.tipo === 'nominal') {
      var c = r.candidato;
      h += '<div class="tv-dados">' +
        linha('Nome', c.nome) +
        linha('Partido', c.partido) +
        (c.vice ? linha(CARGO.tituloVice, c.vice.nome) : '') +
        '</div>';
      h += '<div class="tv-fotos">' +
        '<figure class="tv-foto"><img src="' + esc(c.foto) + '" alt=""><figcaption>' + esc(CARGO.titulo) + '</figcaption></figure>' +
        (c.vice ? '<figure class="tv-foto tv-foto-vice"><img src="' + esc(c.vice.foto) + '" alt=""><figcaption>' + esc(CARGO.tituloVice) + '</figcaption></figure>' : '') +
        '</div>';
    }

    if (estado.aviso === 'branco-com-numero') {
      h += '<div class="tv-aviso">Para votar em BRANCO o campo de voto deve estar vazio.<br>Aperte CORRIGE para apagar o campo de voto.</div>';
    } else if (r.tipo === 'branco') {
      h += '<div class="tv-grande tv-branco pisca">VOTO EM BRANCO</div>';
    } else if (r.tipo === 'nulo') {
      h += '<div class="tv-media tv-numero-errado">NÚMERO ERRADO</div><div class="tv-grande tv-nulo pisca">VOTO NULO</div>';
    }

    if (r.pronto && !estado.aviso) {
      h += '<div class="tv-rodape"><div>Aperte a tecla:</div>' +
        '<div class="tv-rod-linha"><span>CONFIRMA</span> para CONFIRMAR este voto</div>' +
        '<div class="tv-rod-linha"><span>CORRIGE</span> para REINICIAR este voto</div></div>';
    }
    return h + '</div>';
  }

  var DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  function dois(n) { return (n < 10 ? '0' : '') + n; }

  function dataHora() {
    var d = new Date();
    return DIAS[d.getDay()] + ' ' + dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
      dois(d.getHours()) + ':' + dois(d.getMinutes()) + ':' + dois(d.getSeconds());
  }

  var BATERIA = '<svg class="tv-bateria" viewBox="0 0 34 16" aria-hidden="true">' +
    '<rect x="1" y="1" width="29" height="14" rx="1.5" fill="#173d17" stroke="#3dbb3d" stroke-width="1.8"/>' +
    '<rect x="30.5" y="5" width="2.6" height="6" rx=".6" fill="#3dbb3d"/>' +
    '<rect x="3.6" y="3.6" width="7" height="8.8" fill="#38b038"/><rect x="11.6" y="3.6" width="7" height="8.8" fill="#38b038"/>' +
    '<rect x="19.6" y="3.6" width="7.8" height="8.8" fill="#38b038"/></svg>';

  function telaFim() {
    var s = D.secao;
    return '<div class="tv tv-tela-fim">' +
      '<div class="tv-data" id="tv-data">' + dataHora() + '</div>' + TREINAMENTO + BATERIA +
      '<div class="tv-fim">FIM</div>' +
      '<div class="tv-votou">VOTOU</div>' +
      '<div class="tv-status">Município: ' + esc(s.municipio) + '<span>Zona: ' + esc(s.zona) + '</span><span>Seção: ' + esc(s.secao) + '</span></div>' +
      '</div>';
  }

  function render() {
    clearInterval(relogio);
    var texto;
    if (estado.fase === 'fim') {
      el.tela.innerHTML = telaFim();
      texto = 'FIM. Votou.';
      relogio = setInterval(function () {
        var dt = document.getElementById('tv-data');
        if (dt) dt.textContent = dataHora();
      }, 1000);
    } else {
      var r = analisar();
      el.tela.innerHTML = telaVotacao(r);
      texto = descrever(r);
    }
    el.anuncio.textContent = texto;
    el.btnNova.hidden = estado.fase !== 'fim';
    el.btnResumo.hidden = estado.fase !== 'fim';
  }

  // Texto para leitores de tela
  function descrever(r) {
    var base = CARGO.titulo + '. ';
    if (estado.aviso === 'branco-com-numero') return base + 'Para votar em branco o campo de voto deve estar vazio. Aperte CORRIGE.';
    if (r.tipo === 'branco') return base + 'Voto em branco. Aperte CONFIRMA.';
    var num = estado.digitos ? 'Número ' + estado.digitos.split('').join(' ') + '. ' : 'Digite ' + CARGO.digitos + ' números. ';
    if (r.tipo === 'nominal') {
      var c = r.candidato;
      return base + num + c.nome + ', ' + c.partido + (c.vice ? '. ' + CARGO.tituloVice + ': ' + c.vice.nome : '') + '. Aperte CONFIRMA.';
    }
    if (r.tipo === 'nulo') return base + num + 'Número errado. Voto nulo.';
    return base + num;
  }

  /* ---------- ações das teclas ---------- */

  function digito(d) {
    if (estado.branco || estado.aviso) return;
    if (estado.digitos.length >= CARGO.digitos) return;
    estado.digitos += d;
    render();
  }

  function branco() {
    if (estado.digitos.length > 0) estado.aviso = 'branco-com-numero';
    else estado.branco = true;
    render();
  }

  function corrige() {
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    render();
  }

  // Retorna true quando o voto foi registrado (o FIM tem som próprio)
  function confirma() {
    if (estado.aviso) return false;
    var r = analisar();
    if (!r.pronto) return false;
    estado.voto = { tipo: r.tipo, numero: estado.digitos, candidato: r.candidato || null };
    estado.fase = 'fim';
    Som.fim();
    render();
    vibrar([60, 40, 60, 40, 220]);
    return true;
  }

  function vibrar(padrao) {
    if (navigator.vibrate) {
      try { navigator.vibrate(padrao); } catch (e) { /* ignora */ }
    }
  }

  function pressionar(tecla) {
    Som.preparar();
    // Depois do FIM as teclas ficam inativas, como na urna real
    if (estado.fase !== 'votando') return;
    vibrar(8);
    var somProprio = false;
    if (/^\d$/.test(tecla)) digito(tecla);
    else if (tecla === 'branco') branco();
    else if (tecla === 'corrige') corrige();
    else if (tecla === 'confirma') somProprio = confirma();
    if (!somProprio) Som.tecla();
  }

  function animarTecla(tecla) {
    var b = document.querySelector('.tecla[data-tecla="' + tecla + '"]');
    if (!b) return;
    b.classList.add('pressionada');
    setTimeout(function () { b.classList.remove('pressionada'); }, 120);
  }

  function iniciar() {
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    estado.voto = null;
    estado.fase = 'votando';
    render();
  }

  /* ---------- colinha e resumo ---------- */

  function montarCola() {
    var h = '<p class="cola-intro">Eleição para <strong>Presidente da República</strong> · ' + esc(D.turno) + ' · ' + esc(D.data) + '.</p><ul class="cola-lista">';
    D.candidatos.forEach(function (c) {
      h += '<li><img src="' + esc(c.foto) + '" alt="Foto de ' + esc(c.nomeCompleto) + '"><span class="cola-num">' + esc(c.numero) + '</span>' +
        '<span class="cola-nome">' + esc(c.nome) + '<small>' + esc(c.partido) + (c.vice ? ' · Vice: ' + esc(c.vice.nome) + ' (' + esc(c.vice.partido) + ')' : '') + '</small></span></li>';
    });
    h += '</ul>';
    el.conteudoCola.innerHTML = h;
  }

  function montarResumo() {
    var v = estado.voto;
    var desc = '—';
    if (v && v.tipo === 'nominal') {
      desc = '<b>' + esc(v.numero) + '</b> ' + esc(v.candidato.nome) + ' <small>' + esc(v.candidato.partido) +
        (v.candidato.vice ? ' · Vice: ' + esc(v.candidato.vice.nome) : '') + '</small>';
    } else if (v && v.tipo === 'branco') desc = 'Voto em branco';
    else if (v) desc = 'Voto nulo <small>(' + esc(v.numero) + ')</small>';
    el.conteudoResumo.innerHTML = '<p class="resumo-voto"><span class="resumo-cargo">' + esc(CARGO.titulo) +
      ' · ' + esc(D.turno) + '</span>' + desc + '</p>';
  }

  function abrir(dlg) {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function fechar(dlg) {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function algumDialogoAberto() {
    return el.dlgCola.open || el.dlgResumo.open;
  }

  /* ---------- braille em relevo ---------- */

  // Pontos (1 a 6) de cada letra; números usam o sinal de número (⠼) + letras a–j
  var BRAILLE = {
    '#': [3, 4, 5, 6],
    a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
    m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], r: [1, 2, 3, 5]
  };
  var DIGITO_LETRA = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h', 9: 'i', 0: 'j' };
  var POS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2] };

  // Medidas do padrão braille: 2,5 mm entre pontos e 6 mm entre celas
  var PONTO = 2.5, CELA = 6, RAIO = 0.75, MARGEM = 1;

  function svgBraille(texto) {
    var celas = texto.split('').map(function (ch) { return BRAILLE[DIGITO_LETRA[ch] || ch] || []; });
    var larg = (celas.length - 1) * CELA + PONTO + 2 * MARGEM;
    var alt = 2 * PONTO + 2 * MARGEM;
    var h = '<svg viewBox="0 0 ' + larg.toFixed(1) + ' ' + alt.toFixed(1) + '" aria-hidden="true">';
    celas.forEach(function (pontos, i) {
      pontos.forEach(function (p) {
        var x = MARGEM + i * CELA + POS[p][0] * PONTO;
        var y = MARGEM + POS[p][1] * PONTO;
        h += '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + RAIO + '"/>';
      });
    });
    return h + '</svg>';
  }

  document.querySelectorAll('[data-braille]').forEach(function (span) {
    span.innerHTML = svgBraille(span.getAttribute('data-braille'));
  });

  /* ---------- eventos ---------- */

  document.querySelectorAll('.tecla').forEach(function (b) {
    b.addEventListener('click', function () {
      pressionar(b.getAttribute('data-tecla'));
    });
    // Evita que o foco fique preso no botão depois de um toque/clique
    b.addEventListener('pointerup', function () { setTimeout(function () { b.blur(); }, 0); });
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (algumDialogoAberto()) return;
    // Enter/Espaço num botão focado (navegação por Tab) acionam o próprio botão
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('button')) return;

    var tecla = null;
    if (/^\d$/.test(ev.key)) tecla = ev.key;
    else if (ev.key === 'Enter') tecla = 'confirma';
    else if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === 'Escape') tecla = 'corrige';
    else if (ev.key === 'b' || ev.key === 'B') tecla = 'branco';
    if (!tecla) return;

    ev.preventDefault();
    if (ev.repeat) return;
    animarTecla(tecla);
    pressionar(tecla);
  });

  el.btnCola.addEventListener('click', function () { montarCola(); abrir(el.dlgCola); });
  el.btnResumo.addEventListener('click', function () { montarResumo(); abrir(el.dlgResumo); });
  el.btnNova.addEventListener('click', iniciar);

  document.querySelectorAll('[data-fechar]').forEach(function (b) {
    b.addEventListener('click', function () { fechar(b.closest('dialog')); });
  });
  document.querySelectorAll('[data-nova]').forEach(function (b) {
    b.addEventListener('click', function () { fechar(b.closest('dialog')); iniciar(); });
  });
  [el.dlgCola, el.dlgResumo].forEach(function (dlg) {
    // clique fora do papel fecha o diálogo
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) fechar(dlg); });
  });

  function atualizarBotaoSom() {
    el.btnSom.setAttribute('aria-pressed', String(Som.ligado));
    el.btnSom.querySelector('.rotulo-som').textContent = Som.ligado ? 'Som ligado' : 'Som desligado';
  }
  el.btnSom.addEventListener('click', function () {
    Som.alternar();
    atualizarBotaoSom();
    if (Som.ligado) { Som.preparar(); Som.tecla(); }
  });

  var brasao = G.brasaoUri();
  document.querySelectorAll('img[data-brasao]').forEach(function (img) { img.src = brasao; });

  atualizarBotaoSom();
  iniciar();
})();
