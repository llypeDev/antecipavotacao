/*
 * Efeitos sonoros da urna, sintetizados com a Web Audio API
 * (nenhum arquivo de áudio é necessário).
 *
 *  - tecla(): "bip" curto de cada tecla pressionada
 *  - fim():   o famoso "pi-pi-pi-pi-pi-piiiii" do fim da votação
 *
 * Os parâmetros ficam em SOM para facilitar o ajuste fino.
 */
(function () {
  'use strict';

  var SOM = {
    frequencia: 1150,   // Hz do bip do alto-falante (buzzer) da urna
    volume: 0.16,
    bipTecla: 0.085,    // s
    curto: 0.055,       // s de cada bip da sequência
    intervalo: 0.035,   // s de silêncio entre os bips da sequência
    longo: 0.68         // s do bip final
  };

  var ctx = null;
  var saida = null;
  var ruido = null;
  var ligado = true;

  try {
    ligado = localStorage.getItem('urna-som') !== 'off';
  } catch (e) { /* armazenamento indisponível: som fica ligado */ }

  function contexto() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      var compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;

      saida = ctx.createGain();
      saida.gain.value = 1;
      saida.connect(compressor);
      compressor.connect(ctx.destination);

      // ruído branco curto, usado no "clique" mecânico da tecla
      ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
      var dados = ruido.getChannelData(0);
      for (var i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Um bip de onda quadrada filtrada, parecido com o buzzer da urna.
  function bip(inicio, duracao, volume) {
    var osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(SOM.frequencia, inicio);

    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 3600;
    filtro.Q.value = 0.7;

    var ganho = ctx.createGain();
    var v = volume == null ? SOM.volume : volume;
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.linearRampToValueAtTime(v, inicio + 0.004);
    ganho.gain.setValueAtTime(v, inicio + Math.max(duracao - 0.012, 0.005));
    ganho.gain.linearRampToValueAtTime(0.0001, inicio + duracao);

    osc.connect(filtro);
    filtro.connect(ganho);
    ganho.connect(saida);
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.03);
  }

  function clique(inicio) {
    var fonte = ctx.createBufferSource();
    fonte.buffer = ruido;
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 2400;
    filtro.Q.value = 1.4;
    var ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0.09, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.018);
    fonte.connect(filtro);
    filtro.connect(ganho);
    ganho.connect(saida);
    fonte.start(inicio);
    fonte.stop(inicio + 0.03);
  }

  function sequencia(qtdCurtos, duracaoFinal) {
    var t = ctx.currentTime + 0.01;
    for (var i = 0; i < qtdCurtos; i++) {
      bip(t, SOM.curto);
      t += SOM.curto + SOM.intervalo;
    }
    bip(t, duracaoFinal);
  }

  function tocar(fn) {
    if (!ligado) return;
    if (!contexto()) return;
    fn();
  }

  window.SomUrna = {
    tecla: function () {
      tocar(function () {
        var t = ctx.currentTime + 0.005;
        clique(t);
        bip(t, SOM.bipTecla);
      });
    },
    fim: function () {
      tocar(function () { sequencia(6, SOM.longo); });
    },
    // Chamado no primeiro toque para "destravar" o áudio no celular.
    preparar: function () {
      if (ligado) contexto();
    },
    get ligado() { return ligado; },
    alternar: function () {
      ligado = !ligado;
      try { localStorage.setItem('urna-som', ligado ? 'on' : 'off'); } catch (e) { /* ignora */ }
      return ligado;
    }
  };
})();
