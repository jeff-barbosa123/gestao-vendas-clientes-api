/**
 * Tela de produtos (entrada). MÃ³dulos em /products/*.js.
 */
import { DELETE_FLAG, PAGE_SIZE, UPDATED_FLAG } from './products/constants.js';
import {
  backBtn,
  createCostUnit,
  createDescription,
  createFinalPrice,
  createFinalPriceHint,
  createForm,
  createName,
  createNameError,
  createNameHelp,
  createPrice,
  createPriceError,
  createPriceSuggested,
  createPriceSuggestedHelp,
  createPriceSuggestion,
  createProfit,
  createPurchasePrice,
  createPurchasePriceError,
  createRecipeError,
  createRecipeId,
  createRecipeSearch,
  createStatus,
  createSubmit,
  filterClear,
  filterPriceMax,
  filterPriceMin,
  filterStatus,
  filterType,
  nameHeader,
  nextPage,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  priceHeader,
  productTypeProduced,
  productTypeResale,
  productsTotal,
  refreshBtn,
  resaleCalcMargin,
  resaleCalcMarkup,
  resalePercent,
  resalePercentHelp,
  searchInput,
  tableBody,
} from './products/dom.js';
import { state } from './products/state.js';
import {
  apiRequest,
  clearFieldError,
  ensureAuthOrRedirect,
  escapeHtml,
  handleAuthFailure,
  normalizeError,
  setFieldError,
  showMessage,
} from './products/core.js';
import { standardizeText, updateNameGuidance, validateName } from './products/text.js';
import { bindCurrencyInput, formatCurrency, formatPrice, parsePrice } from './products/money.js';
import {
  getSelectedProductType,
  setProductType,
  updateProductTypeCards,
} from './products/product-type.js';
import { applyRecipeSearch, getSelectedRecipe, loadRecipes } from './products/recipes.js';

function updateFinalPriceHint(customized) {
  if (!createFinalPriceHint) return;
  if (customized) {
    createFinalPriceHint.innerHTML = '<span class="final-price-badge">Pre\u00e7o personalizado</span>';
    return;
  }
  createFinalPriceHint.textContent = 'Se deixar vazio, o sistema usa o pre\u00e7o sugerido.';
}

function updateProducedSuggestionHelp(costUnit, suggested) {
  if (!createPriceSuggestedHelp) return;
  if (!Number.isFinite(costUnit) || !Number.isFinite(suggested) || suggested <= 0) {
    createPriceSuggestedHelp.textContent = 'O preço sugerido será calculado a partir da ficha técnica.';
    return;
  }
  if (costUnit > 0) {
    const margin = ((suggested - costUnit) / costUnit) * 100;
    const formattedMargin = Number.isFinite(margin) ? `${margin.toFixed(0)}%` : '';
    createPriceSuggestedHelp.textContent = `Base: custo ${formatCurrency(costUnit)} + ${formattedMargin} = ${formatCurrency(
        suggested
      )}.`;
    return;
  }
  createPriceSuggestedHelp.textContent = `Base calculada pela ficha: ${formatCurrency(suggested)}.`;
}

export function updateProducedPricing() {
  const recipe = getSelectedRecipe();
  if (!createCostUnit || !createPriceSuggested) return;
  if (!recipe) {
    createCostUnit.textContent = '-';
    createPriceSuggested.textContent = '-';
    if (createRecipeId) {
      createRecipeId.classList.remove('is-danger');
    }
    if (createPurchasePrice) createPurchasePrice.value = '';
    if (createPrice) createPrice.value = '';
    if (createFinalPrice && createFinalPrice.value) {
      createFinalPrice.value = '';
    }
    if (createRecipeError) {
      createRecipeError.textContent = '';
      createRecipeError.hidden = true;
    }
    updateProducedSuggestionHelp(null, null);
    updateFinalPriceHint(false);
    return;
  }
  const costUnit = Number(recipe.costPerUnit ?? recipe.custoUnitarioFinal ?? 0);
  const suggested = Number(recipe.priceSuggested ?? recipe.preco_minimo_sugerido ?? 0);
  createCostUnit.textContent = formatCurrency(costUnit);
  createPriceSuggested.textContent = formatCurrency(suggested);
  updateProducedSuggestionHelp(costUnit, suggested);
  if (createPurchasePrice) createPurchasePrice.value = formatCurrency(costUnit);
  const override = parsePrice(createFinalPrice ? createFinalPrice.value : null);
  const finalPrice = Number.isFinite(override) ? override : suggested;
  if (createPrice) createPrice.value = formatCurrency(finalPrice);
  updateFinalPriceHint(override != null && override !== suggested);
}

