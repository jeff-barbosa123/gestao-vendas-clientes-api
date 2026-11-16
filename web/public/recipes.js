/**
 * Tela de fichas de custo (entrada). MÃ³dulos em /recipes/*.js.
 */
import { DELETE_FLAG, PAGE_SIZE } from './recipes/constants.js';
import {
  addIngredientBtn,
  backBtn,
  componentAddAcabamento,
  componentAddAviamentos,
  componentAddBtn,
  componentAddCobertura,
  componentAddEmbalagem,
  componentAddMaoObra,
  componentAddMassa,
  componentAddMateriaPrima,
  componentDuplicateBtn,
  componentMoveDownBtn,
  componentMoveUpBtn,
  componentName,
  componentRemoveBtn,
  componentRename,
  componentRenameBtn,
  componentSelect,
  createDescription,
  createForm,
  createMargin,
  createMarginSuggestions,
  createName,
  createNameError,
  createOverhead,
  createOverheadSuggestions,
  createProfitFixed,
  createProfitTypeFixed,
  createProfitTypePercent,
  createSubmit,
  createYield,
  createYieldError,
  createYieldType,
  fillExample,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientUnit,
  ingredientsBody,
  nextPage,
  overheadAddBtn,
  overheadBody,
  overheadError,
  overheadItemName,
  overheadItemValue,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  recipesTotal,
  refreshBtn,
  searchInput,
  tableBody,
} from './recipes/dom.js';
import { state } from './recipes/state.js';
import {
  apiRequest,
  buildUrl,
  clearFieldError,
  ensureAuthOrRedirect,
  setFieldError,
  showMessage,
} from './recipes/core.js';
import {
  applyUnitNormalization,
  calculateIngredientCost,
  formatMoney,
  formatQuantity,
  normalizeKgValue,
  toNumber,
} from './recipes/calc.js';
import {
  validateCreateName,
  validateCreateYield,
  validateIngredientFields,
  validateName,
} from './recipes/validators.js';
import {
  bindQuickSuggestions,
  findCatalogIngredient,
  initCatalog,
  initMasks,
  loadIngredientCatalog,
  loadIngredientSuggestions,
  setMaskedValue,
} from './recipes/catalog.js';
import {
  addComponent,
  duplicateActiveComponent,
  ensureDefaultComponent,
  getActiveComponent,
  getAllIngredients,
  moveActiveComponent,
  removeActiveComponent,
  renameActiveComponent,
  renderComponentSelect,
  renderComponentsSummary,
  setActiveComponent,
  updateComponentSubtotal,
  updateComponentsTotal,
} from './recipes/components.js';
import {
  getOverheadValue,
  getProfitType,
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
  updateSubmitState,
} from './recipes/summary.js';
import {
  clearIngredientWarning,
  enforceKgLimits,
  isIngredientAdvancedOpen,
  renderIngredients,
  setIngredientAdvancedOpen,
  showIngredientSuccess,
  showIngredientWarning,
  updateIngredientUnitHints,
  updatePackQuantityWarning,
  updatePackUnitDisplay,
  updatePackUnitHints,
} from './recipes/ingredients.js';

initCatalog();

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} fichas`;
  }
  if (pageList) {
    pageList.innerHTML = '';
    const maxButtons = 5;
    let start = Math.max(1, state.currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let page = start; page <= end; page += 1) {
      const btn = document.createElement('button');
      btn.className = 'button is-light is-small';
      btn.textContent = String(page);
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

function formatStatusLabel(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE' || value === 'ATIVO' || value === 'ATIVA') return 'Ativa';
  if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'Inativa';
  return value ? value : '-';
}

function getStatusKey(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'INACTIVE';
  return 'ACTIVE';
}

function buildExportFilename(name, format) {
  const safe = String(name || 'ficha-tecnica')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${safe || 'ficha-tecnica'}.${format}`;
}

