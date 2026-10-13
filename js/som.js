/*
 * Sons da urna.
 *
 *  - tecla(): toque mecânico da tecla (sintetizado com a Web Audio API,
 *             mesmo timbre usado pelo minhacolinha.com)
 *  - fim():   o "tirirí" da urna ao terminar a votação (som/urna-confirma.mp3,
 *             obtido do minhacolinha.com). Se o arquivo não puder ser tocado,
 *             o mesmo som é sintetizado: tom puro alternando 2204 Hz e 2307 Hz
 *             a cada ~95 ms, por 0,71 s.
 */
(function () {
  'use strict';

  var ARQUIVO_FIM = 'som/urna-confirma.mp3';

  var ctx = null;
  var ruido = null;
  var ligado = true;
  var audioFim = null;

  try {
    ligado = localStorage.getItem('urna-som') !== 'off';
  } catch (e) { /* armazenamento indisponível: som fica ligado */ }

  try {
    audioFim = new Audio(ARQUIVO_FIM);
    audioFim.preload = 'auto';
  } catch (e) { audioFim = null; }

  function contexto() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // Se o áudio falhar (navegador bloqueando, sem dispositivo), a urna segue sem som
      try {
        ctx = new AC();
        ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
        var dados = ruido.getChannelData(0);
        for (var i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; ruido = null; return null; }
    }
    if (ctx.state === 'suspended') {
      try { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); } catch (e) { /* ignora */ }
    }
    return ctx;
  }

  // "Toc" da tecla: grave curto + estalo de ruído filtrado
  function toque() {
    var t = ctx.currentTime;

    var osc = ctx.createOscillator();
    var ganho = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(0.22, t + 0.004);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

    var fonte = ctx.createBufferSource();
    fonte.buffer = ruido;
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1400;
    var ganhoRuido = ctx.createGain();
    ganhoRuido.gain.setValueAtTime(0.12, t);
    ganhoRuido.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    fonte.connect(filtro);
    filtro.connect(ganhoRuido);
    ganhoRuido.connect(ctx.destination);
    fonte.start(t);
    fonte.stop(t + 0.03);
  }

  // Reserva: reproduz o som da urna com os mesmos tons do arquivo
  function fimSintetizado() {
    // o som pode ter sido desligado enquanto o arquivo tentava tocar
    if (!ligado || !contexto()) return;
    var t = ctx.currentTime + 0.01;
    var passo = 0.095;
    var osc = ctx.createOscillator();
    var ganho = ctx.createGain();
    osc.type = 'sine';
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(0.2, t + 0.004);
    for (var i = 0; i < 8; i++) {
      osc.frequency.setValueAtTime(i % 2 === 0 ? 2204 : 2307, t + i * passo);
      if (i > 0) ganho.gain.setValueAtTime(i % 2 === 0 ? 0.2 : 0.14, t + i * passo);
    }
    ganho.gain.setValueAtTime(0.14, t + 0.7);
    ganho.gain.linearRampToValueAtTime(0, t + 0.715);
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.73);
  }

  window.SomUrna = {
    tecla: function () {
      if (!ligado || !contexto()) return;
      toque();
    },
    fim: function () {
      if (!ligado) return;
      if (!audioFim) { fimSintetizado(); return; }
      try {
        audioFim.currentTime = 0;
        var p = audioFim.play();
        if (p && typeof p.catch === 'function') p.catch(fimSintetizado);
      } catch (e) {
        fimSintetizado();
      }
    },
    // Chamado no primeiro toque para "destravar" o áudio no celular.
    preparar: function () {
      if (ligado) contexto();
    },
    get ligado() { return ligado; },
    alternar: function () {
      ligado = !ligado;
      try { localStorage.setItem('urna-som', ligado ? 'on' : 'off'); } catch (e) { /* ignora */ }
      if (!ligado && audioFim) { try { audioFim.pause(); } catch (e) { /* ignora */ } }
      return ligado;
    }
  };
})();