export function updateResaleProfit() {
  if (!createProfit) return;
  const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
  const price = parsePrice(createPrice ? createPrice.value : null);
  if (purchase == null || price == null) {
    createProfit.textContent = '-';
    return;
  }
  const profit = price - purchase;
  const percentOnCost = purchase > 0 ? (profit / purchase) * 100 : 0;
  const percentOnSale = price > 0 ? (profit / price) * 100 : 0;
  const mode = resaleCalcMarkup && resaleCalcMarkup.checked ? 'markup' : 'margin';
  const percentValue = mode === 'markup' ? percentOnCost : percentOnSale;
  const label = mode === 'markup' ? 'sobre custo' : 'sobre venda';
  createProfit.textContent = `${formatCurrency(profit)} (${percentValue.toFixed(0)}% ${label})`;
}

function getResaleCalcMode() {
  return resaleCalcMarkup && resaleCalcMarkup.checked ? 'markup' : 'margin';
}

export function updateResalePercentHelp() {
  if (!resalePercentHelp) return;
  const mode = getResaleCalcMode();
  resalePercentHelp.textContent =
    mode === 'markup'
      ? 'Percentual sobre o custo de compra.'
      : 'Margem sobre o pre\u00e7o de venda.';
}

function updateResaleSuggestionHelp() {
  if (!createPriceSuggestion) return;
  const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
  const percent = parsePrice(resalePercent ? resalePercent.value : null);
  const price = parsePrice(createPrice ? createPrice.value : null);
  if (purchase == null || percent == null) {
    createPriceSuggestion.textContent = 'Informe o custo e o percentual para visualizar a sugestao.';
    return;
  }
  const mode = getResaleCalcMode();
  let suggestedPrice = price;
  if (suggestedPrice == null) {
    if (mode === 'markup') {
      suggestedPrice = purchase * (1 + percent / 100);
    } else if (percent < 100) {
      suggestedPrice = purchase / (1 - percent / 100);
    }
  }
  if (suggestedPrice == null) {
    createPriceSuggestion.textContent = '';
    return;
  }
  const label = mode === 'markup' ? 'markup' : 'margem';
  createPriceSuggestion.textContent = `Sugestao: compra ${formatCurrency(purchase)} + ${label} ${percent.toFixed(
      0
    )}% = ${formatCurrency(suggestedPrice)}.`;
}

export function applyResalePricingRule() {
  const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
  const percent = parsePrice(resalePercent ? resalePercent.value : null);
  if (purchase == null || percent == null) return;
  const mode = getResaleCalcMode();
  let price = null;
  if (mode === 'markup') {
    price = purchase * (1 + percent / 100);
  } else {
    if (percent >= 100) return;
    price = purchase / (1 - percent / 100);
  }
  if (createPrice) createPrice.value = formatCurrency(price);
  updateResaleProfit();
  updateResaleSuggestionHelp();
}

function syncPercentFromPrice() {
  const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
  const price = parsePrice(createPrice ? createPrice.value : null);
  if (purchase == null || price == null || !resalePercent) return;
  const profit = price - purchase;
  const mode = getResaleCalcMode();
  const percent = mode === 'markup'
    ? purchase > 0 ? (profit / purchase) * 100 : 0
    : price > 0 ? (profit / price) * 100 : 0;
  resalePercent.value = percent.toFixed(0);
  updateResaleProfit();
  updateResaleSuggestionHelp();
}

