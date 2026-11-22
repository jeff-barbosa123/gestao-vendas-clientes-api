// Controle de estoque do produto (Fase 4): "Estoque atual" e "Estoque minimo" nos formularios de produto.
// O backend gera o alerta (painel e lista) quando estoque <= minimo. Campo vazio = sem controle.
(() => {
  'use strict';
  const request = (path, opts) => window.apiRequest(path, null, opts);

  function canWrite() {
    const access = window.SGVC && window.SGVC.access;
    return !access || !access.user() || !Array.isArray(access.user().permissions) || access.can('products:write');
  }

  const field = (form, name) => form.querySelector(`[data-stock-field="${name}"]`);
  const snapshot = (form) => JSON.stringify([field(form, 'stock') && field(form, 'stock').value, field(form, 'min') && field(form, 'min').value]);

  async function mount(form, id) {
    if (!form || !canWrite() || form.querySelector('[data-stock-block]')) return;
    let current = {};
    if (id) {
      try {
        current = await request('/api/products/' + encodeURIComponent(id), { method: 'GET' });
      } catch (_e) { /* segue vazio */ }
    }
    const block = document.createElement('fieldset');
    block.className = 'stock-fields';
    block.setAttribute('data-stock-block', '1');
    const val = (v) => (v == null ? '' : String(v));
    block.innerHTML = '<legend class="label">Controle de estoque</legend>' +
      '<div class="field"><label class="label" for="stock-field-stock">Estoque atual (unidades)</label>' +
      `<input class="input" id="stock-field-stock" data-stock-field="stock" type="number" min="0" step="1" inputmode="numeric" value="${val(current.stock)}" /></div>` +
      '<div class="field"><label class="label" for="stock-field-min">Estoque mínimo (para o alerta)</label>' +
      `<input class="input" id="stock-field-min" data-stock-field="min" type="number" min="0" step="1" inputmode="numeric" value="${val(current.minStock != null ? current.minStock : current.min_stock)}" />` +
      '<p class="help">Deixe vazio para não controlar o estoque deste produto.</p></div>';
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
    form.__stockBase = snapshot(form);
  }

  function isDirty(form) {
    return !!form && !!field(form, 'stock') && snapshot(form) !== form.__stockBase;
  }

  // Valores para mesclar no payload do produto. No cadastro novo, vazio = nao envia; na edicao, minimo vazio limpa.
  function read(form, { editing = false } = {}) {
    const out = {};
    if (!form || !field(form, 'stock')) return out;
    const stock = field(form, 'stock').value.trim();
    const min = field(form, 'min').value.trim();
    if (stock !== '') out.stock = Number(stock);
    if (min !== '') out.minStock = Number(min);
    else if (editing) out.minStock = null;
    return out;
  }

  function rebase(form) {
    if (form && field(form, 'stock')) form.__stockBase = snapshot(form);
  }

  window.SGVC = window.SGVC || {};
  window.SGVC.stockFields = { mount, read, isDirty, rebase };

  function autoMount() {
    const form = document.querySelector('form#create-form, form#edit-form');
    if (!form) return;
    const id = new URLSearchParams(window.location.search).get('id');
    mount(form, form.id === 'edit-form' ? id : null);
  }
  const start = () => (window.SGVC.access && window.SGVC.access.user() ? autoMount() : window.addEventListener('sgvc:access', autoMount, { once: true }));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
  window.addEventListener('load', () => setTimeout(autoMount, 1500));
})();