async function downloadExport(recipeId, name, format) {
  const url = buildUrl(`/api/recipes/${recipeId}/export?format=${encodeURIComponent(format)}`);
  try {
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Erro ao exportar.');
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = buildExportFilename(name, format);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  } catch (err) {
    showMessage(err.message, 'is-danger');
  }
}

function renderTable(items) {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!items || !items.length) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhuma ficha t\u00e9cnica encontrada. Cadastre a primeira acima.</td></tr>';
    return;
  }
  items.forEach((recipe) => {
    const row = document.createElement('tr');
    row.classList.add('recipes-row');
          const status = formatStatusLabel(recipe.status || 'ACTIVE');
    const statusKey = getStatusKey(recipe.status || 'ACTIVE');
    const unitCost = Number.isFinite(recipe.costPerUnit) ? recipe.costPerUnit : null;
    const suggestedUnit = Number.isFinite(recipe.priceSuggested) ? recipe.priceSuggested : null;
    const yieldValue = Number.isFinite(recipe.yield) ? recipe.yield : null;
    const totalPrice = suggestedUnit != null && yieldValue != null ? suggestedUnit * yieldValue : null;
    const tdName = document.createElement('td');
    const nameBtn = document.createElement('button');
    nameBtn.className = 'recipes-name-link';
    nameBtn.type = 'button';
    nameBtn.dataset.id = String(recipe.id ?? '');
    nameBtn.textContent = String(recipe.name || '-');
    tdName.appendChild(nameBtn);

    const tdYield = document.createElement('td');
    tdYield.className = 'has-text-right';
    tdYield.textContent = `${String(recipe.yield ?? '-')}${recipe.yieldType ? ` ${recipe.yieldType}` : ''}`;

    const tdUnitCost = document.createElement('td');
    tdUnitCost.className = 'has-text-right';
    tdUnitCost.textContent = `R$ ${unitCost != null ? formatMoney(unitCost) : '-'}`;

    const tdSuggested = document.createElement('td');
    tdSuggested.className = 'has-text-right';
    tdSuggested.textContent = `R$ ${suggestedUnit != null ? formatMoney(suggestedUnit) : '-'}`;

    const tdTotal = document.createElement('td');
    tdTotal.className = 'has-text-right';
    tdTotal.textContent = `R$ ${totalPrice != null ? formatMoney(totalPrice) : '-'}`;

    const tdStatus = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = `recipes-status${statusKey === 'INACTIVE' ? ' is-inactive' : ''}`;
    statusSpan.textContent = String(status || '');
    tdStatus.appendChild(statusSpan);

    const tdActions = document.createElement('td');
    tdActions.className = 'has-text-right';
    const btnEdit = document.createElement('button');
    btnEdit.className = 'button is-light is-small';
    btnEdit.type = 'button';
    btnEdit.dataset.editId = String(recipe.id ?? '');
    btnEdit.textContent = 'Editar';
    const btnCsv = document.createElement('button');
    btnCsv.className = 'button is-light is-small';
    btnCsv.type = 'button';
    btnCsv.dataset.exportId = String(recipe.id ?? '');
    btnCsv.dataset.format = 'csv';
    btnCsv.dataset.name = String(recipe.name || '');
    btnCsv.textContent = 'CSV';
    const btnPdf = document.createElement('button');
    btnPdf.className = 'button is-light is-small';
    btnPdf.type = 'button';
    btnPdf.dataset.exportId = String(recipe.id ?? '');
    btnPdf.dataset.format = 'pdf';
    btnPdf.dataset.name = String(recipe.name || '');
    btnPdf.textContent = 'PDF';
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnCsv);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnPdf);

    row.appendChild(tdName);
    row.appendChild(tdYield);
    row.appendChild(tdUnitCost);
    row.appendChild(tdSuggested);
    row.appendChild(tdTotal);
    row.appendChild(tdStatus);
    row.appendChild(tdActions);
    tableBody.appendChild(row);
  });
}

