(() => {
  'use strict';
  const api = () => window.SGVC.api;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('pt-BR'); } catch (_e) { return '-'; } };
  const grid = () => document.querySelector('.profile-grid');

  function card(id, title, html) {
    const el = document.createElement('div');
    el.className = 'panel-card';
    el.id = id;
    el.innerHTML = '<h4 class="panel-title">' + title + '</h4>' + html;
    grid().appendChild(el);
    return el;
  }
  function say(el, text, bad) {
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('is-error', Boolean(bad));
  }

  function addUsername(me) {
    const form = document.getElementById('profile-form');
    if (!form || document.getElementById('profile-username-input')) return;
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = '<label class="label" for="profile-username-input">Usu\u00e1rio (@)</label>' +
      '<input class="input" id="profile-username-input" type="text" maxlength="30" autocomplete="username" />' +
      '<p class="help">Opcional. 3 a 30 caracteres: letras, n\u00fameros, ponto, h\u00edfen ou sublinhado. Pode ser usado para entrar.</p>' +
      '<p class="help is-danger" id="profile-username-error" aria-live="polite" hidden></p>' +
      '<button class="button is-light is-small" type="button" id="profile-username-save">Salvar usu\u00e1rio</button>';
    form.insertBefore(field, form.querySelector('.field:nth-of-type(2)').nextSibling);
    const input = document.getElementById('profile-username-input');
    const err = document.getElementById('profile-username-error');
    input.value = me.username || '';
    document.getElementById('profile-username-save').addEventListener('click', async () => {
      say(err, '');
      try {
        await api().request('/api/auth/me', {
          method: 'PUT',
          messageFromServer: true,
          body: JSON.stringify({
            name: document.getElementById('profile-name-input').value,
            email: document.getElementById('profile-email-input').value,
            username: input.value.trim(),
          }),
        });
        say(err, 'Usu\u00e1rio salvo.');
        err.classList.remove('is-danger');
      } catch (e) {
        err.classList.add('is-danger');
        say(err, (e && e.message) || 'N\u00e3o foi poss\u00edvel salvar o usu\u00e1rio.', true);
      }
    });
  }

  function adaptPassword(me) {
    if (me.hasPassword !== false) return;
    const form = document.getElementById('password-form');
    const current = document.getElementById('current-password');
    if (!form || !current) return;
    const group = current.closest('.field');
    if (group) group.hidden = true;
    current.required = false;
    form.hidden = true;
    const title = form.parentElement.querySelector('.panel-title');
    if (title) title.textContent = 'Senha de acesso';
    const box = document.createElement('div');
    box.id = 'password-google-notice';
    box.innerHTML = '<p>Sua conta entra com o Google e ainda n\u00e3o tem senha. Para tamb\u00e9m entrar com e-mail e senha, enviaremos um link seguro para <strong>' + esc(me.email) + '</strong>.</p>' +
      '<button class="button is-link" type="button" id="password-send-link">Enviar link para definir senha</button>' +
      '<div class="profile-message is-inline" id="password-link-message" role="status" aria-live="polite" hidden></div>';
    form.parentElement.appendChild(box);
    const msg = document.getElementById('password-link-message');
    const sendBtn = document.getElementById('password-send-link');
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      try {
        await api().request('/api/auth/forgot', { method: 'POST', skipAuth: true, messageFromServer: true, body: JSON.stringify({ email: me.email }) });
        say(msg, 'Se o e-mail estiver correto, voc\u00ea receber\u00e1 o link em instantes.');
      } catch (e) {
        say(msg, (e && e.message) || 'N\u00e3o foi poss\u00edvel enviar o link.', true);
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  async function renderSessions() {
    const el = card('profile-sessions', 'Sess\u00f5es ativas', '<div id="sessions-list" aria-live="polite">Carregando...</div>' +
      '<div class="profile-message is-inline" id="sessions-message" role="status" aria-live="polite" hidden></div>' +
      '<button class="button is-light is-small" type="button" id="sessions-revoke-others">Encerrar as outras sess\u00f5es</button>');
    const list = el.querySelector('#sessions-list');
    const msg = el.querySelector('#sessions-message');
    async function load() {
      try {
        const data = await api().request('/api/auth/sessions', { method: 'GET', messageFromServer: true });
        const items = (data && data.sessions) || [];
        list.innerHTML = items.map((s) => '<div class="profile-item" data-session="' + esc(s.id) + '">' +
          '<span class="profile-label">' + esc(s.device) + (s.current ? ' <strong>(este dispositivo)</strong>' : '') + '</span>' +
          '<span class="profile-value">\u00daltima atividade: ' + esc(fmt(s.lastActivity)) + '</span>' +
          (s.current ? '' : '<button class="button is-light is-small" type="button" data-revoke="' + esc(s.id) + '">Encerrar</button>') +
          '</div>').join('') || 'Nenhuma sess\u00e3o ativa.';
        el.querySelector('#sessions-revoke-others').hidden = items.filter((s) => !s.current).length === 0;
      } catch (e) {
        list.textContent = '';
        say(msg, (e && e.message) || 'N\u00e3o foi poss\u00edvel carregar as sess\u00f5es.', true);
      }
    }
    el.addEventListener('click', async (ev) => {
      const id = ev.target.getAttribute && ev.target.getAttribute('data-revoke');
      const others = ev.target.id === 'sessions-revoke-others';
      if (!id && !others) return;
      try {
        if (id) await api().request('/api/auth/sessions/' + encodeURIComponent(id), { method: 'DELETE', messageFromServer: true });
        else await api().request('/api/auth/sessions/revoke-others', { method: 'POST', messageFromServer: true });
        say(msg, 'Sess\u00e3o encerrada.');
      } catch (e) {
        say(msg, (e && e.message) || 'N\u00e3o foi poss\u00edvel encerrar.', true);
      }
      load();
    });
    load();
  }

  function renderCompany() {
    card('profile-company', 'Sua empresa', '<p>Nome, logotipo e cores que aparecem nos seus documentos e na sua conta.</p>' +
      '<a class="button is-link is-small" id="profile-company-link" href="/appearance.html">Configurar empresa e apar\u00eancia</a>');
  }

  async function init() {
    if (!grid() || !window.SGVC || !window.SGVC.api) return;
    let me;
    try {
      const data = await api().request('/api/auth/me', { method: 'GET', messageFromServer: true });
      me = (data && data.user) || data;
    } catch (_e) { return; }
    if (!me) return;
    addUsername(me);
    adaptPassword(me);
    renderCompany();
    renderSessions();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
