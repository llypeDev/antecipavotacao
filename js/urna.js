/*
 * Lógica da urna (voto para Presidente, 2º turno): estados, telas e teclado.
 * A urna é a foto real (img/urna.webp); as telas seguem o padrão da urna real
 * e são desenhadas por cima do vidro, com a mesma perspectiva da foto.
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

  function caixas() {
    var h = '';
    for (var k = 0; k < CARGO.digitos; k++) {
      var d = estado.digitos[k];
      var atual = !estado.aviso && k === estado.digitos.length;
      h += '<span class="caixa' + (atual ? ' atual' : '') + '">' + (d ? esc(d) : '') + '</span>';
    }
    return '<div class="tv-caixas">' + h + '</div>';
  }

  function linha(classe, rotulo, valor) {
    return '<div class="tv-linha ' + classe + '">' + esc(rotulo) + ':<b>' + esc(valor) + '</b></div>';
  }

  var RODAPE = '<div class="tv-separador"></div><div class="tv-confira">Confira seu voto</div>';

  function telaVotacao(r) {
    // Enquanto digita (ou no aviso do BRANCO): só o cargo e as caixas grandes
    if (!r.pronto || estado.aviso) {
      var h = '<div class="tv">' +
        '<div class="tv-cargo">' + esc(CARGO.titulo) + '</div>' + caixas();
      if (estado.aviso === 'branco-com-numero') {
        h += '<div class="tv-aviso">Para votar em BRANCO o campo de voto deve estar vazio.<br>' +
          'Aperte CORRIGE para apagar o campo de voto.</div>';
      }
      return h + '</div>';
    }

    var p = '<div class="tv tv-pronto">' +
      '<div class="tv-seu-voto">SEU VOTO PARA</div>' +
      '<div class="tv-cargo">' + esc(CARGO.titulo) + '</div>';

    if (r.tipo === 'branco') {
      p += '<div class="tv-grande tv-branco pisca">VOTO EM BRANCO</div>';
    } else {
      p += '<div class="tv-numero">Número:</div>' + caixas();
      if (r.tipo === 'nominal') {
        var c = r.candidato;
        p += linha('tv-linha-nome', 'Nome', c.nome) +
          linha('tv-linha-partido', 'Partido', c.partido) +
          (c.vice ? linha('tv-linha-vice', CARGO.tituloVice, c.vice.nome) : '');
        p += '<figure class="tv-foto tv-foto-titular"><img src="' + esc(c.foto) + '" alt=""></figure>';
        if (c.vice) p += '<figure class="tv-foto tv-foto-vice"><img src="' + esc(c.vice.foto) + '" alt=""></figure>';
      } else {
        p += '<div class="tv-numero-errado">NÚMERO ERRADO</div>' +
          '<div class="tv-grande tv-nulo pisca">VOTO NULO</div>';
      }
    }
    return p + RODAPE + '</div>';
  }

  function telaFim() {
    return '<div class="tv"><div class="tv-fim">FIM</div><div class="tv-votou">VOTOU</div></div>';
  }

  function render() {
    var texto;
    if (estado.fase === 'fim') {
      el.tela.innerHTML = telaFim();
      texto = 'FIM. Votou.';
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
    if (r.tipo === 'branco') return base + 'Voto em branco. Confira seu voto e aperte CONFIRMA.';
    var num = estado.digitos ? 'Número ' + estado.digitos.split('').join(' ') + '. ' : 'Digite ' + CARGO.digitos + ' números. ';
    if (r.tipo === 'nominal') {
      var c = r.candidato;
      return base + num + c.nome + ', ' + c.partido + (c.vice ? '. ' + CARGO.tituloVice + ': ' + c.vice.nome : '') +
        '. Confira seu voto e aperte CONFIRMA.';
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

  // Mantém a tecla afundada por pelo menos ~110 ms (toques rápidos no celular)
  function afundar(b) {
    clearTimeout(b._soltar);
    b._desde = Date.now();
    b.classList.add('pressionada');
  }

  function soltar(b) {
    var falta = Math.max(0, 110 - (Date.now() - (b._desde || 0)));
    clearTimeout(b._soltar);
    b._soltar = setTimeout(function () { b.classList.remove('pressionada'); }, falta);
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

  /* ---------- escala da foto da urna ---------- */

  // Cada parte mostra uma janela da foto; a escala é largura exibida / largura da janela
  var partes = document.querySelectorAll('.urna-parte');

  function ajustarEscala() {
    Array.prototype.forEach.call(partes, function (parte) {
      var jw = parseFloat(getComputedStyle(parte).getPropertyValue('--jw'));
      if (jw > 0) parte.style.setProperty('--s', String(parte.clientWidth / jw));
    });
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(ajustarEscala);
    Array.prototype.forEach.call(partes, function (p) { ro.observe(p); });
  } else {
    window.addEventListener('resize', ajustarEscala);
  }
  ajustarEscala();

  /* ---------- eventos ---------- */

  document.querySelectorAll('.tecla').forEach(function (b) {
    b.addEventListener('click', function () {
      pressionar(b.getAttribute('data-tecla'));
    });
    b.addEventListener('pointerdown', function () { afundar(b); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (tipo) {
      b.addEventListener(tipo, function () { soltar(b); });
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
    var b = document.querySelector('.tecla[data-tecla="' + tecla + '"]');
    if (b) { afundar(b); soltar(b); }
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

  // Brasão impresso na parede da cabina
  var brasao = G.brasaoUri();
  document.querySelectorAll('img[data-brasao]').forEach(function (img) { img.src = brasao; });

  atualizarBotaoSom();
  iniciar();
})();
