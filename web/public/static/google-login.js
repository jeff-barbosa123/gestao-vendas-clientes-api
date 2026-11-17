// Login social: so mostra o botao se o backend tiver o Google configurado
// e traduz o retorno ?google_error=... do callback em mensagem amigavel.
(function () {
  var MESSAGES = {
    cancelled: 'Login com Google cancelado.',
    invalid_state: 'Sessao de login expirada. Tente novamente.',
    email_not_verified: 'O e-mail da sua conta Google nao esta verificado.',
    blocked: 'Este usuario esta bloqueado.',
    disabled: 'Login com Google indisponivel no momento.',
  };
  var FALLBACK = 'Nao foi possivel entrar com o Google. Tente novamente.';

  function showError(code) {
    var box = document.getElementById('login-error');
    var text = document.getElementById('login-error-text');
    if (!box || !text) return;
    text.textContent = MESSAGES[code] || FALLBACK;
    box.hidden = false;
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('google_error');
    if (code) {
      params.delete('google_error');
      var qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
      // app.js (modulo) reinicia o estado do formulario no carregamento: mostra o erro depois dele.
      var show = function () { showError(code); };
      if (document.readyState === 'complete') show();
      else window.addEventListener('load', function () { setTimeout(show, 0); });
    }

    var section = document.getElementById('social-login');
    var button = document.getElementById('google-login-btn');
    if (!section || !button) return;
    fetch('/api/auth/providers', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : { google: false }; })
      .then(function (data) { section.hidden = !(data && data.google); })
      .catch(function () { section.hidden = true; });
    button.addEventListener('click', function () { button.classList.add('is-loading'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
