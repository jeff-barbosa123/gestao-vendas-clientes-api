/**
 * Caixa/PDV: abrir/fechar caixa, sangria/suprimento, venda rapida (codigo de barras ou nome),
 * pagamento em varias formas com troco. O backend valida tudo; o CMV/lucro so aparece se a API enviar.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => window.SGVC.utils.escapeHtml(s);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const cents = (v) => Math.round(Number(v) * 100);
  const parseMoney = (txt) => {
    const t = String(txt == null ? '' : txt).trim().replace(/\./g, '').replace(',', '.');
    if (t === '') return NaN;
    return Number(t);
  };
  const METHODS = [
    ['CASH', 'Dinheiro'],
    ['PIX', 'Pix'],
    ['DEBIT_CARD', 'Cartão de débito'],
    ['CREDIT_CARD', 'Cartão de crédito'],
    ['OTHER', 'Outro'],
  ];

  const els = {
    message: $('pdv-message'),
    openCard: $('pdv-open-card'),
    openForm: $('pdv-open-form'),
    opening: $('pdv-opening'),
    openNote: $('pdv-open-note'),
    registerCard: $('pdv-register-card'),
    since: $('pdv-register-since'),
    kCount: $('pdv-k-count'),
    kTotal: $('pdv-k-total'),
    kCash: $('pdv-k-cash'),
    kCmv: $('pdv-k-cmv'),
    kProfit: $('pdv-k-profit'),
    kMethods: $('pdv-k-methods'),
    moveToggle: $('pdv-move-toggle'),
    closeToggle: $('pdv-close-toggle'),
    moveForm: $('pdv-move-form'),
    closeForm: $('pdv-close-form'),
    closedCard: $('pdv-closed-card'),
    closedSummary: $('pdv-closed-summary'),
    sale: $('pdv-sale'),
    search: $('pdv-search'),
    results: $('pdv-results'),
    cartBody: $('pdv-cart-body'),
    total: $('pdv-total'),
    pays: $('pdv-pays'),
    payAdd: $('pdv-pay-add'),
    balance: $('pdv-balance'),
    saleError: $('pdv-sale-error'),
    finish: $('pdv-finish'),
    clear: $('pdv-clear'),
    kCashCell: $('pdv-k-cash-cell'),
    discountBox: $('pdv-discount-box'),
    discountType: $('pdv-discount-type'),
    discount: $('pdv-discount'),
    discountHelp: $('pdv-discount-help'),
    discountLine: $('pdv-discount-line'),
    settingsCard: $('pdv-settings-card'),
    settingsForm: $('pdv-settings-form'),
    limit: $('pdv-limit'),
    historyCard: $('pdv-history-card'),
    historyBody: $('pdv-history-body'),
  };

  const api = (path, method = 'GET', body) =>
    window.apiRequest(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

  let register = null;
  let discountInfo = { allowed: false, unlimited: false, limitPct: 0 };
  let cart = []; // { id, name, price, qty, stock }
  let pays = [{ method: 'CASH', amount: '' }];

  function say(text, kind = 'is-light') {
    els.message.className = `notification ${kind} pdv-message`;
    els.message.textContent = text;
    els.message.hidden = !text;
  }

  // ---------- Caixa ----------
  function renderRegister() {
    const open = Boolean(register);
    els.openCard.hidden = open;
    els.registerCard.hidden = !open;
    els.sale.hidden = !open;
    if (!open) return;
    els.since.textContent = `Aberto em ${new Date(register.openedAt).toLocaleString('pt-BR')} · troco inicial ${money(register.openingAmount)}`;
    els.kCount.textContent = String(register.salesCount);
    els.kTotal.textContent = money(register.salesTotal);
    els.kCash.textContent = register.expectedCash == null ? '-' : money(register.expectedCash);
    syncCashKpi();
    const hasFinance = register.cmv != null;
    document.querySelectorAll('[data-finance]').forEach((el) => { el.hidden = !hasFinance; });
    if (hasFinance) {
      els.kCmv.textContent = money(register.cmv);
      els.kProfit.textContent = money(register.profit);
    }
    const label = Object.fromEntries(METHODS);
    els.kMethods.textContent = register.payments.length
      ? 'Recebido: ' + register.payments.map((p) => `${label[p.method] || p.method} ${money(p.amount)}`).join(' · ')
      : '';
  }

  function syncCashKpi() {
    els.kCashCell.hidden = !register || register.expectedCash == null || !els.closeForm.hidden;
  }

  const fmtDiff = (d) => (d == null ? '-' : d === 0 ? 'Sem diferença' : d > 0 ? `Sobra ${money(d)}` : `Falta ${money(Math.abs(d))}`);

  async function loadHistory() {
    try {
      const { registers } = await api('/api/pdv/registers');
      els.historyBody.innerHTML = registers.length
        ? registers.map((r) => `<tr>
            <td>${escapeHtml(r.operatorName || '-')}</td>
            <td>${new Date(r.openedAt).toLocaleString('pt-BR')}</td>
            <td>${r.status === 'OPEN' ? 'Aberto' : 'Fechado'}</td>
            <td class="has-text-right">${r.expectedAmount == null ? '-' : money(r.expectedAmount)}</td>
            <td class="has-text-right">${r.countedAmount == null ? '-' : money(r.countedAmount)}</td>
            <td class="has-text-right">${escapeHtml(fmtDiff(r.difference))}</td></tr>`).join('')
        : '<tr class="is-empty"><td colspan="6">Nenhum caixa ainda.</td></tr>';
    } catch (_e) { /* historico e opcional */ }
  }

  function applyDiscountInfo() {
    els.discountBox.hidden = !discountInfo.allowed;
    els.discountHelp.textContent = discountInfo.unlimited ? 'Sem limite para o seu perfil.' : `Seu limite: ${discountInfo.limitPct}% do total da venda.`;
  }

  async function loadSession() {
    const res = await api('/api/pdv/session');
    register = res.register;
    discountInfo = res.discount || discountInfo;
    applyDiscountInfo();
    els.settingsCard.hidden = !(res.can && res.can.configure);
    if (res.can && res.can.configure) els.limit.value = String(discountInfo.limitPct).replace('.', ',');
    els.historyCard.hidden = !(res.can && res.can.manage);
    if (res.can && res.can.manage) loadHistory();
    renderRegister();
    if (register) els.search.focus();
  }

  els.openForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = els.opening.value.trim();
    const amount = raw === '' ? 0 : parseMoney(raw);
    if (!Number.isFinite(amount) || amount < 0) return say('Informe um valor de abertura válido.', 'is-danger');
    try {
      const res = await api('/api/pdv/registers/open', 'POST', { openingAmount: amount, note: els.openNote.value });
      register = res.register;
      els.closedCard.hidden = true;
      say('Caixa aberto.', 'is-success');
      renderRegister();
      els.search.focus();
    } catch (err) {
      say(err.message || 'Não foi possível abrir o caixa.', 'is-danger');
    }
  });

  els.moveToggle.addEventListener('click', () => { els.moveForm.hidden = !els.moveForm.hidden; els.closeForm.hidden = true; syncCashKpi(); });
  els.closeToggle.addEventListener('click', () => { els.closeForm.hidden = !els.closeForm.hidden; els.moveForm.hidden = true; syncCashKpi(); });

  els.moveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseMoney($('pdv-move-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) return say('Informe o valor da movimentação.', 'is-danger');
    try {
      const res = await api(`/api/pdv/registers/${register.id}/movements`, 'POST', {
        type: $('pdv-move-type').value,
        amount,
        reason: $('pdv-move-reason').value,
      });
      register = res.register;
      els.moveForm.reset();
      els.moveForm.hidden = true;
      say('Movimentação registrada.', 'is-success');
      renderRegister();
    } catch (err) {
      say(err.message || 'Não foi possível registrar.', 'is-danger');
    }
  });

  els.closeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const counted = parseMoney($('pdv-counted').value);
    if (!Number.isFinite(counted) || counted < 0) return say('Informe o dinheiro contado.', 'is-danger');
    try {
      const res = await api(`/api/pdv/registers/${register.id}/close`, 'POST', { countedAmount: counted, note: $('pdv-close-note').value });
      const r = res.register;
      const diff = r.difference;
      const verdict = diff === 0 ? 'Caixa conferido, sem diferença.' : diff > 0 ? `Sobra de ${money(diff)}.` : `Falta de ${money(Math.abs(diff))}.`;
      els.closedSummary.textContent = `Esperado ${money(r.expectedAmount)} · contado ${money(r.countedAmount)}. ${verdict} ${r.salesCount} venda(s), ${money(r.salesTotal)}.`;
      els.closedCard.hidden = false;
      els.closeForm.reset();
      els.closeForm.hidden = true;
      register = null;
      loadHistory();
      cart = [];
      renderCart();
      renderRegister();
      say('Caixa fechado.', 'is-success');
    } catch (err) {
      say(err.message || 'Não foi possível fechar o caixa.', 'is-danger');
    }
  });

  // ---------- Busca e carrinho ----------
  function addToCart(p) {
    const line = cart.find((l) => l.id === p.id);
    if (line) line.qty += 1;
    else cart.push({ id: p.id, name: p.name, price: Number(p.price), qty: 1, stock: p.stock });
    renderCart();
  }

  async function runSearch() {
    const q = els.search.value.trim();
    if (!q) { els.results.innerHTML = ''; return; }
    try {
      const { products } = await api(`/api/pdv/products?q=${encodeURIComponent(q)}`);
      const exact = products.find((p) => p.barcode && p.barcode === q);
      if (exact || products.length === 1) {
        addToCart(exact || products[0]);
        els.search.value = '';
        els.results.innerHTML = '';
        return;
      }
      els.results.innerHTML = products.length
        ? products.map((p) => `<li><button type="button" data-id="${escapeHtml(p.id)}"><span>${escapeHtml(p.name)}</span><span>${money(p.price)}${p.stock != null && p.stock <= 0 ? ' <span class="pdv-stock-low">sem estoque</span>' : ''}</span></button></li>`).join('')
        : '<li class="pdv-muted">Nenhum produto encontrado.</li>';
      els.results.dataset.products = JSON.stringify(products);
    } catch (err) {
      say(err.message || 'Falha na busca.', 'is-danger');
    }
  }

  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
  });
  els.results.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const list = JSON.parse(els.results.dataset.products || '[]');
    const p = list.find((x) => x.id === btn.dataset.id);
    if (p) {
      addToCart(p);
      els.search.value = '';
      els.results.innerHTML = '';
      els.search.focus();
    }
  });

  const grossTotal = () => cart.reduce((sum, l) => sum + Math.round(cents(l.price) * l.qty), 0);
  function discountCents() {
    if (!discountInfo.allowed) return 0;
    const n = parseMoney(els.discount.value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const gross = grossTotal();
    const c = els.discountType.value === 'PERCENT' ? Math.round((gross * n) / 100) : cents(n);
    return Math.min(c, gross);
  }
  const cartTotal = () => grossTotal() - discountCents();

  function refreshTotals() {
    const d = discountCents();
    els.discountLine.hidden = d <= 0;
    if (d > 0) els.discountLine.textContent = `Subtotal ${money(grossTotal() / 100)} · desconto -${money(d / 100)}`;
    els.total.textContent = money(cartTotal() / 100);
    updateBalance();
  }
  els.discount.addEventListener('input', refreshTotals);
  els.discountType.addEventListener('change', refreshTotals);

  function renderCart() {
    els.cartBody.innerHTML = cart.length
      ? cart.map((l) => `<tr>
          <td>${escapeHtml(l.name)}</td>
          <td class="has-text-right"><span class="pdv-qty">
            <button type="button" class="button is-light is-small" data-act="dec" data-id="${escapeHtml(l.id)}" aria-label="Diminuir">−</button>
            <span>${l.qty}</span>
            <button type="button" class="button is-light is-small" data-act="inc" data-id="${escapeHtml(l.id)}" aria-label="Aumentar">+</button></span></td>
          <td class="has-text-right">${money(l.price)}</td>
          <td class="has-text-right">${money(Math.round(cents(l.price) * l.qty) / 100)}</td>
          <td><button type="button" class="button is-light is-small" data-act="rm" data-id="${escapeHtml(l.id)}" aria-label="Remover ${escapeHtml(l.name)}">✕</button></td>
        </tr>`).join('')
      : '<tr class="is-empty"><td colspan="5">Nenhum item ainda.</td></tr>';
    refreshTotals();
    renderPays();
  }

  els.cartBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const line = cart.find((l) => l.id === btn.dataset.id);
    if (!line) return;
    if (btn.dataset.act === 'inc') line.qty += 1;
    else if (btn.dataset.act === 'dec') line.qty -= 1;
    else line.qty = 0;
    cart = cart.filter((l) => l.qty > 0);
    renderCart();
  });

  // ---------- Pagamento ----------
  function renderPays() {
    els.pays.innerHTML = pays.map((p, i) => `<div class="pdv-pay-row">
        <div class="select"><select data-pay="${i}" data-field="method" aria-label="Forma de pagamento">
          ${METHODS.map(([v, l]) => `<option value="${v}"${v === p.method ? ' selected' : ''}>${l}</option>`).join('')}
        </select></div>
        <input class="input" data-pay="${i}" data-field="amount" type="text" inputmode="decimal" placeholder="Valor (R$)" aria-label="Valor recebido" value="${escapeHtml(p.amount)}" />
        ${pays.length > 1 ? `<button type="button" class="button is-light is-small" data-rm-pay="${i}" aria-label="Remover forma">✕</button>` : ''}
      </div>`).join('');
    updateBalance();
  }

  function paidCents() {
    return pays.reduce((s, p) => {
      const n = parseMoney(p.amount);
      return s + (Number.isFinite(n) && n > 0 ? cents(n) : 0);
    }, 0);
  }

  function updateBalance() {
    const total = cartTotal();
    const paid = paidCents();
    const diff = paid - total;
    els.balance.classList.toggle('is-ok', total > 0 && diff >= 0);
    els.balance.classList.toggle('is-missing', total > 0 && diff < 0);
    els.balance.textContent = diff >= 0 ? `Troco: ${money(diff / 100)}` : `Falta: ${money(-diff / 100)}`;
    els.finish.disabled = !(total > 0 && diff >= 0);
  }

  els.pays.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pay == null) return;
    pays[Number(t.dataset.pay)][t.dataset.field] = t.value;
    updateBalance();
  });
  els.pays.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.field === 'method') pays[Number(t.dataset.pay)].method = t.value;
  });
  els.pays.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm-pay]');
    if (!btn) return;
    pays.splice(Number(btn.dataset.rmPay), 1);
    renderPays();
  });
  els.payAdd.addEventListener('click', () => {
    const missing = Math.max(0, cartTotal() - paidCents());
    pays.push({ method: 'PIX', amount: missing ? (missing / 100).toFixed(2).replace('.', ',') : '' });
    renderPays();
  });

  function resetSale() {
    cart = [];
    pays = [{ method: 'CASH', amount: '' }];
    els.discount.value = '';
    els.saleError.hidden = true;
    renderCart();
  }
  els.clear.addEventListener('click', () => { resetSale(); els.search.focus(); });

  els.finish.addEventListener('click', async () => {
    els.saleError.hidden = true;
    els.finish.disabled = true;
    try {
      const payments = pays
        .map((p) => ({ method: p.method, amount: parseMoney(p.amount) }))
        .filter((p) => Number.isFinite(p.amount) && p.amount > 0);
      const body = { items: cart.map((l) => ({ productId: l.id, quantity: l.qty })), payments };
      if (discountCents() > 0) body.discount = discountCents() / 100;
      const res = await api('/api/pdv/sales', 'POST', body);
      const change = res.change > 0 ? ` Troco: ${money(res.change)}.` : '';
      say(`Venda registrada: ${money(res.sale.total)}.${change}`, 'is-success');
      resetSale();
      await loadSession();
      els.search.focus();
    } catch (err) {
      els.saleError.textContent = err.message || 'Não foi possível finalizar a venda.';
      els.saleError.hidden = false;
      updateBalance();
    }
  });

  els.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pct = parseMoney(els.limit.value || '0');
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return say('Informe um limite entre 0 e 100%.', 'is-danger');
    try {
      const res = await api('/api/pdv/settings', 'PUT', { discountLimitPct: pct });
      discountInfo = res.discount;
      applyDiscountInfo();
      say('Limite de desconto salvo.', 'is-success');
    } catch (err) {
      say(err.message || 'Não foi possível salvar.', 'is-danger');
    }
  });

  async function start() {
    renderCart();
    try {
      await loadSession();
    } catch (err) {
      if (err && err.status === 403) { window.location.href = '/dashboard.html'; return; }
      say(err.message || 'Não foi possível carregar o caixa.', 'is-danger');
    }
  }
  start();
})();