function renderPage() {
  const query = String(searchInput ? searchInput.value : '').toLowerCase();
  const filtered = state.recipesCache.filter((recipe) => {
    const name = String(recipe.name || '').toLowerCase();
    return name.includes(query);
  });
  const total = filtered.length;
  if (recipesTotal) recipesTotal.textContent = `(${total})`;
  updatePagination(total);
  const start = (state.currentPage - 1) * PAGE_SIZE;
  renderTable(filtered.slice(start, start + PAGE_SIZE));
}

async function loadRecipes(token) {
  const data = await apiRequest('/api/recipes', token);
  state.recipesCache = Array.isArray(data) ? data : data.items || [];
  state.currentPage = 1;
  renderPage();
}

ensureAuthOrRedirect().then((user) => {
  if (!user) return;
  loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
  const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
  if (deletedFlag) {
    sessionStorage.removeItem(DELETE_FLAG);
    showMessage('Ficha t\u00e9cnica removida.', 'is-success');
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
      loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
    });
  });
}

if (addIngredientBtn) {
  addIngredientBtn.addEventListener('click', () => {
    const name = ingredientName.value.trim();
    applyUnitNormalization(ingredientQty, ingredientUnit);
    applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
      state.packUnitTouched = true;
    });
    let quantity = toNumber(ingredientQty.value, 0.01);
    let pack = toNumber(ingredientPack.value, 0.01);
    let cost = toNumber(ingredientCost.value, 0);
    const unit = ingredientUnit ? ingredientUnit.value : '';
    const packUnit = ingredientPackUnit ? ingredientPackUnit.value : unit;
    const advancedOpen = isIngredientAdvancedOpen();
    const wantsPrice = advancedOpen || pack != null || cost != null;
    if (!name || quantity == null || !unit || (wantsPrice && (pack == null || cost == null))) {
      validateIngredientFields(true);
      showIngredientSuccess('');
      return;
    }
    if (!wantsPrice) {
      pack = 0;
      cost = 0;
    }
    if (unit === 'kg') {
      const adjustedQty = normalizeKgValue(quantity);
      if (adjustedQty !== quantity) {
        quantity = adjustedQty;
        ingredientQty.value = formatQuantity(quantity);
        showIngredientWarning(`Converti ${formatQuantity(adjustedQty * 1000)} g para ${formatQuantity(adjustedQty)} kg.`);
      }
      const limitedQty = enforceKgLimits(quantity, 'quantidade usada', 10);
      if (limitedQty == null) {
        return;
      }
    }
    if (wantsPrice && packUnit === 'kg') {
      const adjustedPack = normalizeKgValue(pack);
      if (adjustedPack !== pack) {
        pack = adjustedPack;
        ingredientPack.value = formatQuantity(pack);
        showIngredientWarning(`Converti ${formatQuantity(adjustedPack * 1000)} g para ${formatQuantity(adjustedPack)} kg.`);
      }
      const limitedPack = enforceKgLimits(pack, 'quantidade do pacote', 50);
      if (limitedPack == null) {
        return;
      }
      pack = limitedPack;
    }
    clearIngredientWarning();
    clearFieldError(ingredientName, ingredientError);
    showIngredientSuccess('Item adicionado.');
    const activeComponent = getActiveComponent();
    if (activeComponent) {
      activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit, component: activeComponent.name });
    }
    ingredientName.value = '';
    ingredientQty.value = '';
    ingredientPack.value = '';
    ingredientCost.value = '';
    renderIngredients();
  });
}

if (overheadAddBtn) {
  overheadAddBtn.addEventListener('click', () => {
    const name = overheadItemName ? overheadItemName.value.trim() : '';
    const value = toNumber(overheadItemValue ? overheadItemValue.value : null, 0.01);
    if (!name || value == null) {
      if (overheadError) {
        overheadError.textContent = 'Informe descri\u00e7\u00e3o e valor.';
        overheadError.hidden = false;
      }
      return;
    }
    if (overheadError) {
      overheadError.textContent = '';
      overheadError.hidden = true;
    }
    state.overheadItems.push({ name, value });
    if (overheadItemName) overheadItemName.value = '';
    if (overheadItemValue) overheadItemValue.value = '';
    renderOverheadItems();
  });
}