function updateSortLabel() {
  if (!nameHeader) return;
  if (state.sortField === 'name') {
    nameHeader.textContent = state.sortAsc ? 'Nome A-Z' : 'Nome Z-A';
    nameHeader.setAttribute('aria-sort', state.sortAsc ? 'ascending' : 'descending');
  } else {
    nameHeader.textContent = 'Nome';
    nameHeader.setAttribute('aria-sort', 'none');
  }
  if (priceHeader) {
    priceHeader.setAttribute('aria-sort', state.sortField === 'price' ? (state.sortAsc ? 'ascending' : 'descending') : 'none');
  }
}

function getFilteredItems() {
  const query = String(searchInput ? searchInput.value : '').toLowerCase();
  const typeValue = String(filterType ? filterType.value : '').toLowerCase();
  const statusValue = String(filterStatus ? filterStatus.value : '').toUpperCase();
  const minPrice = parsePrice(filterPriceMin ? filterPriceMin.value : null);
  const maxPrice = parsePrice(filterPriceMax ? filterPriceMax.value : null);
  const baseList = state.productsCache.slice().sort((a, b) => {
    if (state.sortField === 'price') {
      const aPrice = Number(a.price ?? a.precoVenda ?? 0);
      const bPrice = Number(b.price ?? b.precoVenda ?? 0);
      const order = aPrice - bPrice;
      return state.sortAsc ? order : -order;
    }
    const aName = String(a.name || '');
    const bName = String(b.name || '');
    const order = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
    return state.sortAsc ? order : -order;
  });
  return baseList.filter((product) => {
    const name = String(product.name || '').toLowerCase();
    const description = String(product.description || '').toLowerCase();
    const matchesQuery = !query || name.includes(query) || description.includes(query);
    if (!matchesQuery) return false;

    if (statusValue) {
      const status = String(product.status || product.status_produto || 'ATIVO').toUpperCase();
      if (status !== statusValue) return false;
    }

    if (typeValue) {
      const typeRaw = (product.productType || product.product_type || '').toString().toLowerCase();
      const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
      const inferred = typeRaw ? typeRaw : hasRecipe ? 'produced' : 'resale';
      if (inferred !== typeValue) return false;
    }

    const priceValue = Number(product.price ?? product.precoVenda ?? 0);
    if (minPrice != null && priceValue < minPrice) return false;
    if (maxPrice != null && priceValue > maxPrice) return false;

    return true;
  });
}

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} produtos`;
  }
  if (pageList) {
    pageList.innerHTML = '';
    const maxButtons = 5;
    let start = Math.max(1, state.currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    if (start > 1) {
      const first = document.createElement('button');
      first.className = 'button is-light is-small';
      first.textContent = '1';
      first.setAttribute('aria-label', 'P\u00e1gina 1');
      first.addEventListener('click', () => {
        state.currentPage = 1;
        renderPage();
      });
      pageList.appendChild(first);
      if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'products-page-ellipsis';
        dots.textContent = '...';
        pageList.appendChild(dots);
      }
    }
    for (let page = start; page <= end; page += 1) {
      const btn = document.createElement('button');
      btn.className = 'button is-light is-small';
      btn.textContent = String(page);
      btn.setAttribute('aria-label', `P\u00e1gina ${page}`);
      if (page === state.currentPage) {
        btn.classList.add('is-link');
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', () => {
        state.currentPage = page;
        renderPage();
      });
      pageList.appendChild(btn);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'products-page-ellipsis';
        dots.textContent = '...';
        pageList.appendChild(dots);
      }
      const last = document.createElement('button');
      last.className = 'button is-light is-small';
      last.textContent = String(totalPages);
      last.setAttribute('aria-label', `P\u00e1gina ${totalPages}`);
      last.addEventListener('click', () => {
        state.currentPage = totalPages;
        renderPage();
      });
      pageList.appendChild(last);
    }
  }
  if (prevPage) prevPage.disabled = state.currentPage === 1;
  if (nextPage) nextPage.disabled = state.currentPage === totalPages;
  if (pageJumpInput) {
    pageJumpInput.value = String(state.currentPage);
    pageJumpInput.max = String(totalPages);
    pageJumpInput.disabled = totalPages <= 1;
  }
  if (pageJumpBtn) pageJumpBtn.disabled = totalPages <= 1;
}

function renderTable(items) {
  tableBody.innerHTML = '';
  if (!items || !items.length) {
    tableBody.innerHTML =
      '<tr class="products-empty"><td colspan="7">Nenhum produto encontrado. Tente buscar por outro nome.</td></tr>';
    return;
  }
  items.forEach((product) => {
    const row = document.createElement('tr');
    row.classList.add('products-row');
    const safeName = product.name || 'Sem nome';
    const status = (product.status || product.status_produto || 'ATIVO').toUpperCase();
    const statusClass = status === 'INATIVO' ? 'products-status is-inactive' : 'products-status';
    const priceValue = product.price ?? product.precoVenda ?? 0;
    const typeValue = (product.productType || product.product_type || '').toString().toLowerCase();
    const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
    const isProduced = typeValue === 'produced' ? true : typeValue === 'resale' ? false : hasRecipe;
    const typeClass = isProduced ? 'products-type is-produced' : 'products-type is-resale';
    const typeLabel = isProduced ? 'Produzido' : 'Revenda';
    const recipeName = Array.isArray(state.recipesCache) && state.recipesCache.length > 0
      ? (state.recipesCache.find((recipe) => recipe && recipe.id === (product.fichaTecnicaId || product.ficha_tecnica_id))?.name || '-')
      : '-';
    row.innerHTML = `
        <td>
          <button
            class="products-name-link"
            type="button"
            data-id="${product.id}"
            aria-label="Editar produto ${escapeHtml(safeName)}"
          >
            ${escapeHtml(safeName)}
          </button>
        </td>
        <td>${escapeHtml(product.description || '-')}</td>
        <td><span class="${typeClass}">${typeLabel}</span></td>
        <td>${escapeHtml(recipeName)}</td>
        <td class="has-text-right">R$ ${formatPrice(priceValue)}</td>
        <td><span class="${statusClass}">${escapeHtml(status)}</span></td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-edit-id="${product.id}">Editar</button>
        </td>
      `;
    tableBody.appendChild(row);
  });
}

export function renderPage() {
  const filtered = getFilteredItems();
  const total = filtered.length;
  if (productsTotal) {
    productsTotal.textContent = `(${total})`;
  }
  updatePagination(total);
  updateSortLabel();
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  renderTable(pageItems);
}

async function loadProducts(token) {
  try {
    const data = await apiRequest('/api/products', token);
    state.productsCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
    state.currentPage = 1;
    renderPage();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return;
    }
    // Em caso de erro, garante que productsCache seja um array vazio
    state.productsCache = [];
    if (err && (err.status === 401 || err.status === 403)) {
      // Erro de autenticação - redireciona para login
      window.location.href = '/';
      return;
    }
    // Para outros erros, renderiza página vazia
    state.currentPage = 1;
    renderPage();
    throw err; // Re-lança para tratamento pelo chamador
  }
}

ensureAuthOrRedirect().then((user) => {
  if (!user) return;

  const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
  if (deletedFlag) {
    sessionStorage.removeItem(DELETE_FLAG);
    showMessage('Produto removido com sucesso.', 'is-success');
  }

  const updatedFlag = sessionStorage.getItem(UPDATED_FLAG);
  if (updatedFlag) {
    sessionStorage.removeItem(UPDATED_FLAG);
    showMessage('Produto atualizado.', 'is-success');
  }

  loadProducts(null).catch((err) => {
    if (err && err.name === 'AbortError') {
      return;
    }
    if (err && (err.status === 401 || err.status === 403)) {
      window.location.href = '/';
      return;
    }
    showMessage(err && err.message ? err.message : 'Erro ao carregar produtos.', 'is-danger');
  });
  loadRecipes(null).catch((err) => {
    if (err && err.name === 'AbortError') {
      return;
    }
    if (err && (err.status === 401 || err.status === 403)) {
      window.location.href = '/';
      return;
    }
    showMessage(err && err.message ? err.message : 'Erro ao carregar fichas técnicas.', 'is-danger');
  });
});

// carregamento inicial agora ocorre no gate de auth (ensureAuthOrRedirect)

window.addEventListener('pageshow', (event) => {
  const flag = sessionStorage.getItem(UPDATED_FLAG);
  if (flag) {
    sessionStorage.removeItem(UPDATED_FLAG);
    showMessage('Produto atualizado.', 'is-success');
    loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
    return;
  }
  if (event.persisted) {
    loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
  }
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
      loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
    });
  });
}

if (createForm) {
  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = standardizeText(createName.value, 'name');
    const description = standardizeText(createDescription.value, 'description');
    createName.value = name;
    createDescription.value = description;
    const productType = getSelectedProductType();
    const purchasePriceValue = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
    const priceValue = parsePrice(createPrice ? createPrice.value : null);
    const status = createStatus.value;

    clearFieldError(createName, createNameError);
    clearFieldError(createPurchasePrice, createPurchasePriceError);
    clearFieldError(createPrice, createPriceError);

    if (!validateName(name)) {
      setFieldError(createName, createNameError, 'Nome deve ter 3 a 120 caracteres.');
      return;
    }
    if (productType === 'produced') {
  const recipe = getSelectedRecipe();
  if (!recipe) {
    if (createRecipeError) {
      createRecipeError.textContent = 'Selecione uma ficha t\u00e9cnica.';
      createRecipeError.hidden = false;
    }
    if (createRecipeId) {
      createRecipeId.classList.add('is-danger');
      createRecipeId.focus();
    }
    return;
  }
      updateProducedPricing();
      if (parsePrice(createPurchasePrice.value) == null) {
        setFieldError(createPurchasePrice, createPurchasePriceError, 'Informe o pre\u00e7o de compra.');
        return;
      }
      if (parsePrice(createPrice.value) == null) {
        setFieldError(createPrice, createPriceError, 'Informe o pre\u00e7o de venda.');
        return;
      }
    } else {
      if (purchasePriceValue == null) {
        setFieldError(createPurchasePrice, createPurchasePriceError, 'Informe o pre\u00e7o de compra.');
        return;
      }
      if (priceValue == null) {
        setFieldError(createPrice, createPriceError, 'Informe o pre\u00e7o de venda.');
        return;
      }
    }

    createSubmit.classList.add('is-loading');
    createSubmit.disabled = true;
    try {
      const payload = {
        name,
        description,
        purchase_price: parsePrice(createPurchasePrice.value),
        price: parsePrice(createPrice.value),
        status,
        statusProduto: status,
        productType,
      };
      if (productType === 'produced') {
        payload.fichaTecnicaId = createRecipeId ? createRecipeId.value : null;
      }
      await apiRequest('/api/products', null, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showMessage('Produto criado com sucesso.', 'is-success');
      createForm.reset();
      setProductType(getSelectedProductType());
      updateProducedPricing();
      updateResaleProfit();
      if (typeof updateProductTypeCards === 'function') updateProductTypeCards();
      await loadProducts(null);
      await loadRecipes(null);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      showMessage((err && err.message ? err.message : 'Erro ao cadastrar produto.'), 'is-danger');
    } finally {
      createSubmit.classList.remove('is-loading');
      createSubmit.disabled = false;
    }
  });
}

if (tableBody) {
  tableBody.addEventListener('click', (event) => {
    const btn = event.target.closest('.products-name-link');
    const editBtn = event.target.closest('button[data-edit-id]');
    const id = (btn && btn.dataset.id) || (editBtn && editBtn.dataset.editId);
    if (!id) return;
    window.location.href = `/product-edit.html?id=${encodeURIComponent(id)}`;
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    state.currentPage = 1;
    renderPage();
  });
}

[filterType, filterStatus, filterPriceMin, filterPriceMax].forEach((el) => {
  if (!el) return;
  el.addEventListener('input', () => {
    state.currentPage = 1;
    renderPage();
  });
  el.addEventListener('change', () => {
    state.currentPage = 1;
    renderPage();
  });
});

if (filterClear) {
  filterClear.addEventListener('click', () => {
    if (filterType) filterType.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterPriceMin) filterPriceMin.value = '';
    if (filterPriceMax) filterPriceMax.value = '';
    state.currentPage = 1;
    renderPage();
  });
}

if (nameHeader) {
  nameHeader.addEventListener('click', () => {
    state.sortField = 'name';
    state.sortAsc = !state.sortAsc;
    state.currentPage = 1;
    renderPage();
  });
}

if (priceHeader) {
  priceHeader.addEventListener('click', () => {
    if (state.sortField !== 'price') {
      state.sortField = 'price';
      state.sortAsc = false;
    } else {
      state.sortAsc = !state.sortAsc;
    }
    state.currentPage = 1;
    renderPage();
  });
}

if (prevPage) {
  prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      renderPage();
    }
  });
}

if (nextPage) {
  nextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredItems().length / PAGE_SIZE);
    if (state.currentPage < totalPages) {
      state.currentPage += 1;
      renderPage();
    }
  });
}

function goToPage(targetPage) {
  const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
  const next = Math.min(Math.max(1, targetPage), totalPages);
  if (next !== state.currentPage) {
    state.currentPage = next;
    renderPage();
  }
}

if (pageJumpBtn) {
  pageJumpBtn.addEventListener('click', () => {
    if (!pageJumpInput) return;
    const value = Number(pageJumpInput.value);
    if (Number.isFinite(value)) {
      goToPage(Math.trunc(value));
    }
  });
}

if (pageJumpInput) {
  pageJumpInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        goToPage(Math.trunc(value));
      }
    }
  });
}

if (createName) {
  createName.addEventListener('input', () => {
    if (validateName(createName.value)) {
      clearFieldError(createName, createNameError);
    }
    updateNameGuidance(createName, createNameHelp);
  });
  createName.addEventListener('blur', () => {
    const standardized = standardizeText(createName.value, 'name');
    if (standardized !== createName.value) {
      createName.value = standardized;
    }
    updateNameGuidance(createName, createNameHelp);
  });
  updateNameGuidance(createName, createNameHelp);
}

if (createDescription) {
  createDescription.addEventListener('blur', () => {
    const standardized = standardizeText(createDescription.value, 'description');
    if (standardized !== createDescription.value) {
      createDescription.value = standardized;
    }
  });
}

if (createPrice) {
  bindCurrencyInput(createPrice, () => {
    state.resaleCalcSource = 'price';
    if (parsePrice(createPrice.value) != null) {
      clearFieldError(createPrice, createPriceError);
    }
    syncPercentFromPrice();
  });
}

if (createPurchasePrice) {
  bindCurrencyInput(createPurchasePrice, () => {
    if (parsePrice(createPurchasePrice.value) != null) {
      clearFieldError(createPurchasePrice, createPurchasePriceError);
    }
    if (state.resaleCalcSource === 'price') {
      syncPercentFromPrice();
    } else {
      applyResalePricingRule();
    }
  });
}

if (createFinalPrice) {
  bindCurrencyInput(createFinalPrice, () => updateProducedPricing());
}

if (createRecipeSearch) {
  createRecipeSearch.addEventListener('input', () => {
    applyRecipeSearch();
  });
}

if (createRecipeId) {
  createRecipeId.addEventListener('change', () => {
    if (createRecipeError) {
      createRecipeError.textContent = '';
      createRecipeError.hidden = true;
    }
    createRecipeId.classList.remove('is-danger');
    updateProducedPricing();
  });
}

if (productTypeProduced) {
  productTypeProduced.addEventListener('change', () => setProductType('produced'));
}

if (productTypeResale) {
  productTypeResale.addEventListener('change', () => setProductType('resale'));
}

[resaleCalcMargin, resaleCalcMarkup].forEach((el) => {
  if (!el) return;
  el.addEventListener('change', () => {
    state.resaleCalcSource = 'percent';
    updateResalePercentHelp();
    applyResalePricingRule();
  });
});

if (resalePercent) {
  resalePercent.addEventListener('input', () => {
    state.resaleCalcSource = 'percent';
    applyResalePricingRule();
  });
  resalePercent.addEventListener('blur', () => {
    const parsed = parsePrice(resalePercent.value);
    if (parsed != null) {
      resalePercent.value = parsed.toFixed(0);
    }
    applyResalePricingRule();
  });
}

if (filterPriceMin) {
  bindCurrencyInput(filterPriceMin, renderPage);
}

if (filterPriceMax) {
  bindCurrencyInput(filterPriceMax, renderPage);
}

setProductType(getSelectedProductType());

updateResaleProfit();

updateResalePercentHelp();

updateResaleSuggestionHelp();

updateProductTypeCards();

if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    showMessage('');
    refreshBtn.classList.add('is-loading');
    refreshBtn.disabled = true;
    ensureAuthOrRedirect()
      .then((user) => {
        if (!user) return Promise.resolve();
        return Promise.all([loadProducts(null), loadRecipes(null)]);
      })
      .catch((err) => {
      if (handleAuthFailure(err)) return;
      const friendlyMessage = normalizeError(err);
      showMessage(friendlyMessage || 'Erro ao atualizar produtos. Tente novamente.', 'is-danger');
    })
      .finally(() => {
      refreshBtn.classList.remove('is-loading');
      refreshBtn.disabled = false;
    });
  });
}

if (prevPage) {
  prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      renderPage();
    }
  });
}

if (nextPage) {
  nextPage.addEventListener('click', () => {
    const filtered = getFilteredItems();
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (state.currentPage < totalPages) {
      state.currentPage += 1;
      renderPage();
    }
  });
}

if (pageJumpBtn && pageJumpInput) {
  pageJumpBtn.addEventListener('click', () => {
    const value = Number(pageJumpInput.value);
    if (Number.isFinite(value) && value > 0) {
      const filtered = getFilteredItems();
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      const targetPage = Math.min(Math.max(1, Math.trunc(value)), totalPages);
      state.currentPage = targetPage;
      renderPage();
    }
  });

  pageJumpInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      pageJumpBtn.click();
    }
  });
}

if (searchInput) {
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.currentPage = 1;
      renderPage();
    }, 300);
  });
}

if (nameHeader) {
  nameHeader.addEventListener('click', () => {
    if (state.sortField !== 'name') {
      state.sortField = 'name';
      state.sortAsc = true;
    } else {
      state.sortAsc = !state.sortAsc;
    }
    state.currentPage = 1;
    renderPage();
  });
}

if (priceHeader) {
  priceHeader.addEventListener('click', () => {
    if (state.sortField !== 'price') {
      state.sortField = 'price';
      state.sortAsc = false;
    } else {
      state.sortAsc = !state.sortAsc;
    }
    state.currentPage = 1;
    renderPage();
  });
}

if (filterType) {
  filterType.addEventListener('change', () => {
    state.currentPage = 1;
    renderPage();
  });
}

if (filterStatus) {
  filterStatus.addEventListener('change', () => {
    state.currentPage = 1;
    renderPage();
  });
}

if (filterClear) {
  filterClear.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (filterType) filterType.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterPriceMin) filterPriceMin.value = '';
    if (filterPriceMax) filterPriceMax.value = '';
    state.currentPage = 1;
    renderPage();
  });
}

// Event listeners para botões de editar na tabela
if (tableBody) {
  tableBody.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit-id]');
    const nameLink = event.target.closest('[data-id]');
    
    if (editBtn) {
      const productId = editBtn.getAttribute('data-edit-id');
      if (productId) {
        window.location.href = `/product-edit.html?id=${productId}`;
      }
    } else if (nameLink) {
      const productId = nameLink.getAttribute('data-id');
      if (productId) {
        window.location.href = `/product-edit.html?id=${productId}`;
      }
    }
  });
}
