/**
 * CRM leve: lista de clientes por situacao (recompra/inativo/em dia), WhatsApp (wa.me) com mensagem editavel,
 * historico de compras e anotacoes. Quem decide permissao e o backend; aqui so apresentamos.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => window.SGVC.utils.escapeHtml(s);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-');
  const api = (path, method = 'GET', body) => window.apiRequest(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

  const STATUS = [
    ['', 'Todos'],
    ['recompra', 'Hora de recomprar'],
    ['inativo', 'Inativos'],
    ['em_dia', 'Em dia'],
    ['sem_compras', 'Sem compras'],
  ];
  const STATUS_LABEL = { recompra: 'Recompra', inativo: 'Inativo', em_dia: 'Em dia', sem_compras: 'Sem compras' };
  const KEY = 'sgvc.crm.template';
  const DEFAULT_TEMPLATE = 'Olá, {nome}! Faz um tempo que você não passa por aqui. Quer repetir seu pedido? 😊';

  const els = {
    message: $('crm-message'),
    filters: $('crm-filters'),
    template: $('crm-template'),
    body: $('crm-body'),
    detail: $('crm-detail'),
    detailTitle: $('crm-detail-title'),
    detailClose: $('crm-detail-close'),
    kpis: $('crm-detail-kpis'),
    sales: $('crm-sales'),
    products: $('crm-products'),
    interactions: $('crm-interactions'),
    noteForm: $('crm-note-form'),
    note: $('crm-note'),
  };

  let status = '';
  let customers = [];
  let counts = {};
  let currentId = null;

  function say(text, kind = 'is-light') {
    els.message.className = `notification ${kind} crm-message`;
    els.message.textContent = text;
    els.message.hidden = !text;
  }

  try { els.template.value = window.localStorage.getItem(KEY) || DEFAULT_TEMPLATE; } catch (_e) { els.template.value = DEFAULT_TEMPLATE; }
  els.template.addEventListener('change', () => {
    try { window.localStorage.setItem(KEY, els.template.value); } catch (_e) { /* sem storage */ }
  });

  function renderFilters() {
    els.filters.innerHTML = STATUS.map(([value, label]) => {
      const n = value ? counts[value] || 0 : Object.values(counts).reduce((a, b) => a + b, 0);
      return `<button type="button" class="button is-light is-small" data-status="${value}" aria-pressed="${value === status}">${label} (${n})</button>`;
    }).join('');
  }

  function renderTable() {
    els.body.innerHTML = customers.length
      ? customers.map((c) => `<tr>
          <td>${escapeHtml(c.name)}<br /><span class="crm-muted">${escapeHtml(c.phone || 'sem telefone')}</span></td>
          <td><span class="crm-badge is-${c.status}">${STATUS_LABEL[c.status]}</span></td>
          <td>${c.lastPurchaseAt ? `${fmtDate(c.lastPurchaseAt)}<br /><span class="crm-muted">há ${c.daysSinceLast} dia(s)</span>` : '-'}</td>
          <td class="has-text-right">${c.avgIntervalDays != null ? `${String(c.avgIntervalDays).replace('.', ',')} dias` : '-'}</td>
          <td class="has-text-right">${money(c.spent)}</td>
          <td><div class="crm-actions">
            <button type="button" class="button is-link is-small" data-wa="${escapeHtml(c.id)}"${c.whatsappPhone ? '' : ' disabled title="Cliente sem telefone válido"'}>WhatsApp</button>
            <button type="button" class="button is-light is-small" data-open="${escapeHtml(c.id)}">Histórico</button>
          </div></td></tr>`).join('')
      : '<tr class="is-empty"><td colspan="6">Nenhum cliente nesta situação.</td></tr>';
  }

  async function load() {
    try {
      const res = await api(`/api/crm/customers${status ? `?status=${encodeURIComponent(status)}` : ''}`);
      customers = res.customers;
      counts = res.counts;
      renderFilters();
      renderTable();
    } catch (err) {
      if (err && err.status === 403) { window.location.href = '/dashboard.html'; return; }
      say(err.message || 'Não foi possível carregar os clientes.', 'is-danger');
    }
  }

  els.filters.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (!btn) return;
    status = btn.dataset.status;
    load();
  });

  function whatsappUrl(c) {
    const text = (els.template.value || DEFAULT_TEMPLATE).replace(/\{nome\}/gi, String(c.name || '').split(' ')[0]);
    return `https://wa.me/${c.whatsappPhone}?text=${encodeURIComponent(text)}`;
  }

  async function openWhatsapp(id) {
    const c = customers.find((x) => x.id === id);
    if (!c || !c.whatsappPhone) return;
    window.open(whatsappUrl(c), '_blank', 'noopener');
    try {
      await api(`/api/crm/customers/${encodeURIComponent(id)}/interactions`, 'POST', { kind: 'WHATSAPP', note: 'Mensagem enviada pelo CRM' });
      say(`Contato com ${c.name} registrado.`, 'is-success');
      if (currentId === id) openDetail(id);
    } catch (_e) { /* o link ja abriu; o registro e best-effort */ }
  }

  async function openDetail(id) {
    try {
      const d = await api(`/api/crm/customers/${encodeURIComponent(id)}`);
      currentId = id;
      const c = d.customer;
      els.detail.hidden = false;
      els.detailTitle.textContent = c.name;
      els.kpis.innerHTML = [
        ['Situação', STATUS_LABEL[c.status]],
        ['Compras', String(c.purchases)],
        ['Total gasto', money(c.spent)],
        ['Ticket médio', c.ticketAvg == null ? '-' : money(c.ticketAvg)],
        ['Próxima compra prevista', c.expectedAt ? fmtDate(c.expectedAt) : '-'],
        ['Último contato', c.lastContactAt ? fmtDate(c.lastContactAt) : 'nenhum'],
      ].map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join('');
      els.sales.innerHTML = d.sales.length
        ? d.sales.map((s) => `<li><span>${fmtDate(s.date)}${s.status === 'CANCELED' ? ' (cancelada)' : ''}</span><span>${s.units} un. · ${money(s.total)}</span></li>`).join('')
        : '<li class="crm-muted">Sem compras.</li>';
      els.products.innerHTML = d.topProducts.length
        ? d.topProducts.map((p) => `<li><span>${escapeHtml(p.name)}</span><span>${p.units} un.</span></li>`).join('')
        : '<li class="crm-muted">Sem histórico.</li>';
      els.interactions.innerHTML = d.interactions.length
        ? d.interactions.map((i) => `<li><span>${i.kind === 'WHATSAPP' ? 'WhatsApp' : 'Anotação'}${i.note ? `: ${escapeHtml(i.note)}` : ''}</span><span class="crm-muted">${fmtDateTime(i.createdAt)}${i.author ? ` · ${escapeHtml(i.author)}` : ''}</span></li>`).join('')
        : '<li class="crm-muted">Nenhuma anotação ainda.</li>';
      els.detail.scrollIntoView({ block: 'nearest' });
    } catch (err) {
      say(err.message || 'Não foi possível abrir o histórico.', 'is-danger');
    }
  }

  els.body.addEventListener('click', (e) => {
    const wa = e.target.closest('button[data-wa]');
    if (wa) return openWhatsapp(wa.dataset.wa);
    const open = e.target.closest('button[data-open]');
    if (open) openDetail(open.dataset.open);
  });
  els.detailClose.addEventListener('click', () => { els.detail.hidden = true; currentId = null; });

  els.noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = els.note.value.trim();
    if (!note) return say('Escreva a anotação.', 'is-danger');
    try {
      await api(`/api/crm/customers/${encodeURIComponent(currentId)}/interactions`, 'POST', { kind: 'NOTE', note });
      els.note.value = '';
      say('Anotação salva.', 'is-success');
      openDetail(currentId);
    } catch (err) {
      say(err.message || 'Não foi possível salvar.', 'is-danger');
    }
  });

  load();
})();
