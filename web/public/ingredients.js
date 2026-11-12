/**
 * Tela de Insumos: cadastro único de ingredientes/embalagens.
 * Ao salvar um novo preço, a API recalcula as fichas técnicas e o custo dos produtos vinculados.
 */
(() => {
  const els = {
    form: document.getElementById('ing-form'),
    id: document.getElementById('ing-id'),
    name: document.getElementById('ing-name'),
    qty: document.getElementById('ing-qty'),
    unit: document.getElementById('ing-unit'),
    cost: document.getElementById('ing-cost'),
    error: document.getElementById('ing-error'),
    save: document.getElementById('ing-save'),
    cancel: document.getElementById('ing-cancel'),
    title: document.getElementById('form-title'),
    tbody: document.getElementById('ing-tbody'),
    count: document.getElementById('ing-count'),
    search: document.getElementById('ing-search'),
    message: document.getElementById('ing-message'),
    lowBanner: document.getElementById('ing-low-banner'),
    stock: {
      modal: document.getElementById('stock-modal'),
      title: document.getElementById('stock-title'),
      current: document.getElementById('stock-current'),
      error: document.getElementById('stock-error'),
      purchaseForm: document.getElementById('stock-purchase-form'),
      purchaseQty: document.getElementById('stock-purchase-qty'),
      purchaseUnit: document.getElementById('stock-purchase-unit'),
      purchaseCost: document.getElementById('stock-purchase-cost'),
      purchaseUpdate: document.getElementById('stock-purchase-update'),
      adjustForm: document.getElementById('stock-adjust-form'),
      adjustQty: document.getElementById('stock-adjust-qty'),
      adjustUnit: document.getElementById('stock-adjust-unit'),
      minForm: document.getElementById('stock-min-form'),
      minQty: document.getElementById('stock-min-qty'),
      minUnit: document.getElementById('stock-min-unit'),
      moves: document.getElementById('stock-moves'),
      disable: document.getElementById('stock-disable'),
    },
  };
  let stockItemId = null;
  let lastFocus = null;

  const UNIT_BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], un: ['un', 1] };
  let items = [];
  let highlightId = null;

  const money = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  const parseDecimal = (v) => {
    const s = String(v || '').trim();
    // aceita "395", "1,5", "1.5", "7,50" e "1.234,56"
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  };
  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showMessage(text, type = 'is-success') {
    if (!els.message) return;
    els.message.textContent = text;
    els.message.className = `notification is-light ing-message ${type}`;
    els.message.hidden = !text;
    if (text) setTimeout(() => (els.message.hidden = true), 7000);
  }

  function friendlyError(err) {
    const p = err && err.payload;
    return (p && (p.message || p.error)) || 'Não foi possível concluir. Tente novamente.';
  }

  function unitCostLabel(item) {
    const [baseUnit, factor] = UNIT_BASE[item.packageUnit] || [item.packageUnit, 1];
    const base = item.packageQuantity * factor;
    if (!base) return '-';
    const perBase = item.packageCost / base;
    // Para g e ml mostra por 100 (mais legível que centavos de grama)
    if (baseUnit === 'g' || baseUnit === 'ml') return `${money(perBase * 100)} / 100 ${baseUnit}`;
    return `${money(perBase)} / ${baseUnit}`;
  }

  // Estoque vem na unidade base (g, ml, un); mostra em kg/l quando passa de 1000
  function formatStock(value, baseUnit) {
    if (value == null) return null;
    const n = Number(value);
    const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
    if ((baseUnit === 'g' || baseUnit === 'ml') && Math.abs(n) >= 1000) {
      return `${fmt(n / 1000)} ${baseUnit === 'g' ? 'kg' : 'l'}`;
    }
    return `${fmt(n)} ${baseUnit}`;
  }

  function stockCell(i) {
    if (i.stockQuantity == null) return '<span class="ing-stock is-off">Sem controle</span>';
    const label = escapeHtml(formatStock(i.stockQuantity, i.stockUnit));
    if (i.lowStock) return `<span class="ing-stock is-low" title="Mínimo: ${escapeHtml(formatStock(i.minStock, i.stockUnit))}">${label} · Repor</span>`;
    return `<span class="ing-stock">${label}</span>`;
  }

  function renderLowBanner() {
    if (!els.lowBanner) return;
    const low = items.filter((i) => i.lowStock);
    els.lowBanner.hidden = !low.length;
    els.lowBanner.textContent = low.length
      ? `${low.length === 1 ? '1 insumo precisa' : `${low.length} insumos precisam`} de reposição: ${low
          .map((i) => `${i.name} (${formatStock(i.stockQuantity, i.stockUnit)})`)
          .join(', ')}.`
      : '';
  }

  function render() {
    renderLowBanner();
    const term = (els.search.value || '').trim().toLowerCase();
    const list = term ? items.filter((i) => i.name.toLowerCase().includes(term)) : items;
    els.count.textContent = `(${items.length})`;
    if (!list.length) {
      els.tbody.innerHTML = `<tr><td colspan="7">${
        items.length ? 'Nenhum insumo encontrado para a busca.' : 'Nenhum insumo cadastrado ainda. Comece pelo formulário acima.'
      }</td></tr>`;
      return;
    }
    els.tbody.innerHTML = list
      .map((i) => {
        const used = Number(i.usedInRecipes || 0);
        const qty = Number(i.packageQuantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
        return `<tr data-id="${i.id}" class="${i.id === highlightId ? 'ing-row-updated' : ''}">
          <td><strong>${escapeHtml(i.name)}</strong></td>
          <td>${qty} ${escapeHtml(i.packageUnit)}</td>
          <td class="has-text-right">${money(i.packageCost)}</td>
          <td class="has-text-right">${unitCostLabel(i)}</td>
          <td class="has-text-right"><span class="ing-usage ${used ? '' : 'is-zero'}">${used} ${used === 1 ? 'ficha' : 'fichas'}</span></td>
          <td class="has-text-right">${stockCell(i)}</td>
          <td><div class="ing-actions">
            <button class="button is-link is-light is-small" type="button" data-stock="${i.id}">Estoque</button>
            <button class="button is-light is-small" type="button" data-edit="${i.id}" title="Editar nome, embalagem e preço">Editar</button>
            <button class="button is-danger is-light is-small" type="button" data-delete="${i.id}">Excluir</button>
          </div></td>
        </tr>`;
      })
      .join('');
    highlightId = null;
  }

  async function load() {
    try {
      items = await window.apiRequest('/api/ingredients');
      render();
    } catch (err) {
      if (err && (err.status === 401 || err.status === 403)) {
        window.location.href = '/';
        return;
      }
      els.tbody.innerHTML = `<tr><td colspan="7">${escapeHtml(friendlyError(err))}</td></tr>`;
    }
  }

  function resetForm() {
    els.form.reset();
    els.id.value = '';
    els.title.textContent = 'Novo insumo';
    els.save.textContent = 'Salvar insumo';
    els.cancel.hidden = true;
    els.error.hidden = true;
  }

  function startEdit(id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    els.id.value = item.id;
    els.name.value = item.name;
    els.qty.value = String(item.packageQuantity).replace('.', ',');
    els.unit.value = item.packageUnit;
    els.cost.value = Number(item.packageCost).toFixed(2).replace('.', ',');
    els.title.textContent = `Editar: ${item.name}`;
    els.save.textContent = 'Salvar e recalcular fichas';
    els.cancel.hidden = false;
    els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.cost.focus();
  }

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.error.hidden = true;
    const payload = {
      name: els.name.value.trim(),
      packageQuantity: parseDecimal(els.qty.value),
      packageUnit: els.unit.value,
      packageCost: parseDecimal(els.cost.value),
    };
    if (!payload.name) return showFieldError('Informe o nome do insumo.', els.name);
    if (!(payload.packageQuantity > 0)) return showFieldError('Informe o tamanho da embalagem (maior que zero).', els.qty);
    if (!(payload.packageCost >= 0)) return showFieldError('Informe o preço pago (pode ser 0).', els.cost);

    const id = els.id.value;
    els.save.disabled = true;
    try {
      const saved = await window.apiRequest(id ? `/api/ingredients/${id}` : '/api/ingredients', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      highlightId = saved.id;
      const recalculated = (saved.recalculatedRecipes || []).length;
      showMessage(
        id
          ? recalculated
            ? `Preço atualizado. ${recalculated} ${recalculated === 1 ? 'ficha técnica foi recalculada' : 'fichas técnicas foram recalculadas'}, junto com o custo dos produtos vinculados.`
            : 'Insumo atualizado.'
          : 'Insumo cadastrado. Agora ele aparece como sugestão nas fichas técnicas.'
      );
      const failed = saved.recalculationErrors || [];
      if (failed.length) {
        showMessage(
          `Preço salvo, mas ${failed.length} ficha(s) não puderam ser recalculadas: ` +
            failed.map((f) => `${f.name || 'ficha'} (${f.error})`).join('; '),
          'is-warning'
        );
      }
      resetForm();
      await load();
    } catch (err) {
      showFieldError(friendlyError(err));
    } finally {
      els.save.disabled = false;
    }
  });

  function showFieldError(text, field) {
    els.error.textContent = text;
    els.error.hidden = false;
    if (field) field.focus();
  }

  els.cancel.addEventListener('click', resetForm);
  els.search.addEventListener('input', render);

  els.tbody.addEventListener('click', async (event) => {
    const stockId = event.target.getAttribute('data-stock');
    if (stockId) return openStock(stockId);
    const editId = event.target.getAttribute('data-edit');
    const deleteId = event.target.getAttribute('data-delete');
    if (editId) startEdit(editId);
    if (deleteId) {
      const item = items.find((i) => i.id === deleteId);
      const used = Number((item && item.usedInRecipes) || 0);
      const ok = window.confirm(
        used
          ? `Excluir "${item.name}"? As ${used} ficha(s) que usam este insumo mantêm o último preço, mas deixam de ser atualizadas automaticamente.`
          : `Excluir "${item ? item.name : 'insumo'}"?`
      );
      if (!ok) return;
      try {
        await window.apiRequest(`/api/ingredients/${deleteId}`, { method: 'DELETE' });
        showMessage('Insumo excluído.');
        await load();
      } catch (err) {
        showMessage(friendlyError(err), 'is-danger');
      }
    }
  });

  // ---------- Janela de estoque ----------
  const MOVE_LABELS = { PURCHASE: 'Compra', SALE: 'Venda', SALE_CANCEL: 'Venda cancelada', ADJUST: 'Contagem' };
  const unitsFor = (base) => (base === 'g' ? ['g', 'kg'] : base === 'ml' ? ['ml', 'l'] : ['un']);

  function fillUnits(select, item) {
    const allowed = unitsFor(item.stockUnit);
    [...select.options].forEach((opt) => {
      opt.hidden = !allowed.includes(opt.value);
      opt.disabled = !allowed.includes(opt.value);
    });
    select.value = allowed.includes(item.packageUnit) ? item.packageUnit : allowed[0];
  }

  function stockError(text) {
    els.stock.error.textContent = text || '';
    els.stock.error.hidden = !text;
  }

  function renderStockHeader(item) {
    els.stock.title.textContent = item.name;
    if (item.stockQuantity == null) {
      els.stock.current.textContent = 'Sem controle de estoque. Registre uma compra ou uma contagem para começar.';
    } else {
      const min = item.minStock == null ? 'sem aviso' : `aviso em ${formatStock(item.minStock, item.stockUnit)}`;
      els.stock.current.textContent = `Em estoque: ${formatStock(item.stockQuantity, item.stockUnit)} (${min})${item.lowStock ? ' · precisa repor' : ''}`;
    }
    els.stock.current.classList.toggle('is-low', Boolean(item.lowStock));
    els.stock.disable.hidden = item.stockQuantity == null;
  }

  async function loadMoves(id) {
    els.stock.moves.innerHTML = '<li>Carregando...</li>';
    try {
      const moves = await window.apiRequest(`/api/ingredients/${id}/stock/movements`);
      const item = items.find((i) => i.id === id);
      if (!moves.length) {
        els.stock.moves.innerHTML = '<li class="is-empty">Nenhuma movimentação ainda.</li>';
        return;
      }
      els.stock.moves.innerHTML = moves
        .slice(0, 10)
        .map((m) => {
          const when = new Date(m.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
          const sign = m.quantity > 0 ? '+' : '';
          return `<li><span class="ing-move-type is-${m.type.toLowerCase()}">${MOVE_LABELS[m.type] || m.type}</span>
            <span class="ing-move-qty">${sign}${escapeHtml(formatStock(m.quantity, item ? item.stockUnit : ''))}</span>
            <span class="ing-move-when">${when}${m.note ? ` · ${escapeHtml(m.note)}` : ''}</span></li>`;
        })
        .join('');
    } catch (err) {
      els.stock.moves.innerHTML = `<li>${escapeHtml(friendlyError(err))}</li>`;
    }
  }

  function openStock(id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    stockItemId = id;
    lastFocus = document.activeElement;
    stockError('');
    [els.stock.purchaseQty, els.stock.purchaseCost, els.stock.adjustQty].forEach((input) => (input.value = ''));
    els.stock.purchaseUpdate.checked = true;
    [els.stock.purchaseUnit, els.stock.adjustUnit, els.stock.minUnit].forEach((sel) => fillUnits(sel, item));
    els.stock.minQty.value = '';
    if (item.minStock != null) {
      // mostra o mínimo na unidade do insumo (ex.: 500 g, ou 1,5 kg se a embalagem for em kg)
      const factor = UNIT_BASE[els.stock.minUnit.value] ? UNIT_BASE[els.stock.minUnit.value][1] : 1;
      els.stock.minQty.value = String(item.minStock / factor).replace('.', ',');
    }
    renderStockHeader(item);
    els.stock.modal.hidden = false;
    document.body.classList.add('ing-modal-open');
    els.stock.purchaseQty.focus();
    loadMoves(id);
  }

  function closeStock() {
    els.stock.modal.hidden = true;
    document.body.classList.remove('ing-modal-open');
    stockItemId = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  async function afterStockChange(updated, message) {
    await load();
    const fresh = items.find((i) => i.id === stockItemId) || updated;
    if (fresh) renderStockHeader(fresh);
    showMessage(message);
    if (stockItemId) loadMoves(stockItemId);
  }

  async function submitStock(event, { path, method = 'POST', body, button, message }) {
    event.preventDefault();
    stockError('');
    if (!stockItemId) return;
    button.disabled = true;
    try {
      const updated = await window.apiRequest(`/api/ingredients/${stockItemId}/stock/${path}`, {
        method,
        body: JSON.stringify(body),
      });
      await afterStockChange(updated, typeof message === 'function' ? message(updated) : message);
      // Limpa só os campos do formulário salvo (o mínimo continua mostrando o valor atual)
      if (path === 'purchases') [els.stock.purchaseQty, els.stock.purchaseCost].forEach((input) => (input.value = ''));
      if (path === 'adjust') els.stock.adjustQty.value = '';
    } catch (err) {
      stockError(friendlyError(err));
    } finally {
      button.disabled = false;
    }
  }

  els.stock.purchaseForm.addEventListener('submit', (event) => {
    const quantity = parseDecimal(els.stock.purchaseQty.value);
    if (!(quantity > 0)) {
      event.preventDefault();
      stockError('Informe a quantidade comprada.');
      return els.stock.purchaseQty.focus();
    }
    const costRaw = els.stock.purchaseCost.value.trim();
    const body = { quantity, unit: els.stock.purchaseUnit.value };
    if (costRaw) {
      const totalCost = parseDecimal(costRaw);
      if (!(totalCost >= 0)) {
        event.preventDefault();
        stockError('Valor pago inválido.');
        return els.stock.purchaseCost.focus();
      }
      body.totalCost = totalCost;
      body.updatePrice = els.stock.purchaseUpdate.checked;
    }
    return submitStock(event, {
      path: 'purchases',
      body,
      button: document.getElementById('stock-purchase-save'),
      message: (u) => {
        const n = (u.recalculatedRecipes || []).length;
        return n
          ? `Compra registrada. Preço atualizado e ${n} ${n === 1 ? 'ficha recalculada' : 'fichas recalculadas'}.`
          : 'Compra registrada no estoque.';
      },
    });
  });

  els.stock.adjustForm.addEventListener('submit', (event) => {
    const quantity = parseDecimal(els.stock.adjustQty.value);
    if (!(quantity >= 0) || els.stock.adjustQty.value.trim() === '') {
      event.preventDefault();
      stockError('Informe quanto tem em estoque agora (pode ser 0).');
      return els.stock.adjustQty.focus();
    }
    return submitStock(event, {
      path: 'adjust',
      body: { quantity, unit: els.stock.adjustUnit.value },
      button: document.getElementById('stock-adjust-save'),
      message: 'Contagem salva.',
    });
  });

  els.stock.minForm.addEventListener('submit', (event) => {
    const raw = els.stock.minQty.value.trim();
    const minStock = raw ? parseDecimal(raw) : null;
    if (raw && !(minStock >= 0)) {
      event.preventDefault();
      stockError('Estoque mínimo inválido.');
      return els.stock.minQty.focus();
    }
    return submitStock(event, {
      path: 'min',
      method: 'PUT',
      body: { minStock, unit: els.stock.minUnit.value },
      button: document.getElementById('stock-min-save'),
      message: raw ? 'Estoque mínimo salvo.' : 'Aviso de reposição desligado.',
    });
  });

  els.stock.disable.addEventListener('click', async () => {
    if (!stockItemId) return;
    if (!window.confirm('Desligar o controle de estoque deste insumo? As vendas deixam de descontar dele.')) return;
    try {
      const updated = await window.apiRequest(`/api/ingredients/${stockItemId}/stock`, { method: 'DELETE' });
      await afterStockChange(updated, 'Controle de estoque desligado.');
    } catch (err) {
      stockError(friendlyError(err));
    }
  });

  els.stock.modal.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-stock')) closeStock();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.stock.modal.hidden) closeStock();
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
    await load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
