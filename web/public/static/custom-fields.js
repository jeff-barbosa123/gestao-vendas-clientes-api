// Campos extras (Fase 3): renderiza os campos que a empresa definiu dentro dos formularios de produto/cliente
// e grava os valores em PUT /api/custom-fields/:entity/:id/values depois que o cadastro principal foi salvo.
(() => {
  'use strict';
  const WRITE_PERM = { product: 'products:write', customer: 'customers:write' };
  const RECORD_URL = { product: '/api/products/', customer: '/api/customers/' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const request = (path, opts) => window.apiRequest(path, null, opts);

  let defsPromise = null;
  const loadDefs = () => {
    if (!defsPromise) defsPromise = request('/api/custom-fields', { method: 'GET' }).catch(() => ({ product: [], customer: [] }));
    return defsPromise;
  };

  function canWrite(entity) {
    const access = window.SGVC && window.SGVC.access;
    // Sem /me com permissoes (API simulada), nao bloqueia: o backend decide.
    return !access || !access.user() || !Array.isArray(access.user().permissions) || access.can(WRITE_PERM[entity]);
  }

  function inputHtml(def, id, value) {
    const attrs = `id="${id}" data-cf-key="${esc(def.key)}" data-cf-type="${def.type}"`;
    if (def.type === 'boolean') return `<label class="checkbox"><input type="checkbox" ${attrs} ${value === true ? 'checked' : ''} /> Sim</label>`;
    if (def.type === 'select') {
      const opts = ['<option value="">—</option>'].concat(def.options.map((o) => `<option value="${esc(o)}"${value === o ? ' selected' : ''}>${esc(o)}</option>`));
      return `<div class="select is-fullwidth"><select ${attrs}>${opts.join('')}</select></div>`;
    }
    const type = def.type === 'number' ? 'number" step="any' : def.type === 'date' ? 'date' : 'text" maxlength="200';
    return `<input class="input" type="${type}" ${attrs} value="${value == null ? '' : esc(value)}" />`;
  }

  // Renderiza o bloco dentro do form. id (opcional): carrega valores atuais do registro.
  async function mount(form, entity, id) {
    if (!form || !canWrite(entity)) return;
    const defs = ((await loadDefs())[entity]) || [];
    const old = form.querySelector('[data-cf-block]');
    if (old) old.remove();
    if (!defs.length) return;
    let extra = {};
    if (id) {
      try {
        extra = (await request(RECORD_URL[entity] + encodeURIComponent(id), { method: 'GET' })).extra || {};
      } catch (_e) { /* segue sem valores */ }
    }
    const block = document.createElement('fieldset');
    block.className = 'custom-fields';
    block.setAttribute('data-cf-block', entity);
    block.innerHTML = '<legend class="label">Campos extras</legend>' + defs.map((d, i) => {
      const fieldId = `cf-${entity}-${d.key}-${i}`;
      return `<div class="field"><label class="label" for="${fieldId}">${esc(d.label)}${d.required ? ' <span class="required">*</span>' : ''}</label>${inputHtml(d, fieldId, extra[d.key])}</div>`;
    }).join('');
    const onEdit = () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn && form.id === 'edit-form' && isDirty(form)) btn.disabled = false;
    };
    block.addEventListener('input', onEdit);
    block.addEventListener('change', onEdit);
    const submit = form.querySelector('button[type="submit"]');
    const anchor = submit ? submit.closest('.buttons') || submit : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(block, anchor);
    else form.appendChild(block);
    form.__cfBase = JSON.stringify(collect(form));
  }

  // Mudou algo nos campos extras desde que o formulario foi montado/salvo?
  function isDirty(form) {
    return !!form && !!form.querySelector('[data-cf-key]') && JSON.stringify(collect(form)) !== form.__cfBase;
  }

  function collect(form) {
    const values = {};
    form.querySelectorAll('[data-cf-key]').forEach((el) => {
      const key = el.getAttribute('data-cf-key');
      values[key] = el.getAttribute('data-cf-type') === 'boolean' ? el.checked : el.value.trim();
    });
    return values;
  }

  // Chamar depois de salvar o cadastro principal. Sem campos renderizados, nao faz nada.
  async function save(entity, id, form) {
    if (!form || !id || !form.querySelector('[data-cf-key]') || !canWrite(entity)) return null;
    const out = await request(`/api/custom-fields/${entity}/${encodeURIComponent(id)}/values`, { method: 'PUT', body: JSON.stringify({ values: collect(form) }) });
    form.__cfBase = JSON.stringify(collect(form));
    return out;
  }

  window.SGVC = window.SGVC || {};
  window.SGVC.customFields = { mount, save, collect, isDirty, reload: () => { defsPromise = null; return loadDefs(); } };

  // Montagem automatica: <form data-custom-fields="product|customer" data-record-id opcional> ou pelo caminho da pagina.
  function autoMount() {
    const form = document.querySelector('form#create-form, form#edit-form');
    if (!form) return;
    const page = window.location.pathname;
    const entity = /product/.test(page) ? 'product' : /client/.test(page) ? 'customer' : null;
    if (!entity) return;
    const id = new URLSearchParams(window.location.search).get('id');
    form.setAttribute('data-custom-fields', entity);
    mount(form, entity, form.id === 'edit-form' ? id : null);
  }
  const start = () => (window.SGVC.access && window.SGVC.access.user() ? autoMount() : window.addEventListener('sgvc:access', autoMount, { once: true }));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
  // Se o /me nao trouxer permissoes (access.js nao dispara), monta mesmo assim.
  window.addEventListener('load', () => setTimeout(() => { if (!document.querySelector('[data-cf-block]')) autoMount(); }, 1500));
})();