if (overheadBody) {
  overheadBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (Number.isInteger(index)) {
      state.overheadItems.splice(index, 1);
      renderOverheadItems();
    }
  });
}

if (ingredientsBody) {
  ingredientsBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const activeComponent = getActiveComponent();
    if (Number.isInteger(index) && activeComponent && Array.isArray(activeComponent.items)) {
      activeComponent.items.splice(index, 1);
      renderIngredients();
    }
  });
}

if (createForm) {
  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldError(createName, createNameError);
    clearFieldError(createYield, createYieldError);

    const name = createName.value.trim();
    const yieldValue = toNumber(createYield.value, 0.01);
    if (!validateName(name)) {
      setFieldError(createName, createNameError, 'Informe um nome com pelo menos 3 letras.');
      return;
    }
    if (yieldValue == null) {
      setFieldError(createYield, createYieldError, 'Informe um rendimento maior que zero.');
      return;
    }
    if (!getAllIngredients().length) {
      setFieldError(ingredientName, ingredientError, 'Adicione pelo menos um item em alguma parte.');
      return;
    }

    createSubmit.classList.add('is-loading');
    createSubmit.disabled = true;
    try {
      const ingredientsAll = getAllIngredients();
      const ingredientsTotal = ingredientsAll.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
      const overheadValue = getOverheadValue(ingredientsTotal);
      const baseTotal = ingredientsTotal + overheadValue;
      const profitType = getProfitType();
      let marginValue = 0;
      if (profitType === 'percent') {
        marginValue = (toNumber(createMargin.value, 0) || 0) / 100;
      } else {
        const fixedProfit = toNumber(createProfitFixed.value, 0) || 0;
        marginValue = baseTotal > 0 ? fixedProfit / baseTotal : 0;
      }
      const ingredientsPayload = ingredientsAll.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        packageQuantity: item.packageQuantity,
        cost: item.cost,
        unit: item.unit,
        packUnit: item.packUnit,
        component: item.component || undefined,
        ingredientId: item.ingredientId || undefined,
      }));
      await apiRequest('/api/recipes', null, {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: createDescription.value.trim() || undefined,
          yield: yieldValue,
          yieldType: createYieldType.value,
          overhead: overheadValue,
          overheadItems: state.overheadItems.map((item) => ({
            name: item.name,
            cost: toNumber(item.value, 0) || 0,
          })),
          labor: 0,
          margin: marginValue,
          ingredients: ingredientsPayload,
        }),
      });
      showMessage('Ficha t\u00e9cnica salva com sucesso.', 'is-success');
      createForm.reset();
      state.components = [];
      state.overheadItems = [];
      ensureDefaultComponent();
      renderComponentSelect();
      renderIngredients();
      renderOverheadItems();
      updateCostSummary();
      await loadRecipes(null);
    } catch (err) {
      showMessage(err.message, 'is-danger');
    } finally {
      createSubmit.classList.remove('is-loading');
      createSubmit.disabled = false;
    }
  });
}

if (tableBody) {
  tableBody.addEventListener('click', (event) => {
    const nameBtn = event.target.closest('button[data-id]');
    if (nameBtn) {
      const id = nameBtn.dataset.id;
      window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
      return;
    }
    const editBtn = event.target.closest('button[data-edit-id]');
    if (editBtn) {
      const id = editBtn.dataset.editId;
      window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
      return;
    }
    const exportBtn = event.target.closest('button[data-export-id]');
    if (exportBtn) {
      const id = exportBtn.dataset.exportId;
      const format = exportBtn.dataset.format || 'csv';
      const name = exportBtn.dataset.name || '';
      downloadExport(id, name, format);
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
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
    const totalPages = Math.ceil(state.recipesCache.length / PAGE_SIZE);
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
      state.currentPage = Math.max(1, value);
      renderPage();
    }
  });
}

