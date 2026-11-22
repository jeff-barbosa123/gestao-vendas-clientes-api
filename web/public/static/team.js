(() => {
  'use strict';
  const api = () => window.SGVC.api;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (_e) { return '-'; } };
  let roles = [];

  function say(el, text, bad) {
    el.textContent = text || '';
    el.hidden = !text;
    el.classList.toggle('is-error', Boolean(bad));
  }
  const errText = (e, fallback) => (e && e.message && e.message !== 'NETWORK_ERROR' ? e.message : fallback);

  function roleSelect(current, attrs) {
    return '<select class="input" ' + attrs + '>' + roles.map((r) => '<option value="' + esc(r.value) + '"' + (r.value === current ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select>';
  }

  async function load() {
    try {
      const data = await api().request('/api/team', { method: 'GET', messageFromServer: true });
      roles = data.roles || [];
      $('invite-role').innerHTML = roles.map((r) => '<option value="' + esc(r.value) + '">' + esc(r.label) + '</option>').join('');
      $('team-members').innerHTML = (data.members || []).map((m) => '<div class="profile-item" data-member="' + esc(m.id) + '">' +
        '<span class="profile-label">' + esc(m.name || m.email) + '<br /><small>' + esc(m.email) + '</small></span>' +
        (m.isOwner
          ? '<span class="profile-value">Dono</span>'
          : roleSelect(m.role, 'data-role-for="' + esc(m.id) + '" aria-label="Perfil de ' + esc(m.name || m.email) + '"') +
            '<button class="button is-light is-small" type="button" data-remove="' + esc(m.id) + '">Remover</button>') +
        '</div>').join('');
      $('team-invitations').innerHTML = (data.invitations || []).map((i) => '<div class="profile-item">' +
        '<span class="profile-label">' + esc(i.email) + '<br /><small>' + esc(i.roleLabel) + ' &middot; expira em ' + esc(fmt(i.expiresAt)) + '</small></span>' +
        '<button class="button is-light is-small" type="button" data-revoke-invite="' + esc(i.id) + '">Cancelar</button></div>').join('') || '<p class="help">Nenhum convite pendente.</p>';
    } catch (e) {
      say($('team-message'), errText(e, 'Não foi possível carregar a equipe.'), true);
    }
  }

  async function invite(ev) {
    ev.preventDefault();
    const out = $('invite-result');
    say(out, '');
    const btn = $('invite-submit');
    btn.disabled = true;
    try {
      const res = await api().post('/api/team/invitations', { email: $('invite-email').value.trim(), role: $('invite-role').value }, { messageFromServer: true });
      say(out, 'Convite enviado para ' + res.invitation.email + '.');
      $('invite-link').value = res.inviteUrl;
      $('invite-link-box').hidden = false;
      $('invite-email').value = '';
      load();
    } catch (e) {
      say(out, errText(e, 'Não foi possível enviar o convite.'), true);
    } finally {
      btn.disabled = false;
    }
  }

  async function onClick(ev) {
    const t = ev.target;
    if (!t.getAttribute) return;
    const msg = $('team-message');
    try {
      if (t.getAttribute('data-remove')) {
        if (!window.confirm('Remover esta pessoa da equipe? Ela perde o acesso imediatamente.')) return;
        await api().del('/api/team/members/' + encodeURIComponent(t.getAttribute('data-remove')), null, { messageFromServer: true });
        say(msg, 'Membro removido.');
        load();
      } else if (t.getAttribute('data-revoke-invite')) {
        await api().del('/api/team/invitations/' + encodeURIComponent(t.getAttribute('data-revoke-invite')), null, { messageFromServer: true });
        say(msg, 'Convite cancelado.');
        load();
      } else if (t.id === 'invite-copy') {
        const input = $('invite-link');
        input.select();
        try { await navigator.clipboard.writeText(input.value); say($('invite-result'), 'Link copiado.'); } catch (_e) { document.execCommand('copy'); }
      }
    } catch (e) {
      say(msg, errText(e, 'Não foi possível concluir a ação.'), true);
    }
  }

  async function onChange(ev) {
    const id = ev.target.getAttribute && ev.target.getAttribute('data-role-for');
    if (!id) return;
    const msg = $('team-message');
    try {
      await api().put('/api/team/members/' + encodeURIComponent(id), { role: ev.target.value }, { messageFromServer: true });
      say(msg, 'Perfil atualizado.');
    } catch (e) {
      say(msg, errText(e, 'Não foi possível alterar o perfil.'), true);
      load();
    }
  }

  function init() {
    if (!$('team-members') || !window.SGVC || !window.SGVC.api) return;
    $('team-back-dashboard').addEventListener('click', () => { window.location.href = '/dashboard.html'; });
    $('team-invite-form').addEventListener('submit', invite);
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
