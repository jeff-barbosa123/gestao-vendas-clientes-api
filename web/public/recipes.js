/**
 * Tela de fichas de custo (entrada). MÃ³dulos em /recipes/*.js.
 */
import { DELETE_FLAG, PAGE_SIZE } from './recipes/constants.js';
import {
  addIngredientBtn,
  backBtn,
  calcStatus,
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
  createOverheadWarning,
  createProfitFixed,
  createProfitFixedSection,
  createProfitPercentSection,
  createProfitTypeFixed,
  createProfitTypePercent,
  createSubmit,
  createYield,
  createYieldError,
  createYieldType,
  fillExample,
  ingredientAdvanced,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientSuccess,
  ingredientUnit,
  ingredientUnitHelp,
  ingredientUnitWarning,
  ingredientsBody,
  nextPage,
  overheadAddBtn,
  overheadBody,
  overheadError,
  overheadItemName,
  overheadItemValue,
  overheadTotalEl,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  recipesTotal,
  refreshBtn,
  searchInput,
  summaryOverhead,
  summaryOverheadLabel,
  summaryProfit,
  summaryProfitType,
  summarySuggested,
  summaryTotal,
  summaryUnit,
  summaryYield,
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
  normalizeQuantity,
  parseLocaleNumber,
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

initCatalog();

export function setIngredientAdvancedOpen(isOpen) {
  if (!ingredientAdvanced || !ingredientAdvancedToggle) return;
  ingredientAdvanced.classList.toggle('is-open', isOpen);
  ingredientAdvanced.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  ingredientAdvancedToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

export function isIngredientAdvancedOpen() {
  return Boolean(ingredientAdvanced && ingredientAdvanced.classList.contains('is-open'));
}

export function showIngredientSuccess(message) {
  if (!ingredientSuccess) return;
  ingredientSuccess.textContent = message || '';
  ingredientSuccess.hidden = !message;
  if (state.ingredientTimer) {
    clearTimeout(state.ingredientTimer);
    state.ingredientTimer = null;
  }
  if (message) {
    state.ingredientTimer = setTimeout(() => {
      ingredientSuccess.hidden = true;
      ingredientSuccess.textContent = '';
    }, 2500);
  }
}

export function renderIngredients() {
  if (!ingredientsBody) return;
  ingredientsBody.innerHTML = '';
  const activeComponent = getActiveComponent();
  const items = activeComponent ? activeComponent.items || [] : [];
  if (!items.length) {
    const label = activeComponent
      ? `Nenhum item em ${activeComponent.name}. Use o formul\u00e1rio acima para incluir o primeiro.`
      : 'Nenhum item adicionado. Use o formul\u00e1rio acima para incluir o primeiro.';
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.textContent = label;
    emptyRow.appendChild(emptyCell);
    ingredientsBody.appendChild(emptyRow);
    updateComponentsTotal();
    updateCostSummary();
    renderComponentSelect();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateSubmitState();
    return;
  }
  items.forEach((item, index) => {
    const realCost = calculateIngredientCost(item);
    const unit = item.unit || 'g';
    const packUnit = item.packUnit || unit;
    const qtyRaw = parseLocaleNumber(item.quantity);
    const packRaw = parseLocaleNumber(item.packageQuantity);
    const costRaw = parseLocaleNumber(item.cost);
    const qtyNorm = normalizeQuantity(item.quantity, unit);
    const packNorm = normalizeQuantity(item.packageQuantity, packUnit);
    const unitLabel = unit ? ` ${unit}` : '';
    const packUnitLabel = packUnit ? ` ${packUnit}` : '';
    const calcText =
      Number.isFinite(qtyRaw) && Number.isFinite(packRaw) && Number.isFinite(costRaw) &&
      Number.isFinite(qtyNorm) && Number.isFinite(packNorm) && packNorm > 0
        ? `R$ ${formatMoney(costRaw)} / ${formatQuantity(packRaw)}${packUnitLabel} x ${formatQuantity(qtyRaw)}${unitLabel} = R$ ${formatMoney(realCost)}`
        : '';
    const row = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = String(item.name || '');

    const tdQty = document.createElement('td');
    tdQty.className = 'has-text-right';
    tdQty.textContent = `${formatQuantity(Number(item.quantity))}${unitLabel}`;

    const tdCost = document.createElement('td');
    tdCost.className = 'has-text-right';
    const costWrap = document.createElement('div');
    costWrap.className = 'ingredient-cost-wrap';
    const costDiv = document.createElement('div');
    costDiv.className = 'ingredient-cost';
    costDiv.textContent = `R$ ${formatMoney(realCost)}`;
    costWrap.appendChild(costDiv);
    if (calcText) {
      const tip = document.createElement('span');
      tip.className = 'calc-tip';
      tip.setAttribute('data-tooltip', calcText);
      tip.tabIndex = 0;
      tip.setAttribute('role', 'img');
      tip.setAttribute('aria-label', 'Ver cálculo');
      tip.textContent = 'ℹ';
      costWrap.appendChild(document.createTextNode(' '));
      costWrap.appendChild(tip);
    }
    tdCost.appendChild(costWrap);

    const tdActions = document.createElement('td');
    tdActions.className = 'has-text-right';
    const btnRemove = document.createElement('button');
    btnRemove.className = 'button is-light is-small';
    btnRemove.dataset.index = String(index);
    btnRemove.type = 'button';
    btnRemove.textContent = 'Remover';
    tdActions.appendChild(btnRemove);

    row.appendChild(tdName);
    row.appendChild(tdQty);
    row.appendChild(tdCost);
    row.appendChild(tdActions);
    ingredientsBody.appendChild(row);
  });
  updateComponentsTotal();
  updateCostSummary();
  renderComponentSelect();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateSubmitState();
}

function getRecipeFormState() {
  const nameValue = createName ? String(createName.value || '').trim() : '';
  const yieldValue = toNumber(createYield ? createYield.value : null, 0.01);
  const hasName = nameValue.length >= 3;
  const hasYield = yieldValue != null;
  const hasItems = getAllIngredients().length > 0;
  return { nameValue, yieldValue, hasName, hasYield, hasItems };
}

function getOverheadPercentValue() {
  const percent = toNumber(createOverhead ? createOverhead.value : null, 0);
  if (createOverheadWarning) {
    createOverheadWarning.textContent = '';
    createOverheadWarning.hidden = true;
  }
  if (percent == null) {
    return 0;
  }
  if (percent > 15) {
    if (createOverheadWarning) {
      createOverheadWarning.textContent = 'Acima do limite: o c\u00e1lculo usa 15%.';
      createOverheadWarning.hidden = false;
    }
    return 15;
  }
  return percent;
}

function getOverheadValue(ingredientsTotal) {
  const percent = getOverheadPercentValue();
  const base = Number.isFinite(ingredientsTotal) ? ingredientsTotal : 0;
  const percentValue = base * (percent / 100);
  const extraTotal = state.overheadItems.reduce((sum, item) => {
    const value = toNumber(item.value, 0);
    return sum + (value || 0);
  }, 0);
  return percentValue + extraTotal;
}

function renderOverheadItems() {
  if (!overheadBody) return;
  overheadBody.innerHTML = '';
  if (!state.overheadItems.length) {
    overheadBody.innerHTML = '<tr class="empty-row"><td colspan="3">Nenhum custo extra informado.</td></tr>';
  } else {
    state.overheadItems.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${item.name}</td>
          <td class="has-text-right">R$ ${formatMoney(toNumber(item.value, 0) || 0)}</td>
          <td class="has-text-right">
            <button class="button is-light is-small" data-index="${index}">Remover</button>
          </td>
        `;
      overheadBody.appendChild(row);
    });
  }
  const itemsTotal = state.overheadItems.reduce((sum, item) => sum + (toNumber(item.value, 0) || 0), 0);
  if (overheadTotalEl) {
    overheadTotalEl.textContent = `R$ ${formatMoney(itemsTotal)}`;
  }
  updateCostSummary();
  updateSubmitState();
}

export function updateCostSummary() {
  if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
    return;
  }
  const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  const overheadValue = getOverheadValue(ingredientsTotal);
  const overheadItemsTotal = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const overheadPercent = getOverheadPercentValue();
  const formState = getRecipeFormState();
  const placeholder = 'Preencha os dados acima';

  if (!formState.hasName || !formState.hasYield || !formState.hasItems) {
    if (summaryOverhead) {
      summaryOverhead.textContent = placeholder;
    }
    if (summaryOverheadLabel) {
      summaryOverheadLabel.textContent = 'Gastos extras (aguardando dados)';
    }
    summaryTotal.textContent = placeholder;
    summaryUnit.textContent = placeholder;
    summarySuggested.textContent = placeholder;
    summaryProfit.textContent = placeholder;
    summaryYield.textContent = placeholder;
    summaryProfitType.textContent = 'Aguardando dados para calcular';
    return;
  }
  if (summaryOverhead) {
    summaryOverhead.textContent = `R$ ${formatMoney(overheadValue)}`;
  }
  if (summaryOverheadLabel) {
    if (overheadPercent > 0) {
      summaryOverheadLabel.textContent = `Gastos extras (${overheadPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)`; // 15% e não 15,00%
    } else if (overheadItemsTotal > 0) {
      summaryOverheadLabel.textContent = 'Gastos extras (itens)';
    } else {
      summaryOverheadLabel.textContent = 'Gastos extras (n\u00e3o informado)';
    }
  }
  const totalCost = ingredientsTotal + overheadValue;
  const yieldValue = formState.yieldValue || 0;
  const marginPercent = toNumber(createMargin.value, 0) || 0;
  const fixedProfit = toNumber(createProfitFixed.value, 0) || 0;
  const profitType = createProfitTypePercent && createProfitTypePercent.checked ? 'percent' : 'fixed';

  summaryTotal.textContent = `R$ ${formatMoney(totalCost)}`;
  const hasProfit = (profitType === 'percent' && marginPercent > 0) || (profitType === 'fixed' && fixedProfit > 0);
  if (!hasProfit) {
    summaryProfitType.textContent = 'Sem lucro definido';
  } else if (profitType === 'percent') {
    summaryProfitType.textContent = `Percentual (${formatQuantity(marginPercent)}%)`;
  } else {
    summaryProfitType.textContent = `Valor fixo (R$ ${formatMoney(fixedProfit)})`;
  }

  if (yieldValue && yieldValue > 0) {
    const costPerUnit = totalCost / yieldValue;
    let suggestedTotal = totalCost;
    if (profitType === 'percent') {
      suggestedTotal = totalCost * (1 + marginPercent / 100);
    } else {
      suggestedTotal = totalCost + fixedProfit;
    }
    const suggestedUnit = suggestedTotal / yieldValue;
    const profit = suggestedUnit - costPerUnit;
    summaryUnit.textContent = `R$ ${formatMoney(costPerUnit)}`;
    summarySuggested.textContent = `R$ ${formatMoney(suggestedUnit)}`;
    summaryProfit.textContent = `R$ ${formatMoney(profit)}`;
    summaryYield.textContent = `${formatQuantity(yieldValue)} ${createYieldType.value || ''}`.trim();
  } else {
    const placeholder = 'Preencha os dados acima';
    summaryUnit.textContent = placeholder;
    summarySuggested.textContent = placeholder;
    summaryProfit.textContent = placeholder;
    summaryYield.textContent = placeholder;
  }
}

export function updateSubmitState() {
  if (!createSubmit) return;
  const { hasName, hasYield, hasItems } = getRecipeFormState();
  const shouldEnable = hasName && hasYield && hasItems;
  if (createSubmit.classList.contains('is-loading')) {
    createSubmit.disabled = true;
    return;
  }
  createSubmit.disabled = !shouldEnable;
  updateCalcStatus();
}

function updateCalcStatus() {
  if (!calcStatus) return;
  const formState = getRecipeFormState();
  const missing = [];
  if (!formState.hasName) missing.push('nome do produto');
  if (!formState.hasYield) missing.push('rendimento');
  if (!formState.hasItems) missing.push('itens');
  if (missing.length) {
    calcStatus.textContent = `Faltam informa\u00e7\u00f5es: ${missing.join(', ')}.`;
    calcStatus.classList.remove('is-ready');
  } else {
    calcStatus.textContent = 'Dados suficientes para calcular.';
    calcStatus.classList.add('is-ready');
  }
}

function updatePackUnitDisplay() {
  if (!ingredientPackUnit || !ingredientUnit) return;
  if (!state.packUnitTouched) {
    ingredientPackUnit.value = ingredientUnit.value || 'g';
  }
}

export function updatePackUnitHints() {
  if (!ingredientPackUnit || !ingredientPack) return;
  const packUnit = ingredientPackUnit.value || 'g';
  ingredientPack.placeholder = packUnit === 'kg' || packUnit === 'l' ? 'Ex: 1' : packUnit === 'un' ? 'Ex: 30' : 'Ex: 1000';
}

function getProfitType() {
  if (createProfitTypePercent && createProfitTypePercent.checked) return 'percent';
  return 'fixed';
}

function updateProfitTypeUI() {
  const profitType = getProfitType();
  const showFixed = profitType === 'fixed';
  const showPercent = profitType === 'percent';
  if (createProfitFixedSection) {
    createProfitFixedSection.hidden = !showFixed;
    createProfitFixedSection.style.display = showFixed ? '' : 'none';
    createProfitFixedSection.setAttribute('aria-hidden', showFixed ? 'false' : 'true');
  }
  if (createProfitPercentSection) {
    createProfitPercentSection.hidden = !showPercent;
    createProfitPercentSection.style.display = showPercent ? '' : 'none';
    createProfitPercentSection.setAttribute('aria-hidden', showPercent ? 'false' : 'true');
  }
  if (createProfitFixed) createProfitFixed.disabled = !showFixed;
  if (createMargin) createMargin.disabled = !showPercent;
  updateCostSummary();
}

function getBaseTotalCost() {
  const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  const overheadValue = getOverheadValue(ingredientsTotal);
  return ingredientsTotal + overheadValue;
}

export function updateIngredientUnitHints() {
  if (!ingredientUnit) return;
  const unit = ingredientUnit.value;
  if (ingredientQty) {
    ingredientQty.placeholder = unit === 'kg' || unit === 'l' ? 'Ex: 0,5' : unit === 'un' ? 'Ex: 2' : 'Ex: 200';
  }
  if (ingredientUnitHelp) {
    ingredientUnitHelp.textContent =
      unit === 'kg'
        ? 'Use kg para itens comprados por peso. Informe o tamanho do pacote em kg (ex: 1). Para itens por unidade, use un e pacote = 1.'
        : unit === 'l'
        ? 'Use l para itens comprados por volume. Informe o tamanho do pacote em litros (ex: 1). Para itens por unidade, use un e pacote = 1.'
        : unit === 'un'
        ? 'Comprou por unidade (lata/garrafa/caixa)? Use pacote = 1. Se o item tem peso/volume, troque a unidade para g/ml e informe o tamanho do pacote.'
        : 'Use g/ml quando comprar por peso/volume. Informe o tamanho real do pacote. Para itens por unidade, use un e pacote = 1.';
  }
  updatePackUnitHints();
  updatePackQuantityWarning();
}

export function showIngredientWarning(message, type = 'generic') {
  if (!ingredientUnitWarning) return;
  ingredientUnitWarning.textContent = message || '';
  ingredientUnitWarning.hidden = !message;
  if (!message) {
    delete ingredientUnitWarning.dataset.warningType;
    return;
  }
  ingredientUnitWarning.dataset.warningType = type;
}

function clearIngredientWarning(type) {
  if (!ingredientUnitWarning) return;
  // Se um tipo específico foi passado, só limpa se o tipo corresponder
  if (type) {
    const currentType = ingredientUnitWarning.dataset.warningType;
    if (currentType === type) {
      ingredientUnitWarning.textContent = '';
      ingredientUnitWarning.hidden = true;
      delete ingredientUnitWarning.dataset.warningType;
    }
  } else {
    // Se não foi passado tipo, limpa sempre
    ingredientUnitWarning.textContent = '';
    ingredientUnitWarning.hidden = true;
    delete ingredientUnitWarning.dataset.warningType;
  }
}

export function updatePackQuantityWarning() {
  const pack = toNumber(ingredientPack ? ingredientPack.value : null, 0.01);
  const packUnit = ingredientPackUnit ? ingredientPackUnit.value : '';
  if (packUnit === 'un' && pack != null && pack >= 50) {
    showIngredientWarning(
      'Pacote muito alto para "un". Se comprar por peso/volume, troque a unidade para g/ml/l e informe o tamanho real do pacote. Se for por unidade (lata/garrafa/caixa), use pacote = 1.',
      'pack',
    );
    return;
  }
  clearIngredientWarning('pack');
}

function enforceKgLimits(value, label, max) {
  if (!Number.isFinite(value)) return null;
  if (value > max) {
    showIngredientWarning(`Valor muito alto em kg para ${label}. Use no m\u00e1ximo ${max} kg.`, 'kg');
    return null;
  }
  return value;
}

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
