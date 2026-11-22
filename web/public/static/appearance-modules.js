// Card "Módulos da empresa" na tela de Aparência: liga/desliga recursos opcionais (produção, encomendas).
(() => {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function init() {
    const grid = document.querySelector('.profile-grid');
    if (!grid || !window.SGVC || !window.SGVC.api) return;
    let data;
    try {
      data = await window.SGVC.api.request('/api/company/modules', { method: 'GET', messageFromServer: true });
    } catch (_e) { return; }
    const catalog = data.catalog || {};
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.id = 'company-modules-card';
    card.innerHTML = '<h4 class="panel-title">Módulos da empresa</h4>' +
      '<p class="help">Ative só o que faz sentido para o seu negócio. O que for desligado some do menu para toda a equipe.</p>' +
      Object.keys(catalog).map((key) => '<div class="field"><label class="checkbox">' +
        '<input type="checkbox" data-module="' + esc(key) + '"' + (data.modules[key] !== false ? ' checked' : '') + ' /> ' +
        '<strong>' + esc(catalog[key].label) + '</strong></label>' +
        '<p class="help">' + esc(catalog[key].description) + '</p></div>').join('') +
      '<div class="profile-message is-inline" id="modules-message" role="status" aria-live="polite" hidden></div>';
    grid.appendChild(card);
    const msg = card.querySelector('#modules-message');
    card.addEventListener('change', async (ev) => {
      const key = ev.target.getAttribute && ev.target.getAttribute('data-module');
      if (!key) return;
      try {
        await window.SGVC.api.put('/api/company/modules', { [key]: ev.target.checked }, { messageFromServer: true });
        msg.textContent = 'Módulos atualizados.';
        msg.classList.remove('is-error');
      } catch (e) {
        ev.target.checked = !ev.target.checked;
        msg.textContent = (e && e.message) || 'Não foi possível salvar.';
        msg.classList.add('is-error');
      }
      msg.hidden = false;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
