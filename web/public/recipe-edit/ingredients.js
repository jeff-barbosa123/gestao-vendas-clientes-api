/**
 * Formulário e tabela de ingredientes: edição, unidades, avisos e renderização.
 */
import {
  addIngredientBtn,
  addIngredientLabel,
  ingredientAdvanced,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientSuccess,
  ingredientUnit,
  ingredientUnitHelp,
  ingredientUnitWarning,
  ingredientsBody,
} from './dom.js';
import { state } from './state.js';
import {
  calculateIngredientCost,
  formatMoney,
  formatQuantity,
  normalizeQuantity,
  parseLocaleNumber,
  toNumber,
} from './calc.js';
import {
  getActiveComponent,
  renderComponentsSummary,
  updateComponentSubtotal,
  updateComponentsTotal,
} from './components.js';
import { enableSaveButton, updateCostSummary, updateProfitTypeUI } from './summary.js';

export function setIngredientAdvancedOpen(isOpen) {
  if (!ingredientAdvanced || !ingredientAdvancedToggle) return;
  ingredientAdvanced.classList.toggle('is-open', isOpen);
  ingredientAdvanced.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  ingredientAdvancedToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

export function isIngredientAdvancedOpen() {
  return Boolean(ingredientAdvanced && ingredientAdvanced.classList.contains('is-open'));
}

function setIngredientFormValues(item) {
  if (!item) return;
  if (ingredientName) ingredientName.value = item.name || '';
  if (ingredientQty) {
    const qtyValue = Number(item.quantity) || 0;
    ingredientQty.value = formatQuantity(qtyValue).replace(/,00$/, '');
  }
  if (ingredientUnit) ingredientUnit.value = item.unit || 'g';
  if (ingredientPackUnit) {
    ingredientPackUnit.value = item.packUnit || item.unit || 'g';
    state.packUnitTouched = true;
  }
  updatePackUnitDisplay();
  const hasPrice = Number(item.packageQuantity) > 0 || Number(item.cost) > 0;
  if (ingredientPack) {
    ingredientPack.value = hasPrice ? formatQuantity(Number(item.packageQuantity) || 0).replace(/,00$/, '') : '';
  }
  if (ingredientCost) {
    ingredientCost.value = hasPrice ? formatQuantity(Number(item.cost) || 0).replace(/,00$/, '') : '';
  }
  setIngredientAdvancedOpen(hasPrice);
}

export function resetIngredientForm() {
  state.editingIngredientIndex = null;
  state.editingComponentName = null;
  if (ingredientName) ingredientName.value = '';
  if (ingredientQty) ingredientQty.value = '';
  if (ingredientPack) ingredientPack.value = '';
  if (ingredientCost) ingredientCost.value = '';
  if (addIngredientBtn && addIngredientLabel) addIngredientBtn.textContent = addIngredientLabel;
  setIngredientAdvancedOpen(false);
  state.packUnitTouched = false;
  updatePackUnitDisplay();
}

export function startIngredientEdit(index) {
  const active = getActiveComponent();
  if (!Number.isInteger(index) || !active || !active.items || !active.items[index]) return;
  state.editingIngredientIndex = index;
  state.editingComponentName = active.name;
  if (addIngredientBtn) addIngredientBtn.textContent = 'Atualizar item';
  setIngredientFormValues(active.items[index]);
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
  const active = getActiveComponent();
  const items = active ? active.items || [] : [];
  if (!items.length) {
    const label = active
      ? `Nenhum item em ${active.name}. Use o formul\u00e1rio acima para incluir o primeiro.`
      : 'Nenhum item adicionado. Use o formul\u00e1rio acima para incluir o primeiro.';
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.textContent = label;
    emptyRow.appendChild(emptyCell);
    ingredientsBody.appendChild(emptyRow);
    updateComponentsTotal();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateCostSummary();
    updateProfitTypeUI();
    enableSaveButton();
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
    const btnEdit = document.createElement('button');
    btnEdit.className = 'button is-light is-small';
    btnEdit.dataset.index = String(index);
    btnEdit.dataset.action = 'edit';
    btnEdit.type = 'button';
    btnEdit.textContent = 'Editar';
    const btnRemove = document.createElement('button');
    btnRemove.className = 'button is-light is-small';
    btnRemove.dataset.index = String(index);
    btnRemove.dataset.action = 'remove';
    btnRemove.type = 'button';
    btnRemove.textContent = 'Remover';
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnRemove);

    row.appendChild(tdName);
    row.appendChild(tdQty);
    row.appendChild(tdCost);
    row.appendChild(tdActions);
    ingredientsBody.appendChild(row);
  });
  updateComponentsTotal();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateCostSummary();
  enableSaveButton();
}

export function updatePackUnitDisplay() {
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

export function clearIngredientWarning(type) {
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

export function enforceKgLimits(value, label, max) {
  if (!Number.isFinite(value)) return null;
  if (value > max) {
    showIngredientWarning(`Valor muito alto em kg para ${label}. Use no m\u00e1ximo ${max} kg.`, 'kg');
    return null;
  }
  return value;
}
