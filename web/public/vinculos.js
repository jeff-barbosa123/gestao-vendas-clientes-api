(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const messageBox = document.getElementById('links-message');
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-list');
  const linkProduct = document.getElementById('link-product');
  const linkRecipe = document.getElementById('link-recipe');
  const linkBtn = document.getElementById('link-btn');
  const unlinkBtn = document.getElementById('unlink-btn');
  const tableBody = document.getElementById('links-body');
  const linksSearch = document.getElementById('links-search');
  const linksStatusFilter = document.getElementById('links-status-filter');
  const clearFiltersBtn = document.getElementById('links-clear-filters');
  const linksCount = document.getElementById('links-count');
  const linksEmpty = document.getElementById('links-empty');
  const summaryLinked = document.getElementById('summary-linked');
  const summaryMissing = document.getElementById('summary-missing');
  const summaryIncomplete = document.getElementById('summary-incomplete');
  const summaryTotal = document.getElementById('summary-total');
  const insightLinked = document.getElementById('insight-linked-count');
  const insightMissing = document.getElementById('insight-missing-count');
  const insightIncomplete = document.getElementById('insight-incomplete-count');
  const previewProduct = document.getElementById('preview-product');
  const previewRecipe = document.getElementById('preview-recipe');
  const previewStatus = document.getElementById('preview-status');

  let products = [];
  let recipes = [];
  let recipesById = new Map();
  let messageTimer = null;

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  // Auth via cookie HttpOnly (token não deve existir no browser storage)
  const session = { token: null };

  async function ensureAuthOrRedirect() {
    try {
      const user = await window.apiGetMe();
      if (!user) {
        window.location.href = '/';
        return null;
      }
      return user;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/';
      return null;
    }
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || '';
    messageBox.classList.remove('is-success', 'is-danger');
    if (type) messageBox.classList.add(type);
    messageBox.hidden = !text;
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if (text) {
      const timeout = type === 'is-danger' ? 6500 : 4500;
      messageTimer = setTimeout(() => {
        messageBox.hidden = true;
        messageBox.textContent = '';
        messageBox.classList.remove('is-success', 'is-danger');
      }, timeout);
    }
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = payload && (payload.message || payload.error) ? payload.message || payload.error : 'Erro na API';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function formatCurrency(value) {
    if (!Number.isFinite(value)) return '-';
    return currencyFormatter.format(value);
  }

  function formatQuantity(value) {
    if (!Number.isFinite(value)) return '-';
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function normalizeSearch(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function getProductName(product) {
    return product.name || product.nome || product.id || '-';
  }

  function getRecipeName(recipe) {
    return recipe.name || recipe.nomeReceita || recipe.nome || recipe.titulo || 'Ficha t\u00e9cnica';
  }

  function getProductRecipeId(product) {
    return product.fichaTecnicaId || product.ficha_tecnica_id || '';
  }

  function isRecipeInactive(recipe) {
    const status = String(recipe.status || '').toUpperCase();
    return status === 'INACTIVE' || status === 'INATIVO' || status === 'INATIVA';
  }

  function isRecipeIncomplete(recipe) {
    if (!recipe) return true;
    const hasYield = Number.isFinite(recipe.yield);
    const hasCost = Number.isFinite(recipe.costPerUnit) || Number.isFinite(recipe.custoUnitarioFinal);
    const hasSuggested = Number.isFinite(recipe.priceSuggested) || Number.isFinite(recipe.preco_minimo_sugerido);
    return !hasYield || !hasCost || !hasSuggested || isRecipeInactive(recipe);
  }

  function getStatusKey(product, recipe) {
    if (!getProductRecipeId(product) || !recipe) return 'missing';
    if (isRecipeIncomplete(recipe)) return 'incomplete';
    return 'linked';
  }

  function getStatusLabel(statusKey, recipe) {
    if (statusKey === 'missing') return 'Sem ficha';
    if (statusKey === 'incomplete') {
      return isRecipeInactive(recipe) ? 'Ficha inativa' : 'Ficha incompleta';
    }
    return 'V\u00ednculo ok';
  }

  function updateSummary() {
    const total = products.length;
    let linked = 0;
    let missing = 0;
    let incomplete = 0;
    products.forEach((product) => {
      const recipe = recipesById.get(getProductRecipeId(product));
      const status = getStatusKey(product, recipe);
      if (status === 'linked') linked += 1;
      if (status === 'missing') missing += 1;
      if (status === 'incomplete') incomplete += 1;
    });
    if (summaryLinked) summaryLinked.textContent = String(linked);
    if (summaryMissing) summaryMissing.textContent = String(missing);
    if (summaryIncomplete) summaryIncomplete.textContent = String(incomplete);
    if (summaryTotal) summaryTotal.textContent = String(total);
    if (insightLinked) insightLinked.textContent = String(linked);
    if (insightMissing) insightMissing.textContent = String(missing);
    if (insightIncomplete) insightIncomplete.textContent = String(incomplete);
  }

  function renderSelect(select, items, placeholder, getLabel) {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = false;
    select.appendChild(placeholderOption);
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = getLabel(item);
      select.appendChild(opt);
    });
    if (previous && items.some((item) => String(item.id) === String(previous))) {
      select.value = previous;
    }
  }

  function renderSelects() {
    const sortedProducts = products.slice().sort((a, b) => {
      return String(getProductName(a)).localeCompare(String(getProductName(b)), 'pt-BR', { sensitivity: 'base' });
    });
    const sortedRecipes = recipes.slice().sort((a, b) => {
      return String(getRecipeName(a)).localeCompare(String(getRecipeName(b)), 'pt-BR', { sensitivity: 'base' });
    });
    renderSelect(linkProduct, sortedProducts, 'Selecione um produto', (item) => getProductName(item));
    renderSelect(linkRecipe, sortedRecipes, 'Selecione uma ficha', (item) => getRecipeName(item));
    updatePreview();
  }

  function updatePreview() {
    if (!previewProduct || !previewRecipe || !previewStatus) return;
    const productId = linkProduct ? linkProduct.value : '';
    const recipeId = linkRecipe ? linkRecipe.value : '';
    const product = products.find((item) => String(item.id) === String(productId));
    const linkedRecipeId = product ? getProductRecipeId(product) : '';
    const recipe = recipesById.get(recipeId || linkedRecipeId);
    const statusKey = product ? getStatusKey(product, recipe) : 'neutral';
    const statusLabel = product ? getStatusLabel(statusKey, recipe) : 'Sem informa\u00e7\u00e3o';
    previewProduct.textContent = `Produto: ${product ? getProductName(product) : '-'}`;
    previewRecipe.textContent = `Ficha: ${recipe ? getRecipeName(recipe) : '-'}`;
    previewStatus.textContent = '';
    const indicator = document.createElement('span');
    indicator.className = 'status-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    previewStatus.appendChild(indicator);
    previewStatus.appendChild(document.createTextNode(String(statusLabel || '')));
    previewStatus.classList.remove('is-linked', 'is-missing', 'is-incomplete', 'is-neutral');
    if (statusKey === 'neutral') {
      previewStatus.classList.add('is-neutral');
    } else {
      previewStatus.classList.add(`is-${statusKey}`);
    }
  }

  function getFilteredProducts() {
    const query = normalizeSearch(linksSearch ? linksSearch.value : '');
    const statusFilter = linksStatusFilter ? linksStatusFilter.value : '';
    return products.filter((product) => {
      const recipe = recipesById.get(getProductRecipeId(product));
      const statusKey = getStatusKey(product, recipe);
      if (statusFilter && statusFilter !== statusKey) return false;
      if (!query) return true;
      const productName = normalizeSearch(getProductName(product));
      const recipeName = normalizeSearch(recipe ? getRecipeName(recipe) : '');
      return productName.includes(query) || recipeName.includes(query);
    });
  }

  function buildActionButtons(product, recipe) {
    const actions = [];
    actions.push(
      `<button class="button is-light is-small" data-view-product-id="${product.id}" title="Ver produto e v\u00ednculo">Ver v\u00ednculo</button>`
    );
    if (recipe) {
      actions.push(
        `<button class="button is-light is-small" data-edit-recipe-id="${recipe.id}" title="Abrir ficha t\u00e9cnica">Ver ficha</button>`
      );
      actions.push(
        `<button class="button is-light is-small" data-simulate-recipe-id="${recipe.id}" title="Simular pre\u00e7o sugerido">Simular pre\u00e7o</button>`
      );
      actions.push(
        `<button class="button is-light is-small" data-change-link-id="${product.id}" title="Selecionar outra ficha">Alterar ficha</button>`
      );
      actions.push(
        `<button class="button is-light is-small" data-unlink-id="${product.id}" title="Remover ficha deste produto">Remover v\u00ednculo</button>`
      );
    } else {
      actions.push(
        `<button class="button is-link is-small" data-change-link-id="${product.id}" title="Adicionar ficha t\u00e9cnica">Vincular ficha</button>`
      );
    }
    return actions.join('');
  }

  function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const filtered = getFilteredProducts();
    if (linksCount) {
      const label = filtered.length === 1 ? 'produto' : 'produtos';
      linksCount.textContent = `${filtered.length} ${label}`;
    }
    if (linksEmpty) linksEmpty.hidden = filtered.length > 0;
    if (!filtered.length) return;
    filtered.forEach((product) => {
      const recipe = recipesById.get(getProductRecipeId(product));
      const statusKey = getStatusKey(product, recipe);
      const row = document.createElement('tr');
      row.classList.add('links-row', `is-${statusKey}`);
      const yieldValue = recipe && Number.isFinite(recipe.yield) ? recipe.yield : null;
      const yieldType = recipe ? recipe.yieldType || '' : '';
      const costUnit = recipe
        ? Number.isFinite(recipe.costPerUnit)
          ? recipe.costPerUnit
          : Number.isFinite(recipe.custoUnitarioFinal)
          ? recipe.custoUnitarioFinal
          : null
        : null;
      const suggested = recipe
        ? Number.isFinite(recipe.priceSuggested)
          ? recipe.priceSuggested
          : Number.isFinite(recipe.preco_minimo_sugerido)
          ? recipe.preco_minimo_sugerido
          : null
        : null;
      row.innerHTML = `
        <td data-label="Produto">${escapeHtml(getProductName(product))}</td>
        <td data-label="Ficha t\u00e9cnica">${escapeHtml(recipe ? getRecipeName(recipe) : 'Sem ficha')}</td>
        <td class="has-text-right" data-label="Rendimento">${yieldValue != null ? `${formatQuantity(yieldValue)} ${yieldType}`.trim() : '-'}</td>
      <td class="has-text-right" data-label="Custo unit\u00e1rio">${costUnit != null ? formatCurrency(costUnit) : '-'}</td>
        <td class="has-text-right" data-label="Pre\u00e7o sugerido">${suggested != null ? formatCurrency(suggested) : '-'}</td>
        <td data-label="Status">
          <span class="status-badge is-${statusKey}">
            <span class="status-indicator" aria-hidden="true"></span>
            ${escapeHtml(getStatusLabel(statusKey, recipe))}
          </span>
        </td>
        <td class="has-text-right" data-label="A\u00e7\u00f5es">
          <div class="links-actions-group">
            ${buildActionButtons(product, recipe)}
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  async function loadData(token) {
    const productData = await apiRequest('/api/products', token);
    const recipeData = await apiRequest('/api/recipes', token);
    products = Array.isArray(productData) ? productData : productData.items || [];
    recipes = Array.isArray(recipeData) ? recipeData : recipeData.items || [];
    recipesById = new Map(recipes.map((recipe) => [String(recipe.id), recipe]));
    renderSelects();
    updateSummary();
    renderTable();
  }

  function focusLinkForm(productId) {
    if (linkProduct) {
      linkProduct.value = String(productId || '');
      const selectedProduct = products.find((item) => String(item.id) === String(productId));
      const linkedRecipeId = selectedProduct ? getProductRecipeId(selectedProduct) : '';
      if (linkRecipe && linkedRecipeId) {
        linkRecipe.value = String(linkedRecipeId);
      }
    }
    updatePreview();
    if (linkRecipe) linkRecipe.focus();
  }

  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    loadData(null).catch((err) => showMessage(err.message, 'is-danger'));
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      ensureAuthOrRedirect().then((user) => {
        if (!user) return;
        loadData(null).catch((err) => showMessage(err.message, 'is-danger'));
      });
    });
  }

  if (linkProduct) {
    linkProduct.addEventListener('change', () => {
      const product = products.find((item) => String(item.id) === String(linkProduct.value));
      const linkedRecipeId = product ? getProductRecipeId(product) : '';
      if (linkRecipe) {
        linkRecipe.value = linkedRecipeId ? String(linkedRecipeId) : '';
      }
      updatePreview();
    });
  }

  if (linkRecipe) {
    linkRecipe.addEventListener('change', () => {
      updatePreview();
    });
  }

  if (linksSearch) {
    linksSearch.addEventListener('input', () => {
      renderTable();
    });
  }

  if (linksStatusFilter) {
    linksStatusFilter.addEventListener('change', () => {
      renderTable();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (linksSearch) linksSearch.value = '';
      if (linksStatusFilter) linksStatusFilter.value = '';
      renderTable();
    });
  }

  const quickFilterButtons = document.querySelectorAll('[data-quick-filter]');
  if (quickFilterButtons.length && linksStatusFilter) {
    quickFilterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.quickFilter || '';
        linksStatusFilter.value = value;
        renderTable();
      });
    });
  }

  if (linkBtn) {
    linkBtn.addEventListener('click', async () => {
      const productId = linkProduct ? linkProduct.value : '';
      const recipeId = linkRecipe ? linkRecipe.value : '';
      if (!productId || !recipeId) {
        showMessage('Selecione o produto e a ficha t\u00e9cnica.', 'is-danger');
        return;
      }
      linkBtn.classList.add('is-loading');
      linkBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/vincular-ficha`, null, {
          method: 'POST',
          body: JSON.stringify({ fichaTecnicaId: recipeId }),
        });
        showMessage('V\u00ednculo realizado.', 'is-success');
        await loadData(null);
        if (linkProduct) linkProduct.value = productId;
        if (linkRecipe) linkRecipe.value = recipeId;
        updatePreview();
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        linkBtn.classList.remove('is-loading');
        linkBtn.disabled = false;
      }
    });
  }

  if (unlinkBtn) {
    unlinkBtn.addEventListener('click', async () => {
      const productId = linkProduct ? linkProduct.value : '';
      if (!productId) {
        showMessage('Selecione um produto.', 'is-danger');
        return;
      }
      unlinkBtn.classList.add('is-loading');
      unlinkBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/remover-ficha`, null, {
          method: 'DELETE',
        });
        showMessage('V\u00ednculo removido.', 'is-success');
        await loadData(null);
        updatePreview();
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        unlinkBtn.classList.remove('is-loading');
        unlinkBtn.disabled = false;
      }
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', async (event) => {
      const viewBtn = event.target.closest('button[data-view-product-id]');
      if (viewBtn) {
        const productId = viewBtn.dataset.viewProductId;
        window.location.href = `/product-edit.html?id=${encodeURIComponent(productId)}`;
        return;
      }
      const editRecipeBtn = event.target.closest('button[data-edit-recipe-id]');
      if (editRecipeBtn) {
        const recipeId = editRecipeBtn.dataset.editRecipeId;
        window.location.href = `/recipe-edit.html?id=${encodeURIComponent(recipeId)}`;
        return;
      }
      const simulateBtn = event.target.closest('button[data-simulate-recipe-id]');
      if (simulateBtn) {
        const recipeId = simulateBtn.dataset.simulateRecipeId;
        window.location.href = `/simulacao.html?recipeId=${encodeURIComponent(recipeId)}`;
        return;
      }
      const changeBtn = event.target.closest('button[data-change-link-id]');
      if (changeBtn) {
        focusLinkForm(changeBtn.dataset.changeLinkId);
        return;
      }
      const btn = event.target.closest('button[data-unlink-id]');
      if (!btn) return;
      const productId = btn.dataset.unlinkId;
      if (!productId) return;
      btn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/remover-ficha`, null, {
          method: 'DELETE',
        });
        showMessage('V\u00ednculo removido.', 'is-success');
        await loadData(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
