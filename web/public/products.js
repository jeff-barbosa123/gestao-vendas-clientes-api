/**
 * Tela de produtos (entrada). MÃ³dulos em /products/*.js.
 */
import { DELETE_FLAG, PAGE_SIZE, UPDATED_FLAG } from './products/constants.js';
import {
  backBtn,
  createDescription,
  createFinalPrice,
  createForm,
  createName,
  createNameError,
  createNameHelp,
  createPrice,
  createPriceError,
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
  pageJumpBtn,
  pageJumpInput,
  prevPage,
  priceHeader,
  productTypeProduced,
  productTypeResale,
  refreshBtn,
  resaleCalcMargin,
  resaleCalcMarkup,
  resalePercent,
  searchInput,
  tableBody,
} from './products/dom.js';
import { state } from './products/state.js';
import {
  apiRequest,
  clearFieldError,
  ensureAuthOrRedirect,
  handleAuthFailure,
  normalizeError,
  setFieldError,
  showMessage,
} from './products/core.js';
import { standardizeText, updateNameGuidance, validateName } from './products/text.js';
import { bindCurrencyInput, parsePrice } from './products/money.js';
import {
  getSelectedProductType,
  setProductType,
  updateProductTypeCards,
} from './products/product-type.js';
import { applyRecipeSearch, getSelectedRecipe, loadRecipes } from './products/recipes.js';
import {
  applyResalePricingRule,
  syncPercentFromPrice,
  updateProducedPricing,
  updateResalePercentHelp,
  updateResaleProfit,
  updateResaleSuggestionHelp,
} from './products/pricing.js';
import { getFilteredItems, goToPage, loadProducts, renderPage } from './products/list.js';

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
