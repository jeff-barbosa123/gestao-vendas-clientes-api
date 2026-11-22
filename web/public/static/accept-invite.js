(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const api = () => window.SGVC.api;

  function showError(text) {
    $('invite-error-text').textContent = text;
    $('invite-error').hidden = !text;
  }
  const errText = (e, fallback) => (e && e.message && e.message !== 'NETWORK_ERROR' ? e.message : fallback);

  async function load() {
    if (!token) {
      $('invite-summary').textContent = '';
      showError('Link de convite inválido.');
      return;
    }
    try {
      const info = await api().request('/api/auth/invitations/' + encodeURIComponent(token), { method: 'GET', skipAuth: true, messageFromServer: true });
      $('invite-summary').textContent = 'Você foi convidado(a) para ' + (info.companyName || 'uma empresa') + ' como ' + info.roleLabel + '.';
      $('invite-email-view').value = info.email;
      $('invite-form').hidden = false;
    } catch (e) {
      $('invite-summary').textContent = '';
      showError(errText(e, 'Convite inválido ou expirado. Peça um novo convite.'));
    }
  }

  async function submit(ev) {
    ev.preventDefault();
    showError('');
    const name = $('invite-name').value.trim();
    const password = $('invite-password').value;
    if (name.length < 2) return showError('Informe seu nome.');
    if (password !== $('invite-password2').value) return showError('As senhas não conferem.');
    const btn = $('invite-accept');
    btn.disabled = true;
    try {
      await api().post('/api/auth/invitations/' + encodeURIComponent(token) + '/accept', { name, password }, { skipAuth: true, messageFromServer: true });
      window.location.href = '/dashboard.html';
    } catch (e) {
      showError(errText(e, 'Não foi possível aceitar o convite.'));
      btn.disabled = false;
    }
  }

  function init() {
    if (!$('invite-form') || !window.SGVC || !window.SGVC.api) return;
    $('invite-form').addEventListener('submit', submit);
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