if (pageJumpInput) {
  pageJumpInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        state.currentPage = Math.max(1, value);
        renderPage();
      }
    }
  });
}

function exportLocalStorageToJson() {
  const snapshot = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    snapshot[key] = localStorage.getItem(key);
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    localStorage: snapshot,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'sgvc-localstorage.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function clearLocalStorageSnapshot() {
  localStorage.clear();
}

window.sgvcExportLocalStorage = exportLocalStorageToJson;

window.sgvcClearLocalStorage = clearLocalStorageSnapshot;

[createYield, createOverhead, createProfitFixed, createMargin].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    updateCostSummary();
    updateSubmitState();
  });
});

if (createYieldType) {
  createYieldType.addEventListener('change', () => {
    updateCostSummary();
    updateSubmitState();
  });
}

if (ingredientUnit) {
  ingredientUnit.addEventListener('change', () => {
    if (ingredientPackUnit && !state.packUnitTouched) {
      ingredientPackUnit.value = ingredientUnit.value;
    }
    updatePackUnitDisplay();
    updateIngredientUnitHints();
    updatePackUnitHints();
  });
  ingredientUnit.addEventListener('change', () => validateIngredientFields(false));
}

    if (ingredientPackUnit) {
    ingredientPackUnit.addEventListener('change', () => {
      state.packUnitTouched = true;
      updatePackUnitHints();
      updatePackQuantityWarning();
    });
  }

  if (ingredientAdvancedToggle) {
  ingredientAdvancedToggle.addEventListener('click', () => {
    setIngredientAdvancedOpen(!isIngredientAdvancedOpen());
  });
}

[createName, createYield].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    if (input === createName) validateCreateName(true);
    if (input === createYield) validateCreateYield(true);
    updateSubmitState();
  });
  input.addEventListener('blur', () => {
    if (input === createName) validateCreateName(true);
    if (input === createYield) validateCreateYield(true);
    updateSubmitState();
  });
});

[ingredientName, ingredientQty, ingredientPack, ingredientCost].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    if (input === ingredientQty || input === ingredientPack || input === ingredientCost) {
      clearIngredientWarning('parse');
      clearIngredientWarning('kg');
    }
    if (input === ingredientPack) {
      updatePackQuantityWarning();
    }
    validateIngredientFields(false);
  });
  input.addEventListener('blur', () => {
    if (input === ingredientQty) {
      applyUnitNormalization(ingredientQty, ingredientUnit);
    }
    if (input === ingredientPack) {
      applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
        state.packUnitTouched = true;
      });
    }
    validateIngredientFields(true);
  });
});

if (componentAddBtn) {
  componentAddBtn.addEventListener('click', () => {
    if (!componentName) return;
    addComponent(componentName.value);
    componentName.value = '';
  });
}

if (componentName) {
  componentName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addComponent(componentName.value);
      componentName.value = '';
    }
  });
}

if (componentAddMassa) {
  componentAddMassa.addEventListener('click', () => addComponent('Massa'));
}

  if (componentAddCobertura) {
    componentAddCobertura.addEventListener('click', () => addComponent('Cobertura'));
  }

  if (componentAddEmbalagem) {
    componentAddEmbalagem.addEventListener('click', () => addComponent('Embalagem'));
  }

if (componentAddMaoObra) {
  componentAddMaoObra.addEventListener('click', () => addComponent('M\u00e3o de obra'));
}

if (componentAddAviamentos) {
  componentAddAviamentos.addEventListener('click', () => addComponent('Recheio'));
}

