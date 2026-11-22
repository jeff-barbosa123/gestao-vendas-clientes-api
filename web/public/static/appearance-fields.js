// Card "Campos extras" em Aparencia (Fase 3): a empresa define rotulo/tipo dos campos extras de produto e cliente.
(() => {
  'use strict';
  const ENTITIES = [
    { key: 'product', title: 'Produtos' },
    { key: 'customer', title: 'Clientes' },
  ];
  const TYPES = [
    ['text', 'Texto'],
    ['number', 'Número'],
    ['date', 'Data'],
    ['boolean', 'Sim/Não'],
    ['select', 'Lista de opções'],
  ];
  const MAX_FIELDS = 15;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function rowHtml(f) {
    const typeOpts = TYPES.map(([v, l]) => `<option value="${v}"${f.type === v ? ' selected' : ''}>${l}</option>`).join('');
    return `<div class="cf-row" data-key="${esc(f.key || '')}">
      <input class="input cf-label" type="text" maxlength="40" placeholder="Nome do campo" aria-label="Nome do campo" value="${esc(f.label || '')}" />
      <div class="select"><select class="cf-type" aria-label="Tipo do campo">${typeOpts}</select></div>
      <input class="input cf-options" type="text" placeholder="Opções separadas por vírgula" aria-label="Opções da lista" value="${esc((f.options || []).join(', '))}"${f.type === 'select' ? '' : ' hidden'} />
      <label class="checkbox cf-required"><input type="checkbox" class="cf-req"${f.required ? ' checked' : ''} /> Obrigatório</label>
      <button type="button" class="button is-light is-small cf-remove" aria-label="Remover campo">Remover</button>
    </div>`;
  }

  function readRows(section) {
    return [...section.querySelectorAll('.cf-row')].map((row) => {
      const type = row.querySelector('.cf-type').value;
      const field = {
        label: row.querySelector('.cf-label').value.trim(),
        type,
        required: row.querySelector('.cf-req').checked,
      };
      if (row.dataset.key) field.key = row.dataset.key;
      if (type === 'select') field.options = row.querySelector('.cf-options').value.split(',').map((o) => o.trim()).filter(Boolean);
      return field;
    }).filter((f) => f.label || f.key);
  }

  async function init() {
    const grid = document.querySelector('.profile-grid');
    if (!grid || !window.SGVC || !window.SGVC.api) return;
    let defs;
    try {
      defs = await window.SGVC.api.request('/api/custom-fields', { method: 'GET', messageFromServer: true });
    } catch (_e) { return; }
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.id = 'custom-fields-card';
    card.innerHTML = '<h4 class="panel-title">Campos extras</h4>' +
      '<p class="help">Crie campos próprios para o seu tipo de negócio (ex.: validade, tamanho, Instagram, pet). Eles aparecem nos formulários de produto e cliente.</p>' +
      ENTITIES.map((e) => `<section class="cf-section" data-entity="${e.key}"><h5 class="label">${e.title}</h5>` +
        `<div class="cf-rows">${(defs[e.key] || []).map(rowHtml).join('')}</div>` +
        '<div class="buttons"><button type="button" class="button is-light is-small cf-add">Adicionar campo</button>' +
        '<button type="button" class="button is-link is-small cf-save">Salvar campos</button></div>' +
        '<div class="profile-message is-inline cf-message" role="status" aria-live="polite" hidden></div></section>').join('');
    grid.appendChild(card);

    card.addEventListener('click', async (ev) => {
      const section = ev.target.closest('.cf-section');
      if (!section) return;
      const rows = section.querySelector('.cf-rows');
      if (ev.target.closest('.cf-add')) {
        if (rows.children.length >= MAX_FIELDS) return;
        rows.insertAdjacentHTML('beforeend', rowHtml({ type: 'text' }));
        rows.lastElementChild.querySelector('.cf-label').focus();
      } else if (ev.target.closest('.cf-remove')) {
        ev.target.closest('.cf-row').remove();
      } else if (ev.target.closest('.cf-save')) {
        const msg = section.querySelector('.cf-message');
        try {
          const out = await window.SGVC.api.put('/api/custom-fields/' + section.dataset.entity, { fields: readRows(section) }, { messageFromServer: true });
          rows.innerHTML = (out.fields || []).map(rowHtml).join('');
          msg.textContent = 'Campos salvos.';
          msg.classList.remove('is-error');
          if (window.SGVC.customFields) window.SGVC.customFields.reload();
        } catch (e) {
          msg.textContent = (e && e.message) || 'Não foi possível salvar.';
          msg.classList.add('is-error');
        }
        msg.hidden = false;
      }
    });
    card.addEventListener('change', (ev) => {
      if (!ev.target.classList.contains('cf-type')) return;
      ev.target.closest('.cf-row').querySelector('.cf-options').hidden = ev.target.value !== 'select';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
