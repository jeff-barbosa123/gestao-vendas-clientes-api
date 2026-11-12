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
  };

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

  function render() {
    const term = (els.search.value || '').trim().toLowerCase();
    const list = term ? items.filter((i) => i.name.toLowerCase().includes(term)) : items;
    els.count.textContent = `(${items.length})`;
    if (!list.length) {
      els.tbody.innerHTML = `<tr><td colspan="6">${
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
          <td><div class="ing-actions">
            <button class="button is-light is-small" type="button" data-edit="${i.id}">Editar preço</button>
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
      els.tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(friendlyError(err))}</td></tr>`;
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
