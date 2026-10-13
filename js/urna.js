/*
 * Lógica da urna (voto para Presidente): estados, desenho da tela e teclado.
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
    conteudoResumo: $('#resumo-conteudo'),
    dataTurno: $('#data-turno'),
    botoesTurno: document.querySelectorAll('[data-turno]')
  };

  var TEMPO_GRAVANDO = 1500; // ms da barra de gravação antes do "FIM"

  var estado = {
    turno: 1,
    candidatos: [],
    digitos: '',
    branco: false,
    aviso: null,
    voto: null,
    fase: 'votando' // votando | gravando | fim
  };

  /* ---------- dados ---------- */

  function candidatosDoTurno(turno) {
    return D.candidatos.filter(function (c) {
      return turno !== 2 || D.segundoTurno.indexOf(c.numero) !== -1;
    });
  }

  function partidoDe(numero) {
    return D.partidos[numero] || null;
  }

  function buscar(numero) {
    return estado.candidatos.filter(function (c) { return c.numero === numero; })[0] || null;
  }

  /*
   * Interpreta o que está digitado.
   * "pronto" indica que a tecla CONFIRMA registra o voto.
   */
  function analisar() {
    if (estado.branco) return { tipo: 'branco', pronto: true };
    if (estado.digitos.length < CARGO.digitos) return { tipo: 'digitando', pronto: false };
    var cand = buscar(estado.digitos);
    if (cand) return { tipo: 'nominal', candidato: cand, partido: partidoDe(cand.numero), pronto: true };
    return { tipo: 'nulo', pronto: true };
  }

  /* ---------- tela ---------- */

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function caixas(mostrarCursor) {
    var h = '';
    for (var k = 0; k < CARGO.digitos; k++) {
      var d = estado.digitos[k];
      var atual = mostrarCursor && k === estado.digitos.length;
      h += '<span class="caixa' + (atual ? ' atual' : '') + '">' + (d ? esc(d) : '') + '</span>';
    }
    return h;
  }

  function linha(rotulo, valor) {
    return '<div class="tv-linha"><span class="tv-rotulo">' + esc(rotulo) + ':</span>' +
      '<span class="tv-valor">' + esc(valor) + '</span></div>';
  }

  function foto(src, legenda, classe) {
    return '<figure class="tv-foto ' + (classe || '') + '"><img src="' + src + '" alt=""><figcaption>' +
      esc(legenda) + '</figcaption></figure>';
  }

  function telaVotacao(r) {
    var aviso = estado.aviso;

    var h = '<div class="tv">';
    h += '<div class="tv-corpo"><div class="tv-esq">';
    h += '<div class="tv-seu-voto"' + (r.pronto ? '' : ' style="visibility:hidden"') + '>SEU VOTO PARA</div>';
    h += '<div class="tv-cargo">' + esc(CARGO.titulo) + '</div>';

    if (r.tipo !== 'branco') {
      h += '<div class="tv-numero"><span class="tv-rotulo">Número:</span><span class="tv-caixas">' +
        caixas(!aviso && estado.digitos.length < CARGO.digitos) + '</span></div>';
    }

    if (r.tipo === 'nominal') {
      h += '<div class="tv-dados">';
      h += linha('Nome', r.candidato.nome);
      h += linha('Partido', r.partido ? r.partido.sigla : '');
      if (r.candidato.vice) h += linha(CARGO.tituloVice, r.candidato.vice.nome);
      h += '</div>';
    }
    h += '</div>';

    // fotos do candidato e do vice
    h += '<div class="tv-dir">';
    if (r.tipo === 'nominal') {
      var c = r.candidato;
      h += foto(G.foto(c.nome, c), CARGO.titulo, 'tv-foto-titular');
      if (c.vice) h += foto(G.foto(c.vice.nome, c.vice), CARGO.tituloVice, 'tv-foto-vice');
    }
    h += '</div></div>';

    // mensagens centrais
    h += '<div class="tv-centro">';
    if (aviso === 'branco-com-numero') {
      h += '<div class="tv-msg-texto">Para votar em BRANCO o campo de voto deve estar vazio.<br>Aperte CORRIGE para apagar o campo de voto.</div>';
    } else if (r.tipo === 'branco') {
      h += '<div class="tv-msg-grande pisca">VOTO EM BRANCO</div>';
    } else if (r.tipo === 'nulo') {
      h += '<div class="tv-msg-media">NÚMERO ERRADO</div><div class="tv-msg-grande pisca">VOTO NULO</div>';
    }
    h += '</div>';

    // instruções do rodapé
    var mostraRodape = r.pronto && !aviso;
    h += '<div class="tv-rodape"' + (mostraRodape ? '' : ' style="visibility:hidden"') + '>' +
      '<div>Aperte a tecla:</div>' +
      '<div class="tv-rod-linha"><b>VERDE</b> para CONFIRMAR este voto</div>' +
      '<div class="tv-rod-linha"><b>LARANJA</b> para REINICIAR este voto</div></div>';

    h += '</div>';
    return h;
  }

  function render() {
    var texto;
    if (estado.fase === 'fim') {
      el.tela.innerHTML = '<div class="tv-fim">FIM</div>';
      texto = 'FIM. Votação concluída.';
    } else if (estado.fase === 'gravando') {
      el.tela.innerHTML = '<div class="tv-gravando"><div class="tv-barra"><span style="animation-duration:' +
        TEMPO_GRAVANDO + 'ms"></span></div></div>';
      texto = 'Gravando o voto.';
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
      return base + num + r.candidato.nome + ', ' + (r.partido ? r.partido.sigla : '') +
        (r.candidato.vice ? '. ' + CARGO.tituloVice + ': ' + r.candidato.vice.nome : '') + '. Aperte CONFIRMA.';
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
    if (estado.digitos.length > 0) {
      estado.aviso = 'branco-com-numero';
    } else {
      estado.branco = true;
    }
    render();
  }

  function corrige() {
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    render();
  }

  function confirma() {
    if (estado.aviso) return;
    var r = analisar();
    if (!r.pronto) return;

    estado.voto = { tipo: r.tipo, numero: estado.digitos, candidato: r.candidato || null, partido: r.partido || null };
    estado.fase = 'gravando';
    render();

    var turnoAtual = estado.turno;
    setTimeout(function () {
      // ignora se o eleitor trocou de turno enquanto gravava
      if (estado.fase !== 'gravando' || estado.turno !== turnoAtual) return;
      estado.fase = 'fim';
      Som.fim();
      render();
      vibrar([60, 40, 60, 40, 220]);
    }, TEMPO_GRAVANDO);
  }

  function vibrar(padrao) {
    if (navigator.vibrate) {
      try { navigator.vibrate(padrao); } catch (e) { /* ignora */ }
    }
  }

  function pressionar(tecla) {
    Som.preparar();
    // Depois do voto gravado as teclas ficam inativas, como na urna real
    if (estado.fase !== 'votando') return;
    vibrar(8);
    Som.tecla();
    if (/^\d$/.test(tecla)) digito(tecla);
    else if (tecla === 'branco') branco();
    else if (tecla === 'corrige') corrige();
    else if (tecla === 'confirma') confirma();
  }

  function animarTecla(tecla) {
    var b = document.querySelector('.tecla[data-tecla="' + tecla + '"]');
    if (!b) return;
    b.classList.add('pressionada');
    setTimeout(function () { b.classList.remove('pressionada'); }, 120);
  }

  /* ---------- nova votação / turno ---------- */

  function iniciar(turno) {
    estado.turno = turno || estado.turno;
    estado.candidatos = candidatosDoTurno(estado.turno);
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    estado.voto = null;
    estado.fase = 'votando';

    var info = D.turnosInfo[estado.turno];
    if (el.dataTurno && info) el.dataTurno.textContent = info.nome + ' · ' + info.data;
    Array.prototype.forEach.call(el.botoesTurno, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-turno')) === estado.turno));
    });
    try { history.replaceState(null, '', estado.turno === 2 ? '#2turno' : location.pathname + location.search); } catch (e) { /* ignora */ }
    render();
  }

  /* ---------- cola (lista de candidatos) e resumo ---------- */

  function montarCola() {
    var h = '<p class="cola-intro">Candidatos <strong>fictícios</strong> a ' + esc(CARGO.titulo) +
      ' no ' + esc(D.turnosInfo[estado.turno].nome) + ', só para treinar. Digite os ' + CARGO.digitos + ' números do candidato.</p>';
    h += '<section class="cola-cargo"><h3>' + esc(CARGO.titulo) + '</h3><ul>';
    estado.candidatos.forEach(function (c) {
      var p = partidoDe(c.numero);
      h += '<li><img src="' + G.foto(c.nome, c) + '" alt=""><span class="cola-num">' + esc(c.numero) + '</span>' +
        '<span class="cola-nome">' + esc(c.nome) + '<small>' + (p ? esc(p.sigla) : '') +
        (c.vice ? ' · Vice: ' + esc(c.vice.nome) : '') + '</small></span></li>';
    });
    h += '</ul></section>';
    el.conteudoCola.innerHTML = h;
  }

  function montarResumo() {
    var v = estado.voto;
    var desc = '';
    if (!v) desc = '—';
    else if (v.tipo === 'nominal') {
      desc = '<b>' + esc(v.numero) + '</b> ' + esc(v.candidato.nome) + ' <small>' + esc(v.partido ? v.partido.sigla : '') +
        (v.candidato.vice ? ' · Vice: ' + esc(v.candidato.vice.nome) : '') + '</small>';
    } else if (v.tipo === 'branco') desc = 'Voto em branco';
    else desc = 'Voto nulo <small>(' + esc(v.numero) + ')</small>';
    el.conteudoResumo.innerHTML = '<p class="resumo-voto"><span class="resumo-cargo">' + esc(CARGO.titulo) +
      ' · ' + esc(D.turnosInfo[estado.turno].nome) + '</span>' + desc + '</p>';
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
  el.btnNova.addEventListener('click', function () { iniciar(); });

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

  Array.prototype.forEach.call(el.botoesTurno, function (b) {
    b.addEventListener('click', function () {
      var t = Number(b.getAttribute('data-turno'));
      if (t !== estado.turno || estado.voto || estado.digitos || estado.branco) iniciar(t);
      if (el.dlgCola.open) montarCola();
    });
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

  // brasões
  var brasao = G.brasaoUri();
  document.querySelectorAll('img[data-brasao]').forEach(function (img) { img.src = brasao; });

  // Braille em relevo nas teclas, desenhado com pontos (não depende de fonte)
  document.querySelectorAll('.braille').forEach(function (span) {
    var bits = span.textContent.charCodeAt(0) - 0x2800;
    if (bits < 0 || bits > 0x3f) return;
    var pos = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]];
    var pontos = pos.map(function (p, k) {
      if (!(bits & (1 << k))) return '';
      return '<circle cx="' + (1 + p[0] * 2.2) + '" cy="' + (1 + p[1] * 2.2) + '" r=".82" fill="currentColor"/>';
    }).join('');
    span.innerHTML = '<svg viewBox="0 0 4.2 6.4" aria-hidden="true">' + pontos + '</svg>';
  });

  atualizarBotaoSom();
  iniciar(/2turno/.test(location.hash) ? 2 : 1);
})();
