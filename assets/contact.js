/* Formulário de contato — validação, envio por e-mail (FormSubmit), estados de erro e acessibilidade */
(function () {
  'use strict';

  var ENDPOINT = 'https://formsubmit.co/ajax/anapaula.devcode@gmail.com';
  var MAIL = 'anapaula.devcode@gmail.com';
  var TIMEOUT_MS = 15000;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var form = document.getElementById('contact-form');
  if (!form) return;

  // Sem JavaScript, a validação nativa do navegador continua valendo; com JS usamos as mensagens abaixo.
  form.noValidate = true;

  var btn = document.getElementById('submit-btn');
  var btnLabel = btn.querySelector('.btn__label');
  var btnIcon = btn.querySelector('svg');
  var banner = document.getElementById('form-error');
  var success = document.getElementById('form-success');
  var anotherBtn = document.getElementById('send-another');
  var sending = false;
  var idleLabel = btnLabel.innerHTML;

  var rules = {
    name: {
      input: document.getElementById('f-name'),
      error: document.getElementById('err-name'),
      check: function (v) {
        v = v.trim();
        if (!v) return 'Informe seu nome completo.';
        if (v.length < 2 || !/[A-Za-zÀ-ÿ]/.test(v)) return 'Digite um nome válido.';
        return '';
      }
    },
    email: {
      input: document.getElementById('f-email'),
      error: document.getElementById('err-email'),
      check: function (v) {
        v = v.trim();
        if (!v) return 'Informe seu e-mail para que eu possa responder.';
        if (!EMAIL_RE.test(v)) return 'Esse e-mail parece incompleto. Exemplo: nome@empresa.com.br';
        return '';
      }
    },
    type: {
      input: document.getElementById('f-type'),
      error: document.getElementById('err-type'),
      check: function (v) { return v ? '' : 'Escolha o tipo de projeto ou demanda.'; }
    },
    message: {
      input: document.getElementById('f-message'),
      error: document.getElementById('err-message'),
      check: function (v) {
        v = v.trim();
        if (!v) return 'Conte um pouco sobre sua necessidade.';
        if (v.length < 10) return 'Escreva pelo menos algumas palavras (mínimo de 10 caracteres).';
        return '';
      }
    }
  };
  var order = ['name', 'email', 'type', 'message'];

  function setError(key, msg) {
    var r = rules[key];
    var wrap = r.input.closest('.field');
    if (msg) {
      r.error.innerHTML = '<svg aria-hidden="true"><use href="#i-alert"/></svg><span></span>';
      r.error.lastChild.textContent = msg;
      r.error.hidden = false;
      r.input.setAttribute('aria-invalid', 'true');
      wrap.classList.add('field--error');
    } else {
      r.error.hidden = true;
      r.error.textContent = '';
      r.input.removeAttribute('aria-invalid');
      wrap.classList.remove('field--error');
    }
    return !msg;
  }

  function validate(key) { return setError(key, rules[key].check(rules[key].input.value)); }

  // Valida ao sair do campo e revalida enquanto corrige
  order.forEach(function (key) {
    var el = rules[key].input;
    el.addEventListener('blur', function () { if (el.value !== '' || el.dataset.touched) validate(key); el.dataset.touched = '1'; });
    el.addEventListener(key === 'type' ? 'change' : 'input', function () {
      if (el.getAttribute('aria-invalid') === 'true') validate(key);
    });
  });

  function showBanner(html) {
    banner.innerHTML = html;
    banner.hidden = false;
  }
  function hideBanner() { banner.hidden = true; banner.innerHTML = ''; }

  function setSending(on) {
    sending = on;
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) {
      btnLabel.textContent = 'Enviando…';
      btnIcon.outerHTML = '<span class="spinner" aria-hidden="true"></span>';
      btnIcon = btn.querySelector('.spinner');
    } else {
      btnLabel.innerHTML = idleLabel;
      if (btnIcon && btnIcon.classList.contains('spinner')) {
        btnIcon.outerHTML = '<svg aria-hidden="true"><use href="#i-send"/></svg>';
        btnIcon = btn.querySelector('svg');
      }
    }
  }

  function mailtoFallback() {
    var body = 'Nome: ' + rules.name.input.value.trim() +
      '\nE-mail: ' + rules.email.input.value.trim() +
      '\nTipo: ' + rules.type.input.value +
      '\n\n' + rules.message.input.value.trim();
    return 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Contato pelo site — ' + rules.type.input.value) +
      '&body=' + encodeURIComponent(body.slice(0, 1500));
  }

  function failure(reason) {
    var tip = reason === 'offline'
      ? 'Parece que você está sem conexão com a internet.'
      : 'Não foi possível enviar agora.';
    showBanner('<strong><svg aria-hidden="true"><use href="#i-alert"/></svg>Mensagem não enviada</strong>' +
      tip + ' Tente novamente em instantes ou <a href="' + mailtoFallback() + '">envie pelo seu aplicativo de e-mail</a>.');
    banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    hideBanner();

    // Campo-isca preenchido = robô: finge sucesso e não envia nada.
    var honey = form.elements['_honey'];
    if (honey && honey.value) { showSuccess(); return; }

    var firstInvalid = null;
    order.forEach(function (key) {
      if (!validate(key) && !firstInvalid) firstInvalid = rules[key].input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    if (navigator.onLine === false) { failure('offline'); return; }

    setSending(true);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          var ok = res.ok && data.success !== false && data.success !== 'false';
          if (!ok) throw new Error('send-failed');
        });
      })
      .then(showSuccess)
      .catch(function () { failure(); })
      .then(function () { clearTimeout(timer); setSending(false); });
  });

  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    success.focus();
    form.reset();
    order.forEach(function (key) { setError(key, ''); delete rules[key].input.dataset.touched; });
  }

  anotherBtn.addEventListener('click', function () {
    success.hidden = true;
    form.hidden = false;
    document.getElementById('f-name').focus();
  });

  // Copiar e-mail
  var copyBtn = document.getElementById('copy-btn');
  var copyStatus = document.getElementById('copy-status');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-email');
      var done = function (ok) {
        copyStatus.textContent = ok ? 'E-mail copiado.' : 'Não foi possível copiar. Selecione o e-mail e copie manualmente.';
        if (!ok) return;
        copyBtn.dataset.copied = 'true';
        copyBtn.innerHTML = '<svg aria-hidden="true"><use href="#i-check"/></svg>';
        setTimeout(function () {
          copyBtn.dataset.copied = 'false';
          copyBtn.innerHTML = '<svg aria-hidden="true"><use href="#i-copy"/></svg>';
          copyStatus.textContent = '';
        }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
      } else {
        done(legacyCopy(text));
      }
    });
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'hp';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
})();
