/*
 * Lógica da urna: estados da votação, desenho da tela e teclado.
 */
(function () {
  'use strict';

  var D = window.DADOS_ELEICAO;
  var Som = window.SomUrna;
  var G = window.GraficosUrna;

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
    etapas: [],
    i: 0,
    digitos: '',
    branco: false,
    aviso: null,
    votos: [],
    fase: 'votando' // votando | gravando | fim
  };

  /* ---------- dados ---------- */

  function montarEtapas(turno) {
    return D.turnos[turno].map(function (t) {
      var cargo = D.cargos[t.cargo];
      var lista = cargo.candidatos.filter(function (c) {
        return !t.somente || t.somente.indexOf(c.numero) !== -1;
      });
      var mapa = {};
      lista.forEach(function (c) { mapa[c.numero] = c; });
      return {
        id: t.cargo,
        cargo: cargo,
        vaga: t.vaga || null,
        titulo: cargo.titulo,
        digitos: cargo.digitos,
        proporcional: !!cargo.proporcional,
        candidatos: lista,
        mapa: mapa
      };
    });
  }

  function partidoDe(numero) {
    return numero.length >= 2 ? D.partidos[numero.slice(0, 2)] || null : null;
  }

  function etapaAtual() {
    return estado.etapas[estado.i];
  }

  function nomeVaga(etapa) {
    return etapa.vaga ? etapa.vaga + 'ª vaga' : '';
  }

  function nomesVice(etapa, cand) {
    var rotulos = etapa.cargo.rotulosVice || [];
    if (cand.suplentes) {
      return cand.suplentes.map(function (n, k) { return { rotulo: rotulos[k] || 'Suplente', nome: n }; });
    }
    if (cand.vice) return [{ rotulo: rotulos[0] || 'Vice', nome: cand.vice.nome, dados: cand.vice }];
    return [];
  }

  /*
   * Interpreta o que está digitado na etapa atual.
   * "pronto" indica que a tecla CONFIRMA registra o voto.
   */
  function analisar(etapa) {
    var dig = estado.digitos;
    if (estado.branco) return { tipo: 'branco', pronto: true };

    if (dig.length < etapa.digitos) {
      if (etapa.proporcional && dig.length >= 2) {
        var p = partidoDe(dig);
        // Só os 2 dígitos do partido + CONFIRMA = voto de legenda
        if (p) return { tipo: 'parcial', partido: p, pronto: dig.length === 2 };
      }
      return { tipo: 'digitando', pronto: false };
    }

    if (etapa.vaga === 2) {
      var primeira = estado.votos.filter(function (v) {
        return v.cargoId === etapa.id && v.vaga === 1;
      })[0];
      // Mesmo candidato nas duas vagas: o segundo voto é anulado
      if (primeira && primeira.numero === dig && primeira.tipo === 'nominal') {
        return { tipo: 'repetido', pronto: true };
      }
    }

    var cand = etapa.mapa[dig];
    if (cand) return { tipo: 'nominal', candidato: cand, partido: partidoDe(dig), pronto: true };

    if (etapa.proporcional) {
      var p2 = partidoDe(dig);
      if (p2) return { tipo: 'legenda', partido: p2, pronto: true };
    }
    return { tipo: 'nulo', pronto: true };
  }

  /* ---------- tela ---------- */

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function caixas(etapa, mostrarCursor) {
    var h = '';
    for (var k = 0; k < etapa.digitos; k++) {
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

  function telaVotacao() {
    var etapa = etapaAtual();
    var r = analisar(etapa);
    var aviso = estado.aviso;

    var h = '<div class="tv">';
    h += '<div class="tv-corpo"><div class="tv-esq">';
    h += '<div class="tv-seu-voto"' + (r.pronto && r.tipo !== 'parcial' ? '' : ' style="visibility:hidden"') + '>SEU VOTO PARA</div>';
    h += '<div class="tv-cargo">' + esc(etapa.titulo) +
      (etapa.vaga ? '<span class="tv-vaga">' + esc(nomeVaga(etapa)) + '</span>' : '') + '</div>';

    if (r.tipo !== 'branco') {
      h += '<div class="tv-numero"><span class="tv-rotulo">Número:</span><span class="tv-caixas">' +
        caixas(etapa, !aviso && estado.digitos.length < etapa.digitos) + '</span></div>';
    }

    if (r.tipo === 'nominal') {
      h += '<div class="tv-dados">';
      h += linha('Nome', r.candidato.nome);
      h += linha('Partido', r.partido ? r.partido.sigla : '');
      nomesVice(etapa, r.candidato).forEach(function (v) { h += linha(v.rotulo, v.nome); });
      h += '</div>';
    } else if ((r.tipo === 'parcial' || r.tipo === 'legenda') && !aviso) {
      h += '<div class="tv-dados">' + linha('Partido', r.partido.sigla + ' – ' + r.partido.nome) + '</div>';
    }
    h += '</div>';

    // fotos
    h += '<div class="tv-dir">';
    if (r.tipo === 'nominal') {
      var c = r.candidato;
      h += foto(G.foto(c.nome, c), etapa.titulo, 'tv-foto-titular');
      if (c.vice && etapa.cargo.fotoVice) {
        h += foto(G.foto(c.vice.nome, c.vice), (etapa.cargo.rotulosVice || ['Vice'])[0], 'tv-foto-vice');
      }
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
    } else if (r.tipo === 'repetido') {
      h += '<div class="tv-msg-media">CANDIDATO JÁ ESCOLHIDO NA 1ª VAGA</div><div class="tv-msg-grande pisca">VOTO NULO</div>';
    } else if (r.tipo === 'legenda') {
      h += '<div class="tv-msg-media">NÚMERO ERRADO</div><div class="tv-msg-grande pisca">VOTO DE LEGENDA</div>';
    } else if (r.tipo === 'parcial' && r.pronto) {
      h += '<div class="tv-msg-media">VOTO DE LEGENDA</div>';
    }
    h += '</div>';

    // instruções do rodapé
    var mostraRodape = r.pronto && !aviso;
    h += '<div class="tv-rodape"' + (mostraRodape ? '' : ' style="visibility:hidden"') + '>' +
      '<div>Aperte a tecla:</div>' +
      '<div class="tv-rod-linha"><b>VERDE</b> para CONFIRMAR este voto</div>' +
      '<div class="tv-rod-linha"><b>LARANJA</b> para REINICIAR este voto</div></div>';

    h += '</div>';
    return { html: h, r: r };
  }

  function render() {
    var texto = '';
    if (estado.fase === 'fim') {
      el.tela.innerHTML = '<div class="tv-fim">FIM</div>';
      texto = 'FIM. Votação concluída.';
    } else if (estado.fase === 'gravando') {
      el.tela.innerHTML = '<div class="tv-gravando"><div class="tv-barra"><span style="animation-duration:' +
        TEMPO_GRAVANDO + 'ms"></span></div></div>';
      texto = 'Gravando o voto.';
    } else {
      var t = telaVotacao();
      el.tela.innerHTML = t.html;
      texto = descrever(t.r);
    }
    el.anuncio.textContent = texto;
    el.btnNova.hidden = estado.fase !== 'fim';
    el.btnResumo.hidden = estado.fase !== 'fim';
  }

  // Texto para leitores de tela
  function descrever(r) {
    var etapa = etapaAtual();
    var base = etapa.titulo + (etapa.vaga ? ', ' + nomeVaga(etapa) : '') + '. ';
    if (estado.aviso === 'branco-com-numero') return base + 'Para votar em branco o campo de voto deve estar vazio. Aperte CORRIGE.';
    if (r.tipo === 'branco') return base + 'Voto em branco. Aperte CONFIRMA.';
    var num = estado.digitos ? 'Número ' + estado.digitos.split('').join(' ') + '. ' : 'Digite ' + etapa.digitos + ' números. ';
    if (r.tipo === 'nominal') return base + num + r.candidato.nome + ', ' + (r.partido ? r.partido.sigla : '') + '. Aperte CONFIRMA.';
    if (r.tipo === 'nulo') return base + num + 'Número errado. Voto nulo.';
    if (r.tipo === 'repetido') return base + num + 'Candidato já escolhido na 1ª vaga. Voto nulo.';
    if (r.tipo === 'legenda') return base + num + 'Número errado. Voto de legenda para ' + r.partido.sigla + '.';
    if (r.tipo === 'parcial') return base + num + 'Partido ' + r.partido.sigla + '.' + (r.pronto ? ' Voto de legenda.' : '');
    return base + num;
  }

  /* ---------- ações das teclas ---------- */

  function digito(d) {
    if (estado.fase !== 'votando' || estado.branco || estado.aviso) return;
    var etapa = etapaAtual();
    if (estado.digitos.length >= etapa.digitos) return;
    estado.digitos += d;
    render();
  }

  function branco() {
    if (estado.fase !== 'votando') return;
    if (estado.digitos.length > 0) {
      estado.aviso = 'branco-com-numero';
    } else {
      estado.branco = true;
    }
    render();
  }

  function corrige() {
    if (estado.fase !== 'votando') return;
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    render();
  }

  // Retorna true quando o voto foi registrado (a confirmação tem som próprio).
  function confirma() {
    if (estado.fase !== 'votando' || estado.aviso) return false;
    var etapa = etapaAtual();
    var r = analisar(etapa);
    if (!r.pronto) return false;

    var voto = { cargoId: etapa.id, titulo: etapa.titulo, vaga: etapa.vaga, numero: estado.digitos };
    if (r.tipo === 'branco') voto.tipo = 'branco';
    else if (r.tipo === 'nominal') { voto.tipo = 'nominal'; voto.candidato = r.candidato; voto.partido = r.partido; }
    else if (r.tipo === 'parcial' || r.tipo === 'legenda') { voto.tipo = 'legenda'; voto.partido = r.partido; }
    else { voto.tipo = 'nulo'; voto.repetido = r.tipo === 'repetido'; }
    estado.votos.push(voto);

    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;

    if (estado.i < estado.etapas.length - 1) {
      estado.i++;
      Som.confirma();
      render();
      return true;
    }

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
    return false;
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

  /* ---------- nova votação / turno ---------- */

  function iniciar(turno) {
    estado.turno = turno || estado.turno;
    estado.etapas = montarEtapas(estado.turno);
    estado.i = 0;
    estado.digitos = '';
    estado.branco = false;
    estado.aviso = null;
    estado.votos = [];
    estado.fase = 'votando';

    var info = D.turnosInfo[estado.turno];
    if (el.dataTurno && info) el.dataTurno.textContent = info.nome + ' · ' + info.data;
    Array.prototype.forEach.call(el.botoesTurno, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-turno')) === estado.turno));
    });
    try { history.replaceState(null, '', estado.turno === 2 ? '#2turno' : location.pathname + location.search); } catch (e) { /* ignora */ }
    render();
  }

  /* ---------- cola (lista de candidatos) ---------- */

  function montarCola() {
    var etapas = montarEtapas(estado.turno);
    var vistos = {};
    var h = '<p class="cola-intro">Partidos e candidatos <strong>fictícios</strong>, só para treinar. ' +
      'Ordem de votação do ' + esc(D.turnosInfo[estado.turno].nome) + ':</p>';
    h += '<ol class="cola-ordem">' + etapas.map(function (e) {
      return '<li>' + esc(e.titulo) + (e.vaga ? ' (' + esc(nomeVaga(e)) + ')' : '') + ' <small>' + e.digitos + ' dígitos</small></li>';
    }).join('') + '</ol>';

    etapas.forEach(function (e) {
      if (vistos[e.id]) return;
      vistos[e.id] = true;
      h += '<section class="cola-cargo"><h3>' + esc(e.titulo) + (e.cargo.proporcional ? ' <small>ou só os 2 dígitos do partido (legenda)</small>' : '') +
        (e.id === 'senador' && estado.turno === 1 ? ' <small>escolha dois diferentes</small>' : '') + '</h3><ul>';
      e.candidatos.forEach(function (c) {
        var p = partidoDe(c.numero);
        var extras = nomesVice(e, c).map(function (v) { return esc(v.rotulo) + ': ' + esc(v.nome); }).join(' · ');
        h += '<li><img src="' + G.foto(c.nome, c) + '" alt=""><span class="cola-num">' + esc(c.numero) + '</span>' +
          '<span class="cola-nome">' + esc(c.nome) + '<small>' + (p ? esc(p.sigla) : '') + (extras ? ' · ' + extras : '') + '</small></span></li>';
      });
      h += '</ul></section>';
    });

    h += '<section class="cola-cargo"><h3>Partidos</h3><ul class="cola-partidos">';
    Object.keys(D.partidos).forEach(function (n) {
      h += '<li><span class="cola-num">' + esc(n) + '</span><span class="cola-nome">' + esc(D.partidos[n].sigla) + '<small>' + esc(D.partidos[n].nome) + '</small></span></li>';
    });
    h += '</ul></section>';
    el.conteudoCola.innerHTML = h;
  }

  function montarResumo() {
    var h = '<ol class="resumo-lista">';
    estado.votos.forEach(function (v) {
      var desc;
      if (v.tipo === 'nominal') desc = '<b>' + esc(v.numero) + '</b> ' + esc(v.candidato.nome) + ' <small>' + esc(v.partido ? v.partido.sigla : '') + '</small>';
      else if (v.tipo === 'legenda') desc = 'Voto de legenda <small>' + esc(v.partido.sigla) + ' – ' + esc(v.partido.nome) + '</small>';
      else if (v.tipo === 'branco') desc = 'Voto em branco';
      else desc = 'Voto nulo' + (v.repetido ? ' <small>(candidato repetido)</small>' : v.numero ? ' <small>(' + esc(v.numero) + ')</small>' : '');
      h += '<li><span class="resumo-cargo">' + esc(v.titulo) + (v.vaga ? ' – ' + v.vaga + 'ª vaga' : '') + '</span><span class="resumo-voto">' + desc + '</span></li>';
    });
    h += '</ol>';
    el.conteudoResumo.innerHTML = h;
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
      if (t !== estado.turno || estado.votos.length || estado.digitos) iniciar(t);
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
