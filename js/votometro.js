/*
 * Votômetro: mostra quantos votos cada candidato recebeu nas simulações
 * feitas NESTE aparelho (fica salvo só no navegador; nada é enviado).
 *
 * Não junta votos de outras pessoas de propósito: divulgar enquete sobre a
 * eleição é proibido durante o período eleitoral (Resolução TSE 23.600/2019).
 */
(function () {
  'use strict';

  var D = window.DADOS_ELEICAO;
  var CHAVE = 'urna-votometro-2turno-2026';
  var DURACAO = 500; // ms da contagem animada

  var el = {
    lista: document.getElementById('vm-lista'),
    branco: document.getElementById('vm-branco'),
    nulo: document.getElementById('vm-nulo'),
    total: document.getElementById('vm-total'),
    zerar: document.getElementById('vm-zerar')
  };

  function inteiro(v) {
    v = Number(v);
    return isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  function normalizar(bruto) {
    var c = { branco: inteiro(bruto.branco), nulo: inteiro(bruto.nulo) };
    D.candidatos.forEach(function (cand) { c[cand.numero] = inteiro(bruto[cand.numero]); });
    return c;
  }

  function carregar() {
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}');
      if (salvo && typeof salvo === 'object') return normalizar(salvo);
    } catch (e) { /* armazenamento indisponível ou corrompido */ }
    return normalizar({});
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(contagem)); } catch (e) { /* ignora */ }
  }

  var contagem = carregar();

  function total() {
    return Object.keys(contagem).reduce(function (s, k) { return s + contagem[k]; }, 0);
  }

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Candidatos em ordem numérica, todos com o mesmo destaque
  function montar() {
    el.lista.innerHTML = D.candidatos.map(function (c) {
      return '<li class="vm-item" data-chave="' + esc(c.numero) + '">' +
        '<img src="' + esc(c.foto) + '" alt="">' +
        '<div class="vm-linha"><span class="vm-num">' + esc(c.numero) + '</span>' +
        '<span class="vm-nome">' + esc(c.nome) + '</span>' +
        '<b class="vm-qtd">0</b></div>' +
        '<div class="vm-barra" aria-hidden="true"><i></i></div></li>';
    }).join('');
  }

  function animarNumero(alvo, de, para) {
    if (de === para || !window.requestAnimationFrame) { alvo.textContent = String(para); return; }
    var inicio = null;
    function passo(t) {
      if (inicio === null) inicio = t;
      var p = Math.min(1, (t - inicio) / DURACAO);
      alvo.textContent = String(Math.round(de + (para - de) * p));
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  function atualizar(destaque, antes) {
    var t = total();
    D.candidatos.forEach(function (c) {
      var item = el.lista.querySelector('[data-chave="' + c.numero + '"]');
      if (!item) return;
      var qtd = item.querySelector('.vm-qtd');
      var n = contagem[c.numero];
      if (destaque === c.numero) animarNumero(qtd, antes, n);
      else qtd.textContent = String(n);
      item.querySelector('.vm-barra i').style.width = (t ? (n / t) * 100 : 0) + '%';
      item.setAttribute('aria-label', c.numero + ' ' + c.nome + ': ' + n + (n === 1 ? ' voto' : ' votos'));
    });
    el.branco.textContent = String(contagem.branco);
    el.nulo.textContent = String(contagem.nulo);
    el.total.textContent = String(t);

    if (destaque) {
      var alvo = el.lista.querySelector('[data-chave="' + destaque + '"]') ||
        (el[destaque] && el[destaque].parentNode);
      if (alvo) {
        alvo.classList.remove('vm-subiu');
        void alvo.offsetWidth; // reinicia a animação
        alvo.classList.add('vm-subiu');
      }
    }
  }

  el.zerar.addEventListener('click', function () {
    if (!total()) return;
    if (!window.confirm('Zerar o votômetro deste aparelho?')) return;
    contagem = normalizar({});
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
      if (!(chave in contagem)) return;
      var antes = contagem[chave];
      contagem[chave] = antes + 1;
      salvar();
      atualizar(chave, antes);
    },
    contagem: function () { return JSON.parse(JSON.stringify(contagem)); }
  };
})();
