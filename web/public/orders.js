/**
 * Tela de Encomendas: cadastro, agenda da semana, mudança de status e entrega (vira venda).
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    message: $('ord-message'),
    shortage: $('ord-shortage'),
    form: $('ord-form'),
    formTitle: $('ord-form-title'),
    id: $('ord-id'),
    customer: $('ord-customer'),
    customers: $('ord-customers'),
    phone: $('ord-phone'),
    date: $('ord-date'),
    time: $('ord-time'),
    itemProduct: $('ord-item-product'),
    itemQty: $('ord-item-qty'),
    itemPrice: $('ord-item-price'),
    itemAdd: $('ord-item-add'),
    items: $('ord-items'),
    deposit: $('ord-deposit'),
    depositMethod: $('ord-deposit-method'),
    total: $('ord-total'),
    balance: $('ord-balance'),
    notes: $('ord-notes'),
    error: $('ord-error'),
    save: $('ord-save'),
    cancelEdit: $('ord-cancel-edit'),
    agenda: $('ord-agenda'),
    weekLabel: $('ord-week-label'),
    weekPrev: $('ord-week-prev'),
    weekToday: $('ord-week-today'),
    weekNext: $('ord-week-next'),
    showClosed: $('ord-show-closed'),
    deliverModal: $('ord-deliver-modal'),
    deliverSummary: $('ord-deliver-summary'),
    deliverMethod: $('ord-deliver-method'),
    deliverConfirm: $('ord-deliver-confirm'),
    deliverError: $('ord-deliver-error'),
  };

  const STATUS = {
    PENDING: { label: 'A fazer', cls: 'is-pending' },
    READY: { label: 'Pronta', cls: 'is-ready' },
    DELIVERED: { label: 'Entregue', cls: 'is-delivered' },
    CANCELED: { label: 'Cancelada', cls: 'is-canceled' },
  };
  const PAYMENT_LABELS = { PIX: 'Pix', CASH: 'Dinheiro', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', OTHER: 'Outro' };

  let products = [];
  let customers = [];
  let items = [];
  let orders = [];
  let weekOffset = 0;
  let deliverId = null;

  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const qtyFmt = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const parseDecimal = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return NaN;
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  };
  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  function showMessage(text, type = 'is-success') {
    els.message.textContent = text;
    els.message.className = `notification is-light ord-message ${type}`;
    els.message.hidden = !text;
    if (text) setTimeout(() => (els.message.hidden = true), 7000);
  }

  function friendlyError(err) {
    const p = err && err.payload;
    return (p && (p.message || p.error)) || (err && err.message) || 'Não foi possível concluir. Tente novamente.';
  }

  function formError(text, field) {
    els.error.textContent = text || '';
    els.error.hidden = !text;
    if (field) field.focus();
  }

  // ---------- Semana ----------
  function weekRange() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // segunda = 0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + weekOffset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { start, end };
  }

  function weekLabelText({ start, end }) {
    const last = new Date(end.getTime() - 1);
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${weekOffset === 0 ? '(esta semana) ' : ''}${fmt(start)} a ${fmt(last)}`;
  }

  // ---------- Itens do formulário ----------
  function recalcTotals() {
    const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const deposit = parseDecimal(els.deposit.value);
    els.total.textContent = money(total);
    els.balance.textContent = money(Math.max(0, total - (Number.isFinite(deposit) ? deposit : 0)));
    return total;
  }

  function renderItems() {
    if (!items.length) {
      els.items.innerHTML = '<tr class="is-empty"><td colspan="5">Nenhum item ainda.</td></tr>';
    } else {
      els.items.innerHTML = items
        .map(
          (it, idx) => `<tr>
            <td>${escapeHtml(it.productName)}</td>
            <td class="has-text-right">${qtyFmt(it.quantity)}</td>
            <td class="has-text-right">${money(it.unitPrice)}</td>
            <td class="has-text-right">${money(it.quantity * it.unitPrice)}</td>
            <td class="has-text-right"><button class="button is-light is-small" type="button" data-remove-item="${idx}">Remover</button></td>
          </tr>`
        )
        .join('');
    }
    recalcTotals();
  }

  els.itemProduct.addEventListener('change', () => {
    const p = products.find((x) => x.id === els.itemProduct.value);
    els.itemPrice.value = p ? Number(p.price).toFixed(2).replace('.', ',') : '';
  });

  els.itemAdd.addEventListener('click', () => {
    formError('');
    const product = products.find((p) => p.id === els.itemProduct.value);
    if (!product) return formError('Escolha o produto.', els.itemProduct);
    const quantity = parseDecimal(els.itemQty.value);
    if (!(quantity > 0)) return formError('Informe a quantidade.', els.itemQty);
    const priceRaw = parseDecimal(els.itemPrice.value);
    const unitPrice = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : Number(product.price);
    const existing = items.find((it) => it.productId === product.id && it.unitPrice === unitPrice);
    if (existing) existing.quantity += quantity;
    else items.push({ productId: product.id, productName: product.name, quantity, unitPrice });
    els.itemQty.value = '';
    renderItems();
    els.itemProduct.focus();
  });

  els.items.addEventListener('click', (event) => {
    const idx = event.target.getAttribute('data-remove-item');
    if (idx == null) return;
    items.splice(Number(idx), 1);
    renderItems();
  });

  els.deposit.addEventListener('input', recalcTotals);

  // ---------- Formulário ----------
  function resetForm() {
    els.form.reset();
    els.id.value = '';
    items = [];
    renderItems();
    els.formTitle.textContent = 'Nova encomenda';
    els.save.textContent = 'Salvar encomenda';
    els.cancelEdit.hidden = true;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    els.date.value = toDateInput(tomorrow);
    els.time.value = '14:00';
    formError('');
  }

  function startEdit(order) {
    els.id.value = order.id;
    els.customer.value = order.customerName || '';
    els.phone.value = order.customerPhone || '';
    const d = new Date(order.deliveryAt);
    els.date.value = toDateInput(d);
    els.time.value = toTimeInput(d);
    items = order.items.map((it) => ({ productId: it.productId, productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice }));
    els.deposit.value = order.deposit ? Number(order.deposit).toFixed(2).replace('.', ',') : '';
    els.depositMethod.value = order.depositMethod || '';
    els.notes.value = order.notes || '';
    renderItems();
    els.formTitle.textContent = `Editar encomenda de ${order.customerName || 'cliente'}`;
    els.save.textContent = 'Salvar alterações';
    els.cancelEdit.hidden = false;
    els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.customer.focus();
  }

  els.cancelEdit.addEventListener('click', resetForm);

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError('');
    const name = els.customer.value.trim();
    if (!name) return formError('Informe o cliente.', els.customer);
    if (!els.date.value) return formError('Informe a data da entrega.', els.date);
    if (!items.length) return formError('Adicione pelo menos um produto.', els.itemProduct);
    const deposit = els.deposit.value.trim() ? parseDecimal(els.deposit.value) : 0;
    if (!(deposit >= 0)) return formError('Sinal inválido.', els.deposit);

    const match = customers.find((c) => (c.name || '').trim().toLowerCase() === name.toLowerCase());
    const deliveryAt = new Date(`${els.date.value}T${els.time.value || '12:00'}`).toISOString();
    const payload = {
      customerId: match ? match.id : null,
      customerName: name,
      customerPhone: els.phone.value.trim() || (match && match.phone) || null,
      deliveryAt,
      items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
      deposit,
      depositMethod: els.depositMethod.value || null,
      notes: els.notes.value.trim() || null,
    };
    const id = els.id.value;
    els.save.disabled = true;
    try {
      await window.apiRequest(id ? `/api/orders/${id}` : '/api/orders', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      showMessage(id ? 'Encomenda atualizada.' : 'Encomenda salva na agenda.');
      // leva a agenda para a semana da entrega
      const target = new Date(deliveryAt);
      const { start } = weekRange();
      weekOffset += Math.floor((new Date(target.getFullYear(), target.getMonth(), target.getDate()) - start) / (7 * 864e5));
      resetForm();
      await loadAgenda();
    } catch (err) {
      formError(friendlyError(err));
    } finally {
      els.save.disabled = false;
    }
  });

  // ---------- Agenda ----------
  function orderCard(o) {
    const st = STATUS[o.status] || { label: o.status, cls: '' };
    const when = new Date(o.deliveryAt);
    const open = o.status === 'PENDING' || o.status === 'READY';
    const phoneDigits = String(o.customerPhone || '').replace(/\D/g, '');
    const phone = o.customerPhone
      ? `<a href="https://wa.me/55${phoneDigits}" target="_blank" rel="noopener">${escapeHtml(o.customerPhone)}</a>`
      : '';
    const itemsText = o.items.map((it) => `${qtyFmt(it.quantity)} × ${escapeHtml(it.productName)}`).join(', ');
    const deposit = o.deposit
      ? `Sinal ${money(o.deposit)}${o.depositMethod ? ` (${PAYMENT_LABELS[o.depositMethod] || o.depositMethod})` : ''} · falta ${money(o.balanceDue)}`
      : `Sem sinal · receber ${money(o.total)}`;
    const actions = open
      ? `${o.status === 'PENDING' ? `<button class="button is-light is-small" type="button" data-action="READY" data-id="${o.id}">Marcar pronta</button>` : `<button class="button is-light is-small" type="button" data-action="PENDING" data-id="${o.id}">Voltar para a fazer</button>`}
         <button class="button is-link is-small" type="button" data-action="DELIVER" data-id="${o.id}">Entregar</button>
         <button class="button is-light is-small" type="button" data-action="EDIT" data-id="${o.id}">Editar</button>
         <button class="button is-danger is-light is-small" type="button" data-action="CANCELED" data-id="${o.id}">Cancelar</button>`
      : '';
    return `<article class="ord-card ${st.cls}" data-order="${o.id}">
      <header class="ord-card-head">
        <span class="ord-card-time">${toTimeInput(when)}</span>
        <strong class="ord-card-customer">${escapeHtml(o.customerName || 'Cliente')}</strong>
        <span class="ord-status ${st.cls}">${st.label}</span>
      </header>
      <p class="ord-card-items">${itemsText}</p>
      <p class="ord-card-money"><strong>${money(o.total)}</strong> · ${deposit}</p>
      ${phone ? `<p class="ord-card-phone">${phone}</p>` : ''}
      ${o.notes ? `<p class="ord-card-notes">${escapeHtml(o.notes)}</p>` : ''}
      ${actions ? `<div class="ord-card-actions">${actions}</div>` : ''}
    </article>`;
  }

  function renderAgenda(range) {
    els.weekLabel.textContent = weekLabelText(range);
    if (!orders.length) {
      els.agenda.innerHTML = `<p class="ord-empty">Nenhuma encomenda ${els.showClosed.checked ? '' : 'em aberto '}nesta semana.</p>`;
      return;
    }
    const byDay = new Map();
    orders.forEach((o) => {
      const d = new Date(o.deliveryAt);
      const key = toDateInput(d);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(o);
    });
    const todayKey = toDateInput(new Date());
    els.agenda.innerHTML = [...byDay.entries()]
      .map(([key, list]) => {
        const d = new Date(`${key}T12:00`);
        const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        const totalDay = list.filter((o) => o.status !== 'CANCELED').reduce((s, o) => s + o.total, 0);
        return `<section class="ord-day ${key === todayKey ? 'is-today' : ''}">
          <h3 class="ord-day-title">${escapeHtml(label)}${key === todayKey ? ' · hoje' : ''}
            <span class="ord-day-count">${list.length} ${list.length === 1 ? 'encomenda' : 'encomendas'} · ${money(totalDay)}</span></h3>
          <div class="ord-day-list">${list.map(orderCard).join('')}</div>
        </section>`;
      })
      .join('');
  }

  function formatStock(value, unit) {
    const n = Number(value || 0);
    const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    if ((unit === 'g' || unit === 'ml') && Math.abs(n) >= 1000) return `${fmt(n / 1000)} ${unit === 'g' ? 'kg' : 'l'}`;
    return `${fmt(n)} ${unit || ''}`.trim();
  }

  async function loadNeeds(range) {
    try {
      const res = await window.apiRequest(
        `/api/orders/needs?from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(range.end.toISOString())}`
      );
      const shortages = res.shortages || [];
      els.shortage.hidden = !shortages.length;
      els.shortage.innerHTML = shortages.length
        ? `<strong>Falta insumo para as encomendas desta semana:</strong> ${shortages
            .map((s) => `${escapeHtml(s.name)} (faltam ${formatStock(s.missing, s.stockUnit)} · precisa ${formatStock(s.needed, s.stockUnit)}, tem ${formatStock(s.stockQuantity, s.stockUnit)})`)
            .join('; ')}. <a href="/ingredients.html">Registrar compra</a>`
        : '';
    } catch (_err) {
      els.shortage.hidden = true;
    }
  }

  async function loadAgenda() {
    const range = weekRange();
    const params = new URLSearchParams({ from: range.start.toISOString(), to: range.end.toISOString() });
    if (!els.showClosed.checked) params.set('status', 'PENDING,READY');
    try {
      orders = await window.apiRequest(`/api/orders?${params.toString()}`);
      renderAgenda(range);
    } catch (err) {
      if (err && (err.status === 401 || err.status === 403)) {
        window.location.href = '/';
        return;
      }
      els.agenda.innerHTML = `<p class="ord-empty">${escapeHtml(friendlyError(err))}</p>`;
    }
    loadNeeds(range);
  }

  els.weekPrev.addEventListener('click', () => { weekOffset -= 1; loadAgenda(); });
  els.weekNext.addEventListener('click', () => { weekOffset += 1; loadAgenda(); });
  els.weekToday.addEventListener('click', () => { weekOffset = 0; loadAgenda(); });
  els.showClosed.addEventListener('change', loadAgenda);

  async function setStatus(id, status, extra = {}) {
    return window.apiRequest(`/api/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status, ...extra }) });
  }

  els.agenda.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (action === 'EDIT') return startEdit(order);
    if (action === 'DELIVER') return openDeliver(order);
    if (action === 'CANCELED' && !window.confirm(`Cancelar a encomenda de ${order.customerName}?`)) return;
    btn.disabled = true;
    try {
      await setStatus(id, action);
      showMessage(action === 'READY' ? 'Encomenda marcada como pronta.' : action === 'PENDING' ? 'Encomenda voltou para "a fazer".' : 'Encomenda cancelada.');
      await loadAgenda();
    } catch (err) {
      showMessage(friendlyError(err), 'is-danger');
      btn.disabled = false;
    }
  });

  // ---------- Entrega ----------
  function openDeliver(order) {
    deliverId = order.id;
    els.deliverError.hidden = true;
    els.deliverSummary.textContent = order.deposit
      ? `${order.customerName}: total ${money(order.total)}, sinal de ${money(order.deposit)} já recebido. Receber agora ${money(order.balanceDue)}.`
      : `${order.customerName}: receber ${money(order.total)}.`;
    els.deliverMethod.value = order.depositMethod || 'PIX';
    els.deliverModal.hidden = false;
    els.deliverMethod.focus();
  }

  function closeDeliver() {
    els.deliverModal.hidden = true;
    deliverId = null;
  }

  els.deliverModal.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-deliver')) closeDeliver();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.deliverModal.hidden) closeDeliver();
  });

  els.deliverConfirm.addEventListener('click', async () => {
    if (!deliverId) return;
    els.deliverConfirm.disabled = true;
    try {
      const res = await setStatus(deliverId, 'DELIVERED', { paymentMethod: els.deliverMethod.value });
      closeDeliver();
      const low = (res.sale && res.sale.lowStockIngredients) || [];
      showMessage(
        low.length
          ? `Encomenda entregue e registrada como venda. Atenção: ${low.map((i) => i.name).join(', ')} no estoque mínimo.`
          : 'Encomenda entregue e registrada como venda.',
        low.length ? 'is-warning' : 'is-success'
      );
      await loadAgenda();
    } catch (err) {
      els.deliverError.textContent = friendlyError(err);
      els.deliverError.hidden = false;
    } finally {
      els.deliverConfirm.disabled = false;
    }
  });

  // ---------- Início ----------
  async function loadLists() {
    const [prods, custs] = await Promise.all([
      window.apiRequest('/api/products').catch(() => []),
      window.apiRequest('/api/customers').catch(() => []),
    ]);
    products = (Array.isArray(prods) ? prods : prods.items || prods.data || []).filter((p) => {
      const st = String(p.status_produto || p.statusProduto || p.status || '').toUpperCase();
      return st !== 'INATIVO' && st !== 'INACTIVE';
    });
    customers = Array.isArray(custs) ? custs : custs.items || custs.data || [];
    els.itemProduct.innerHTML =
      '<option value="">Selecione um produto</option>' +
      products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} · ${money(p.price)}</option>`).join('');
    els.customers.innerHTML = customers.map((c) => `<option value="${escapeHtml(c.name)}"></option>`).join('');
  }

  els.customer.addEventListener('change', () => {
    const match = customers.find((c) => (c.name || '').trim().toLowerCase() === els.customer.value.trim().toLowerCase());
    if (match && match.phone && !els.phone.value) els.phone.value = match.phone;
  });

  async function init() {
    try {
      const me = await window.apiGetMe();
      if (!me) {
        window.location.href = '/';
        return;
      }
    } catch (_err) {
      window.location.href = '/';
      return;
    }
    resetForm();
    await loadLists();
    await loadAgenda();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