if (componentAddMateriaPrima) {
  componentAddMateriaPrima.addEventListener('click', () => addComponent('Mat\u00e9ria-prima'));
}

  if (componentAddAcabamento) {
    componentAddAcabamento.addEventListener('click', () => addComponent('Acabamento'));
  }

if (componentSelect) {
  componentSelect.addEventListener('change', () => {
    setActiveComponent(componentSelect.value);
  });
}

  if (componentRenameBtn) {
    componentRenameBtn.addEventListener('click', () => {
      if (!componentRename) return;
      renameActiveComponent(componentRename.value);
      componentRename.value = '';
    });
  }

  if (componentRename) {
    componentRename.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renameActiveComponent(componentRename.value);
        componentRename.value = '';
      }
    });
  }

  if (componentRemoveBtn) {
    componentRemoveBtn.addEventListener('click', () => {
      removeActiveComponent();
    });
  }

  if (componentDuplicateBtn) {
    componentDuplicateBtn.addEventListener('click', () => {
      duplicateActiveComponent();
    });
  }

  if (componentMoveUpBtn) {
    componentMoveUpBtn.addEventListener('click', () => {
      moveActiveComponent(-1);
    });
  }

  if (componentMoveDownBtn) {
    componentMoveDownBtn.addEventListener('click', () => {
      moveActiveComponent(1);
    });
  }

if (fillExample) {
  fillExample.addEventListener('click', () => {
    if (createName) createName.value = 'Bolo de Chocolate 1kg';
    if (createDescription) createDescription.value = 'Bolo simples com recheio';
    if (createYield) createYield.value = '10';
    if (createYieldType) createYieldType.value = 'UN';
    setMaskedValue(createOverhead, 5, state.overheadMask);
    setMaskedValue(createProfitFixed, 10, state.profitFixedMask);
    setMaskedValue(createMargin, 30, state.marginMask);
    if (createProfitTypeFixed) createProfitTypeFixed.checked = true;
    state.components = [
      {
        name: 'Massa',
        items: [
          { name: 'Farinha de trigo', quantity: 200, packageQuantity: 1000, cost: 6, unit: 'g', component: 'Massa' },
          { name: 'Acucar', quantity: 150, packageQuantity: 1000, cost: 5, unit: 'g', component: 'Massa' },
          { name: 'Ovos', quantity: 3, packageQuantity: 30, cost: 18, unit: 'un', component: 'Massa' },
        ],
      },
      {
        name: 'Cobertura',
        items: [
          { name: 'Chocolate', quantity: 200, packageQuantity: 1000, cost: 18, unit: 'g', component: 'Cobertura' },
        ],
      },
    ];
    renderComponentSelect();
    if (componentSelect) componentSelect.value = 'Massa';
    renderIngredients();
    showIngredientSuccess('Exemplo carregado.');
    validateCreateName(false);
    validateCreateYield(false);
    setIngredientAdvancedOpen(true);
  });
}

if (createProfitTypeFixed) {
  createProfitTypeFixed.addEventListener('change', () => updateProfitTypeUI());
}

if (createProfitTypePercent) {
  createProfitTypePercent.addEventListener('change', () => updateProfitTypeUI());
}

initMasks();

loadIngredientSuggestions().then(loadIngredientCatalog);

bindQuickSuggestions(createOverheadSuggestions, createOverhead, state.overheadMask);

bindQuickSuggestions(createMarginSuggestions, createMargin, state.marginMask, () => {
  if (createProfitTypePercent && !createProfitTypePercent.checked) {
    createProfitTypePercent.checked = true;
    updateProfitTypeUI();
  }
});

setIngredientAdvancedOpen(false);

updateProfitTypeUI();

updateIngredientUnitHints();

updatePackUnitDisplay();

updatePackUnitHints();

ensureDefaultComponent();

renderComponentSelect();

renderIngredients();

renderOverheadItems();

updateComponentsTotal();

updateCostSummary();

updateComponentSubtotal();

renderComponentsSummary();

updateSubmitState();
