/**
 * Tela de edição de ficha de custo (entrada). MÃ³dulos em /recipe-edit/*.js.
 */
import {
  AUTO_SAVE_KEY,
  DEFAULT_COMPONENT_NAME,
  DELETE_FLAG,
  INGREDIENTS_FALLBACK,
  INGREDIENTS_URL,
  catalogByName,
  params,
} from './recipe-edit/constants.js';
import {
  addIngredientBtn,
  addIngredientLabel,
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
  componentSubtotal,
  componentsSummary,
  componentsTotal,
  deleteBtn,
  deleteCancel,
  deleteClose,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  descriptionInput,
  form,
  ingredientAdvanced,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientSuccess,
  ingredientSuggestions,
  ingredientUnit,
  ingredientUnitHelp,
  ingredientUnitWarning,
  ingredientsBody,
  marginInput,
  marginSuggestions,
  nameError,
  nameInput,
  overheadAddBtn,
  overheadBody,
  overheadError,
  overheadInput,
  overheadItemName,
  overheadItemValue,
  overheadSuggestions,
  overheadTotalEl,
  profitFixedInput,
  profitFixedSection,
  profitPercentSection,
  profitTypeFixed,
  profitTypePercent,
  saveBtn,
  summaryOverhead,
  summaryOverheadLabel,
  summaryProfit,
  summaryProfitType,
  summarySuggested,
  summaryTotal,
  summaryUnit,
  summaryYield,
  yieldError,
  yieldInput,
  yieldTypeInput,
} from './recipe-edit/dom.js';
import { state } from './recipe-edit/state.js';
import {
  apiRequest,
  clearFieldError,
  ensureAuthOrRedirect,
  setFieldError,
  showMessage,
} from './recipe-edit/core.js';
import {
  applyUnitNormalization,
  calculateIngredientCost,
  convertMonetaryInput,
  detectAndFixSmallGrams,
  formatCatalogNumber,
  formatMoney,
  formatQuantity,
  normalizeKgValue,
  normalizeOverheadPercent,
  normalizePackUnit,
  normalizeQuantity,
  parseLocaleNumber,
  toNumber,
} from './recipe-edit/calc.js';

function initMasks() {
  if (window.Cleave) {
    if (overheadInput) {
      state.overheadMask = new window.Cleave(overheadInput, {
        numeral: true,
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
        numeralPositiveOnly: true,
      });
    }
    if (marginInput) {
      state.marginMask = new window.Cleave(marginInput, {
        numeral: true,
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
        numeralPositiveOnly: true,
      });
    }
  }
  if (window.AutoNumeric) {
    const moneyOptions = {
      decimalCharacter: ',',
      digitGroupSeparator: '.',
      decimalPlaces: 2,
      minimumValue: '0',
      modifyValueOnWheel: false,
    };
    // AutoNumeric não suporta type="number", então só inicializar se o campo não for type="number"
    if (profitFixedInput && profitFixedInput.type !== 'number') {
      try {
        state.profitFixedMask = new window.AutoNumeric(profitFixedInput, moneyOptions);
      } catch (err) {
        console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em profitFixedInput:', err);
      }
    }
    if (overheadItemValue && overheadItemValue.type !== 'number') {
      try {
        state.overheadItemMask = new window.AutoNumeric(overheadItemValue, moneyOptions);
      } catch (err) {
        console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em overheadItemValue:', err);
      }
    }
    if (ingredientCost && ingredientCost.type !== 'number') {
      try {
        state.ingredientCostMask = new window.AutoNumeric(ingredientCost, moneyOptions);
      } catch (err) {
        console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em ingredientCost:', err);
      }
    }
  }
}

function setMaskedValue(input, value, mask) {
  if (!input) return;
  const safeValue = value == null ? '' : value;
  if (mask && typeof mask.clear === 'function' && safeValue === '') {
    mask.clear();
    return;
  }
  if (mask && typeof mask.set === 'function') {
    mask.set(safeValue);
  } else if (mask && typeof mask.setRawValue === 'function') {
    mask.setRawValue(String(safeValue));
  } else {
    input.value = String(safeValue);
  }
}

async function loadIngredientSuggestions() {
  if (!ingredientSuggestions) return;
  let items = INGREDIENTS_FALLBACK.slice();
  try {
    const response = await fetch(INGREDIENTS_URL, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        items = data.slice();
      }
    }
  } catch (_err) {
    items = INGREDIENTS_FALLBACK.slice();
  }
  // Garantir que items é sempre um array antes de usar .map()
  if (!Array.isArray(items)) {
    items = [];
  }
  const unique = Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
  ingredientSuggestions.textContent = '';
  unique.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = String(item);
    ingredientSuggestions.appendChild(opt);
  });
}

function findCatalogIngredient(name) {
  return catalogByName.get(String(name || '').trim().toLowerCase()) || null;
}

async function loadIngredientCatalog() {
  try {
    const list = await apiRequest('/api/ingredients', null, { method: 'GET' });
    (Array.isArray(list) ? list : []).forEach((item) => {
      catalogByName.set(String(item.name).trim().toLowerCase(), item);
    });
    if (ingredientSuggestions && catalogByName.size) {
      const fragment = document.createDocumentFragment();
      catalogByName.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.label = `Insumo cadastrado: R$ ${Number(item.packageCost).toFixed(2).replace('.', ',')} por ${item.packageQuantity} ${item.packageUnit}`;
        fragment.appendChild(opt);
      });
      ingredientSuggestions.prepend(fragment);
    }
  } catch (_err) {
    // Sem cadastro de insumos disponível: a ficha continua funcionando com preço manual
  }
}

function applyCatalogToForm() {
  const match = findCatalogIngredient(ingredientName && ingredientName.value);
  if (!match) return;
  if (ingredientPack) ingredientPack.value = formatCatalogNumber(match.packageQuantity, ingredientPack);
  if (ingredientPackUnit) {
    ingredientPackUnit.value = match.packageUnit;
    ingredientPackUnit.dispatchEvent(new Event('change'));
  }
  if (ingredientCost) ingredientCost.value = formatCatalogNumber(match.packageCost, ingredientCost);
  if (typeof setIngredientAdvancedOpen === 'function') setIngredientAdvancedOpen(true);
  showIngredientSuccess(
    `Preço do cadastro de insumos: R$ ${Number(match.packageCost).toFixed(2).replace('.', ',')} por ${match.packageQuantity} ${match.packageUnit}. Esta ficha será recalculada quando o preço mudar.`
  );
}

if (ingredientName) {
  ingredientName.addEventListener('change', applyCatalogToForm);
}

function validateEditName(showMessage) {
  const value = nameInput ? nameInput.value.trim() : '';
  if (value.length < 3) {
    if (showMessage) {
      setFieldError(nameInput, nameError, 'Informe um nome com pelo menos 3 letras.');
    } else if (nameInput) {
      nameInput.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(nameInput, nameError);
  return true;
}

function validateEditYield(showMessage) {
  const value = toNumber(yieldInput ? yieldInput.value : null, 0.01);
  if (value == null) {
    if (showMessage) {
      setFieldError(yieldInput, yieldError, 'Informe um rendimento maior que zero.');
    } else if (yieldInput) {
      yieldInput.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(yieldInput, yieldError);
  return true;
}

function saveFormState() {
  if (!state.recipeId) return;
  try {
    const state = {
      recipeId: state.recipeId,
      name: nameInput ? nameInput.value : '',
      description: descriptionInput ? descriptionInput.value : '',
      yield: yieldInput ? yieldInput.value : '',
      yieldType: yieldTypeInput ? yieldTypeInput.value : 'UN',
      overhead: overheadInput ? overheadInput.value : '',
      overheadItems: state.overheadItems || [],
      margin: marginInput ? marginInput.value : '',
      profitFixed: profitFixedInput ? profitFixedInput.value : '',
      profitType: profitTypeFixed && profitTypeFixed.checked ? 'fixed' : 'percent',
      components: state.components || [],
      timestamp: Date.now(),
    };
    localStorage.setItem(`${AUTO_SAVE_KEY}.${state.recipeId}`, JSON.stringify(state));
  } catch (err) {
    console.error('[RECIPE-EDIT] Erro ao salvar estado do formulário:', err);
  }
}

function loadFormState() {
  if (!state.recipeId) return null;
  try {
    const saved = localStorage.getItem(`${AUTO_SAVE_KEY}.${state.recipeId}`);
    if (!saved) return null;
    const state = JSON.parse(saved);
    // Verificar se o estado salvo é recente (últimas 24 horas)
    if (state.timestamp && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`${AUTO_SAVE_KEY}.${state.recipeId}`);
      return null;
    }
    return state;
  } catch (err) {
    console.error('[RECIPE-EDIT] Erro ao carregar estado do formulário:', err);
    return null;
  }
}

function clearFormState() {
  if (!state.recipeId) return;
  try {
    localStorage.removeItem(`${AUTO_SAVE_KEY}.${state.recipeId}`);
  } catch (err) {
    console.error('[RECIPE-EDIT] Erro ao limpar estado do formulário:', err);
  }
}

function restoreFormState(state) {
  if (!state) return;
  if (nameInput && state.name) nameInput.value = state.name;
  if (descriptionInput && state.description) descriptionInput.value = state.description;
  if (yieldInput && state.yield) yieldInput.value = state.yield;
  if (yieldTypeInput && state.yieldType) yieldTypeInput.value = state.yieldType;
  if (overheadInput && state.overhead) {
    if (state.overheadMask) {
      setMaskedValue(overheadInput, parseFloat(state.overhead) || 0, state.overheadMask);
    } else {
      overheadInput.value = state.overhead;
    }
  }
  if (marginInput && state.margin) {
    if (state.marginMask) {
      setMaskedValue(marginInput, parseFloat(state.margin) || 0, state.marginMask);
    } else {
      marginInput.value = state.margin;
    }
  }
  if (profitFixedInput && state.profitFixed) {
    if (state.profitFixedMask) {
      setMaskedValue(profitFixedInput, parseFloat(state.profitFixed) || 0, state.profitFixedMask);
    } else {
      profitFixedInput.value = state.profitFixed;
    }
  }
  if (state.profitType === 'fixed' && profitTypeFixed) {
    profitTypeFixed.checked = true;
    if (profitTypePercent) profitTypePercent.checked = false;
  } else if (profitTypePercent) {
    profitTypePercent.checked = true;
    if (profitTypeFixed) profitTypeFixed.checked = false;
  }
  if (state.overheadItems && Array.isArray(state.overheadItems)) {
    state.overheadItems = state.overheadItems.map((item) => ({
      name: item.name || '',
      value: String(item.value || item.cost || 0),
    }));
    renderOverheadItems();
  }
  if (state.components && Array.isArray(state.components) && state.components.length > 0) {
    state.components = state.components.map((comp) => ({
      name: comp.name || '',
      items: (comp.items || []).map((item) => ({
        name: item.name || '',
        ingredientId: item.ingredientId || undefined,
        quantity: item.quantity || 0,
        packageQuantity: item.packageQuantity || 0,
        cost: item.cost || 0,
        unit: item.unit || 'g',
        packUnit: item.packUnit || item.unit || 'g',
      })),
    }));
    if (!state.components.length) {
      ensureDefaultComponent();
    }
    renderComponentSelect();
    renderIngredients();
  }
  updateProfitTypeUI();
  updateComponentsTotal();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateCostSummary();
}

function updateSaveState() {
  // Usar enableSaveButton em vez de duplicar lógica
  enableSaveButton();
  updateCalcStatus();
}

function updateCalcStatus() {
  if (!calcStatus) return;
  const missing = [];
  if (!validateName(nameInput ? nameInput.value : '')) missing.push('nome do produto');
  if (toNumber(yieldInput ? yieldInput.value : null, 0.01) == null) missing.push('rendimento');
  if (!getAllIngredients().length) missing.push('itens');
  if (missing.length) {
    calcStatus.textContent = `Faltam informa\u00e7\u00f5es: ${missing.join(', ')}.`;
    calcStatus.classList.remove('is-ready');
  } else {
    calcStatus.textContent = 'Dados suficientes para calcular.';
    calcStatus.classList.add('is-ready');
  }
}

function bindQuickSuggestions(container, input, mask, beforeApply) {
  if (!container || !input) return;
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-value]');
    if (!btn) return;
    const value = Number(btn.dataset.value);
    if (!Number.isFinite(value)) return;
    if (typeof beforeApply === 'function') {
      beforeApply();
    }
    setMaskedValue(input, value, mask);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateCostSummary();
    updateSaveState();
  });
}

function ensureDefaultComponent() {
  if (!state.components.length) {
    state.components.push({ name: DEFAULT_COMPONENT_NAME, items: [] });
  }
}

function getActiveComponent() {
  if (!state.components.length) return null;
  const selected = componentSelect ? componentSelect.value : '';
  const active = state.components.find((component) => component.name === selected);
  return active || state.components[0];
}

function setActiveComponent(name) {
  const active = state.components.find((component) => component.name === name) || state.components[0];
  if (componentSelect && active) {
    componentSelect.value = active.name;
  }
  resetIngredientForm();
  renderIngredients();
  updateComponentSubtotal();
}

function renderComponentSelect() {
  if (!componentSelect) return;
  componentSelect.innerHTML = '';
  state.components.forEach((component) => {
    const option = document.createElement('option');
    option.value = component.name;
    option.textContent = component.name;
    componentSelect.appendChild(option);
  });
  const active = getActiveComponent();
  if (active) componentSelect.value = active.name;
  const activeIndex = state.components.findIndex((component) => component.name === componentSelect.value);
  const isDefault = active && active.name === DEFAULT_COMPONENT_NAME;
  if (componentRenameBtn) componentRenameBtn.disabled = !active || isDefault;
  if (componentRemoveBtn) componentRemoveBtn.disabled = !active || isDefault || state.components.length <= 1;
  if (componentDuplicateBtn) componentDuplicateBtn.disabled = !active;
  if (componentMoveUpBtn) componentMoveUpBtn.disabled = activeIndex <= 0;
  if (componentMoveDownBtn) componentMoveDownBtn.disabled = activeIndex < 0 || activeIndex >= state.components.length - 1;
}

function addComponent(rawName) {
  const name = String(rawName || '').trim();
  if (!name) {
    showMessage('Informe um nome para a parte.', 'is-danger');
    if (componentName) componentName.focus();
    return;
  }
  const existing = state.components.find((component) => component.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    renderComponentSelect();
    setActiveComponent(existing.name);
    showMessage('Essa parte j\u00e1 existe. Selecionei para voc\u00ea.', 'is-success');
    return;
  }
  state.components.push({ name, items: [] });
  renderComponentSelect();
  setActiveComponent(name);
  saveFormState();
  showMessage(`Parte "${name}" adicionada com sucesso.`, 'is-success');
}

function renameActiveComponent(rawName) {
  const active = getActiveComponent();
  const name = String(rawName || '').trim();
  if (!active) {
    console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para renomear');
    showMessage('Selecione uma parte antes de renomear.', 'is-danger');
    return;
  }
  if (!name) {
    showMessage('Informe um nome para a parte.', 'is-danger');
    if (componentRename) componentRename.focus();
    return;
  }
  if (active.name === DEFAULT_COMPONENT_NAME) {
    showMessage('Não é possível renomear "Ingredientes principais".', 'is-danger');
    return;
  }
  // Permite renomear mesmo se o nome já existir em outra parte (corrigir nome errado)
  const existing = state.components.find((component) => component !== active && component.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    showMessage('Essa parte j\u00e1 existe. Escolha outro nome.', 'is-danger');
    if (componentRename) componentRename.focus();
    return;
  }
  const oldName = active.name;
  active.name = name;
  renderComponentSelect();
  setActiveComponent(name);
  saveFormState();
  showMessage(`Parte "${oldName}" renomeada para "${name}".`, 'is-success');
}

function removeActiveComponent() {
  const active = getActiveComponent();
  if (!active) {
    console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para remover');
    showMessage('Selecione uma parte antes de remover.', 'is-danger');
    return;
  }
  if (active.name === DEFAULT_COMPONENT_NAME) {
    showMessage('Não é possível remover "Ingredientes principais".', 'is-danger');
    return;
  }
  if (state.components.length <= 1) {
    showMessage('Não é possível remover a única parte restante.', 'is-danger');
    return;
  }
  if (!window.confirm(`Tem certeza que deseja remover "${active.name}" e todos os itens dela?`)) return;
  const removedName = active.name;
  state.components = state.components.filter((component) => component !== active);
  renderComponentSelect();
  if (state.components.length > 0) {
    setActiveComponent(state.components[0].name);
  }
  renderIngredients();
  updateComponentSubtotal();
  updateComponentsTotal();
  updateCostSummary();
  saveFormState();
  showMessage(`Parte "${removedName}" removida com sucesso.`, 'is-success');
}

function duplicateActiveComponent() {
  const active = getActiveComponent();
  if (!active) {
    console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para duplicar');
    showMessage('Selecione uma parte antes de duplicar.', 'is-danger');
    return;
  }
  const base = `${active.name} c\u00f3pia`;
  let name = base;
  let index = 2;
  while (state.components.some((component) => component.name.toLowerCase() === name.toLowerCase())) {
    name = `${base} ${index}`;
    index += 1;
  }
  const items = (active.items || []).map((item) => ({ ...item }));
  state.components.push({ name, items });
  renderComponentSelect();
  setActiveComponent(name);
  saveFormState();
  showMessage(`Parte "${name}" criada com sucesso.`, 'is-success');
  renderIngredients();
  updateComponentSubtotal();
  updateComponentsTotal();
  updateCostSummary();
}

function moveActiveComponent(direction) {
  const active = getActiveComponent();
  if (!active) {
    console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para mover');
    showMessage('Selecione uma parte antes de mover.', 'is-danger');
    return;
  }
  const index = state.components.findIndex((component) => component === active);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.components.length) {
    console.warn('[RECIPE-EDIT] Não é possível mover componente na posição', index, 'para', nextIndex);
    return;
  }
  const swap = state.components[nextIndex];
  state.components[nextIndex] = active;
  state.components[index] = swap;
  renderComponentSelect();
  setActiveComponent(active.name);
  saveFormState();
  const directionText = direction < 0 ? 'para cima' : 'para baixo';
  showMessage(`Parte "${active.name}" movida ${directionText}.`, 'is-success');
}

function updateComponentsTotal() {
  if (!componentsTotal) return;
  const total = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  componentsTotal.textContent = `Custo total das partes: R$ ${formatMoney(total)}`;
}

function updateComponentSubtotal() {
  if (!componentSubtotal) return;
  const active = getActiveComponent();
  const items = active ? active.items || [] : [];
  const subtotal = items.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  componentSubtotal.textContent = `R$ ${formatMoney(subtotal)}`;
}

function renderComponentsSummary() {
  if (!componentsSummary) return;
  if (!state.components.length) {
    componentsSummary.innerHTML = '<span class="components-summary-empty">Nenhuma parte adicionada.</span>';
    return;
  }
  const items = state.components.map((component) => {
    const subtotal = (component.items || []).reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    return `
        <div class="components-summary-item">
          <span class="components-summary-name">${component.name}</span>
          <span class="components-summary-value">R$ ${formatMoney(subtotal)}</span>
        </div>
      `;
  });
  componentsSummary.innerHTML = items.join('');
}

function buildComponentsFromIngredients(ingredients) {
  const map = new Map();
  const order = [];
  (ingredients || []).forEach((item) => {
    const rawName = String(item.component || DEFAULT_COMPONENT_NAME).trim() || DEFAULT_COMPONENT_NAME;
    if (!map.has(rawName)) {
      map.set(rawName, []);
      order.push(rawName);
    }
    map.get(rawName).push({
      name: item.name,
      ingredientId: item.ingredientId || undefined,
      quantity: item.quantity,
      packageQuantity: item.packageQuantity,
      cost: item.cost,
      unit: item.unit || '',
      packUnit: item.packUnit || item.unit || '',
    });
  });
  if (!order.length) {
    return [{ name: DEFAULT_COMPONENT_NAME, items: [] }];
  }
  return order.map((name) => ({ name, items: map.get(name) || [] }));
}

function getOverheadPercentValue() {
  const raw = toNumber(overheadInput ? overheadInput.value : null, 0);
  return normalizeOverheadPercent(raw || 0);
}

function getOverheadValue(ingredientsTotal) {
  const percent = getOverheadPercentValue();
  const percentValue = ingredientsTotal * (percent / 100);
  const detailed = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  return percentValue + detailed;
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
          <td class="has-text-right">R$ ${formatMoney(Number(item.value) || 0)}</td>
          <td class="has-text-right"><button class="button is-light is-small" data-index="${index}">Remover</button></td>
        `;
      overheadBody.appendChild(row);
    });
  }
  const total = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (overheadTotalEl) overheadTotalEl.textContent = `R$ ${formatMoney(total)}`;
  updateCostSummary();
}

function updateCostSummary() {
  if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
    return;
  }
  const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  const overheadValue = getOverheadValue(ingredientsTotal);
  const overheadItemsTotal = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (summaryOverhead) {
    summaryOverhead.textContent = `R$ ${formatMoney(overheadValue)}`;
  }
  if (summaryOverheadLabel) {
    const percent = getOverheadPercentValue();
    if (percent > 0) {
      summaryOverheadLabel.textContent = `Gastos extras (${formatQuantity(percent)}%)`;
    } else if (overheadItemsTotal > 0) {
      summaryOverheadLabel.textContent = 'Gastos extras (itens)';
    } else {
      summaryOverheadLabel.textContent = 'Gastos extras (n\u00e3o informado)';
    }
  }
  const totalCost = ingredientsTotal + overheadValue;
  const yieldValue = toNumber(yieldInput.value, 0);
  const marginPercent = toNumber(marginInput.value, 0) || 0;
  const fixedProfit = toNumber(profitFixedInput.value, 0) || 0;
  const profitType = profitTypePercent && profitTypePercent.checked ? 'percent' : 'fixed';

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
    summaryYield.textContent = `${formatQuantity(yieldValue)} ${yieldTypeInput.value || ''}`.trim();
  } else {
    const placeholder = 'Preencha os dados acima';
    summaryUnit.textContent = placeholder;
    summarySuggested.textContent = placeholder;
    summaryProfit.textContent = placeholder;
    summaryYield.textContent = placeholder;
  }
}

function setIngredientAdvancedOpen(isOpen) {
  if (!ingredientAdvanced || !ingredientAdvancedToggle) return;
  ingredientAdvanced.classList.toggle('is-open', isOpen);
  ingredientAdvanced.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  ingredientAdvancedToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function isIngredientAdvancedOpen() {
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

function resetIngredientForm() {
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

function startIngredientEdit(index) {
  const active = getActiveComponent();
  if (!Number.isInteger(index) || !active || !active.items || !active.items[index]) return;
  state.editingIngredientIndex = index;
  state.editingComponentName = active.name;
  if (addIngredientBtn) addIngredientBtn.textContent = 'Atualizar item';
  setIngredientFormValues(active.items[index]);
}

function validateIngredientFields(showMessage) {
  const name = ingredientName ? ingredientName.value.trim() : '';
  const quantity = toNumber(ingredientQty ? ingredientQty.value : null, 0.01);
  const pack = toNumber(ingredientPack ? ingredientPack.value : null, 0.01);
  const cost = toNumber(ingredientCost ? ingredientCost.value : null, 0);
  const unit = ingredientUnit ? ingredientUnit.value : '';
  const advancedOpen = isIngredientAdvancedOpen();
  const wantsPrice = advancedOpen || pack != null || cost != null;
  const packValid = !wantsPrice || pack != null;
  const costValid = !wantsPrice || cost != null;
  const fields = [
    { input: ingredientName, valid: Boolean(name) },
    { input: ingredientQty, valid: quantity != null },
    { input: ingredientPack, valid: packValid },
    { input: ingredientCost, valid: costValid },
  ];
  let isValid = Boolean(name && quantity != null && unit && packValid && costValid);
  fields.forEach((field) => {
    if (!field.input) return;
    if (!wantsPrice && (field.input === ingredientPack || field.input === ingredientCost)) {
      field.input.classList.remove('is-danger');
      field.input.removeAttribute('aria-invalid');
      return;
    }
    if (field.valid) {
      field.input.classList.remove('is-danger');
      field.input.removeAttribute('aria-invalid');
    } else {
      field.input.classList.add('is-danger');
      field.input.setAttribute('aria-invalid', 'true');
    }
  });
  if (showMessage) {
    if (!isValid) {
      if (!advancedOpen) {
        setIngredientAdvancedOpen(true);
      }
      setFieldError(
        ingredientName,
        ingredientError,
        'Informe item, quantidade usada e a unidade.',
      );
    } else {
      clearFieldError(ingredientName, ingredientError);
    }
  }
  if (!isValid) showIngredientSuccess('');
  return isValid;
}

function showIngredientSuccess(message) {
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

function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  return true;
}

function renderIngredients() {
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
  if (profitTypePercent && profitTypePercent.checked) return 'percent';
  return 'fixed';
}

function updateProfitTypeUI() {
  const profitType = getProfitType();
  const showFixed = profitType === 'fixed';
  const showPercent = profitType === 'percent';
  if (profitFixedSection) {
    profitFixedSection.hidden = !showFixed;
    profitFixedSection.style.display = showFixed ? '' : 'none';
    profitFixedSection.setAttribute('aria-hidden', showFixed ? 'false' : 'true');
  }
  if (profitPercentSection) {
    profitPercentSection.hidden = !showPercent;
    profitPercentSection.style.display = showPercent ? '' : 'none';
    profitPercentSection.setAttribute('aria-hidden', showPercent ? 'false' : 'true');
  }
  if (profitFixedInput) profitFixedInput.disabled = !showFixed;
  if (marginInput) marginInput.disabled = !showPercent;
  updateCostSummary();
  enableSaveButton();
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

if (addIngredientBtn) {
  addIngredientBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!ingredientName) {
      console.error('[RECIPE-EDIT] ingredientName não encontrado');
      return;
    }
    const name = ingredientName.value.trim();
    applyUnitNormalization(ingredientQty, ingredientUnit);
    applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
      state.packUnitTouched = true;
    });
    // Converter valores monetários automaticamente
    if (ingredientCost && ingredientCost.value) {
      const converted = convertMonetaryInput(ingredientCost.value);
      if (converted !== ingredientCost.value) {
        ingredientCost.value = converted;
        if (state.ingredientCostMask) {
          state.ingredientCostMask.set(converted);
        }
      }
    }
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
      if (!name) {
        if (ingredientName) ingredientName.focus();
      } else if (quantity == null) {
        if (ingredientQty) ingredientQty.focus();
      } else if (!unit) {
        if (ingredientUnit) ingredientUnit.focus();
      } else if (wantsPrice && pack == null) {
        if (ingredientPack) ingredientPack.focus();
      } else if (wantsPrice && cost == null) {
        if (ingredientCost) ingredientCost.focus();
      }
      return;
    }
    
    // Detectar e corrigir valores muito pequenos para gramas (ex: 0,001 g = provavelmente 0,001 kg = 1 g)
    if (unit === 'g' && quantity != null) {
      const fixResult = detectAndFixSmallGrams(quantity, unit);
      if (fixResult.converted) {
        quantity = fixResult.value;
        ingredientQty.value = formatQuantity(quantity);
        showIngredientWarning(fixResult.message, 'grams');
      } else if (fixResult.warning) {
        showIngredientWarning(fixResult.message, 'grams');
      }
    }
    
    if (!wantsPrice) {
      pack = 0;
      cost = 0;
    }
    
    // VALIDAÇÃO CRÍTICA: Normalizar unidade do pacote para corresponder à unidade usada
    // Regra de ouro: unidade do item = unidade do pacote (g com g, kg com kg, ml com ml, l com l)
    let finalPackUnit = packUnit;
    if (wantsPrice && pack != null && unit && packUnit) {
      const packNormalization = normalizePackUnit(unit, packUnit, pack);
      if (packNormalization.error) {
        // Unidades incompatíveis - bloquear e mostrar erro
        showIngredientWarning(packNormalization.message, 'unit-mismatch');
        if (ingredientPackUnit) ingredientPackUnit.focus();
        return;
      }
      if (packNormalization.converted) {
        // Converter automaticamente
        pack = packNormalization.packValue;
        finalPackUnit = packNormalization.packUnit;
        ingredientPack.value = formatQuantity(pack);
        if (ingredientPackUnit) ingredientPackUnit.value = finalPackUnit;
        showIngredientWarning(packNormalization.message, 'unit-conversion');
      }
    }
    
    if (unit === 'kg') {
      const adjustedQty = normalizeKgValue(quantity);
      if (adjustedQty !== quantity) {
        quantity = adjustedQty;
        ingredientQty.value = formatQuantity(quantity);
        showIngredientWarning(`Converti ${formatQuantity(adjustedQty * 1000)} g para ${formatQuantity(adjustedQty)} kg.`, 'kg');
      }
      const limitedQty = enforceKgLimits(quantity, 'quantidade usada', 10);
      if (limitedQty == null) {
        return;
      }
      quantity = limitedQty;
    }
    
    // Aplicar limites de kg apenas se a unidade do pacote for kg (após normalização)
    if (wantsPrice && finalPackUnit === 'kg') {
      const limitedPack = enforceKgLimits(pack, 'quantidade do pacote', 50);
      if (limitedPack == null) {
        return;
      }
      pack = limitedPack;
    }
    
    // Limpar avisos genéricos, mas manter avisos específicos de conversão
    if (unit === 'g' && quantity != null && quantity >= 1) {
      clearIngredientWarning('grams');
    }
    clearFieldError(ingredientName, ingredientError);
    const activeComponent = getActiveComponent();
    if (!activeComponent) {
      console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado');
      if (ingredientError) {
        ingredientError.textContent = 'Selecione uma parte antes de adicionar itens.';
        ingredientError.hidden = false;
        ingredientError.style.display = '';
      }
      return;
    }
    if (!activeComponent.items) {
      activeComponent.items = [];
    }
    // Usar a unidade do pacote normalizada (pode ter sido convertida)
    const finalPackUnitForSave = wantsPrice ? finalPackUnit : (packUnit || unit);
    
    if (Number.isInteger(state.editingIngredientIndex) && state.editingComponentName === activeComponent.name) {
      if (activeComponent.items[state.editingIngredientIndex]) {
        activeComponent.items[state.editingIngredientIndex] = { name, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave };
        showIngredientSuccess('Item atualizado.');
      } else {
        activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave });
        showIngredientSuccess('Item adicionado.');
      }
    } else {
      activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave });
      showIngredientSuccess('Item adicionado.');
    }
    resetIngredientForm();
    renderIngredients();
    updateCostSummary();
    enableSaveButton();
  });
} else {
  console.error('[RECIPE-EDIT] addIngredientBtn não encontrado no DOM');
}

if (overheadAddBtn) {
  overheadAddBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    // Converter valores monetários automaticamente
    if (overheadItemValue && overheadItemValue.value) {
      const converted = convertMonetaryInput(overheadItemValue.value);
      if (converted !== overheadItemValue.value) {
        overheadItemValue.value = converted;
        if (state.overheadItemMask) {
          state.overheadItemMask.set(converted);
        }
      }
    }
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
    updateCostSummary();
    enableSaveButton();
  });
} else {
  console.error('[RECIPE-EDIT] overheadAddBtn não encontrado no DOM');
}

if (overheadBody) {
  overheadBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (Number.isInteger(index)) {
      state.overheadItems.splice(index, 1);
      renderOverheadItems();
      updateCostSummary();
      enableSaveButton();
    }
  });
}

if (ingredientsBody) {
  ingredientsBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const action = btn.dataset.action || 'remove';
    if (!Number.isInteger(index)) return;
    if (action === 'edit') {
      startIngredientEdit(index);
      return;
    }
    const active = getActiveComponent();
    if (!active || !active.items) return;
    active.items.splice(index, 1);
    if (state.editingIngredientIndex === index && state.editingComponentName === active.name) {
      resetIngredientForm();
    } else if (Number.isInteger(state.editingIngredientIndex) && index < state.editingIngredientIndex && state.editingComponentName === active.name) {
      state.editingIngredientIndex -= 1;
    }
    renderIngredients();
    updateCostSummary();
    enableSaveButton();
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldError(nameInput, nameError);
    clearFieldError(yieldInput, yieldError);

    const name = nameInput.value.trim();
    const yieldValue = toNumber(yieldInput.value, 0.01);
    if (!validateName(name)) {
      setFieldError(nameInput, nameError, 'Informe um nome com pelo menos 3 letras.');
      enableSaveButton();
      return;
    }
    if (yieldValue == null) {
      setFieldError(yieldInput, yieldError, 'Informe um rendimento maior que zero.');
      enableSaveButton();
      return;
    }
    if (!getAllIngredients().length) {
      setFieldError(ingredientName, ingredientError, 'Adicione pelo menos um item.');
      enableSaveButton();
      return;
    }

    saveBtn.classList.add('is-loading');
    saveBtn.disabled = true;
    try {
      const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
      const overheadValue = getOverheadValue(ingredientsTotal);
      const baseTotal = ingredientsTotal + overheadValue;
      const profitType = getProfitType();
      let marginValue = 0;
      if (profitType === 'percent') {
        marginValue = (toNumber(marginInput.value, 0) || 0) / 100;
      } else {
        const fixedProfit = toNumber(profitFixedInput.value, 0) || 0;
        marginValue = baseTotal > 0 ? fixedProfit / baseTotal : 0;
      }
      const updated = await apiRequest(`/api/recipes/${state.recipeId}`, null, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description: descriptionInput.value.trim() || undefined,
          yield: yieldValue,
          yieldType: yieldTypeInput.value,
          overhead: overheadValue,
          overheadItems: state.overheadItems.map((item) => ({
            name: item.name,
            cost: toNumber(item.value, 0) || 0,
          })),
          labor: 0,
          margin: marginValue,
          ingredients: getAllIngredients().map((item) => ({
            name: item.name,
            quantity: item.quantity,
            packageQuantity: item.packageQuantity,
            cost: item.cost,
            unit: item.unit,
            packUnit: item.packUnit,
            component: item.component || undefined,
        ingredientId: item.ingredientId || undefined,
          })),
        }),
      });
      if (updated && (updated.id || updated.name)) {
        applyRecipeData(updated);
      } else {
        const refreshed = await apiRequest(`/api/recipes/${state.recipeId}`, null);
        applyRecipeData(refreshed);
      }
      clearFormState(); // Limpar estado salvo após salvar com sucesso
      showMessage('Ficha de custo atualizada.', 'is-success');
    } catch (err) {
      showMessage(err.message, 'is-danger');
    } finally {
      saveBtn.classList.remove('is-loading');
      updateSaveState();
    }
  });
}

if (deleteBtn) {
  deleteBtn.addEventListener('click', () => toggleDeleteModal(true));
}

[deleteClose, deleteCloseBtn, deleteCancel].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', () => toggleDeleteModal(false));
});

if (deleteConfirm) {
  deleteConfirm.addEventListener('click', async () => {
    deleteConfirm.classList.add('is-loading');
    deleteConfirm.disabled = true;
    try {
      await apiRequest(`/api/recipes/${state.recipeId}`, null, {
        method: 'DELETE',
      });
      sessionStorage.setItem(DELETE_FLAG, 'true');
      showMessage('Ficha de custo removida.', 'is-success');
      setTimeout(() => {
        window.location.href = '/recipes.html';
      }, 500);
    } catch (err) {
      showMessage(err.message, 'is-danger');
    } finally {
      deleteConfirm.classList.remove('is-loading');
      deleteConfirm.disabled = false;
      toggleDeleteModal(false);
    }
  });
}

[yieldInput, overheadInput, profitFixedInput, marginInput].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    updateCostSummary();
    enableSaveButton();
  });
});

if (yieldTypeInput) {
  yieldTypeInput.addEventListener('change', () => {
    updateCostSummary();
    enableSaveButton();
  });
}

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
  componentRenameBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!componentRename) {
      console.error('[RECIPE-EDIT] componentRename não encontrado');
      return;
    }
    const name = componentRename.value.trim();
    if (!name) {
      if (componentRename) componentRename.focus();
      return;
    }
    renameActiveComponent(name);
    componentRename.value = '';
  });
} else {
  console.error('[RECIPE-EDIT] componentRenameBtn não encontrado no DOM');
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
  componentRemoveBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeActiveComponent();
  });
} else {
  console.error('[RECIPE-EDIT] componentRemoveBtn não encontrado no DOM');
}

if (componentDuplicateBtn) {
  componentDuplicateBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    duplicateActiveComponent();
  });
} else {
  console.error('[RECIPE-EDIT] componentDuplicateBtn não encontrado no DOM');
}

if (componentMoveUpBtn) {
  componentMoveUpBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    moveActiveComponent(-1);
  });
} else {
  console.error('[RECIPE-EDIT] componentMoveUpBtn não encontrado no DOM');
}

if (componentMoveDownBtn) {
  componentMoveDownBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    moveActiveComponent(1);
  });
} else {
  console.error('[RECIPE-EDIT] componentMoveDownBtn não encontrado no DOM');
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
    
    // Validar compatibilidade de unidades em tempo real
    const unit = ingredientUnit ? ingredientUnit.value : '';
    const packUnit = ingredientPackUnit.value;
    if (unit && packUnit) {
      const packValue = toNumber(ingredientPack ? ingredientPack.value : null, 0);
      if (packValue != null) {
        const packNormalization = normalizePackUnit(unit, packUnit, packValue);
        if (packNormalization.error) {
          showIngredientWarning(packNormalization.message, 'unit-mismatch');
        } else if (packNormalization.converted) {
          // Mostrar aviso mas não converter ainda (aguardar o botão Adicionar)
          showIngredientWarning(packNormalization.message + ' Clique em "Adicionar" para aplicar a conversão.', 'unit-conversion');
        } else {
          clearIngredientWarning('unit-mismatch');
          clearIngredientWarning('unit-conversion');
        }
      }
    }
  });
}

if (ingredientAdvancedToggle) {
  ingredientAdvancedToggle.addEventListener('click', () => {
    setIngredientAdvancedOpen(!isIngredientAdvancedOpen());
  });
}

[nameInput, yieldInput, descriptionInput].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    if (input === nameInput) validateEditName(true);
    if (input === yieldInput) validateEditYield(true);
    enableSaveButton();
  });
  input.addEventListener('blur', () => {
    if (input === nameInput) validateEditName(true);
    if (input === yieldInput) validateEditYield(true);
    enableSaveButton();
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
    if (input === ingredientCost && ingredientCost.value) {
      const converted = convertMonetaryInput(ingredientCost.value);
      if (converted !== ingredientCost.value) {
        ingredientCost.value = converted;
        if (state.ingredientCostMask) {
          state.ingredientCostMask.set(converted);
        }
      }
    }
    validateIngredientFields(true);
  });
});

if (profitTypeFixed) {
  profitTypeFixed.addEventListener('change', () => updateProfitTypeUI());
}

if (profitTypePercent) {
  profitTypePercent.addEventListener('change', () => updateProfitTypeUI());
}

// Event listeners para overheadItemValue (gastos extras)
if (overheadItemValue) {
  overheadItemValue.addEventListener('blur', () => {
    if (overheadItemValue.value) {
      const converted = convertMonetaryInput(overheadItemValue.value);
      if (converted !== overheadItemValue.value) {
        overheadItemValue.value = converted;
        if (state.overheadItemMask) {
          state.overheadItemMask.set(converted);
        }
      }
    }
  });
}

// Event listeners para profitFixedInput
if (profitFixedInput) {
  profitFixedInput.addEventListener('blur', () => {
    if (profitFixedInput.value) {
      const converted = convertMonetaryInput(profitFixedInput.value);
      if (converted !== profitFixedInput.value) {
        profitFixedInput.value = converted;
        if (state.profitFixedMask) {
          state.profitFixedMask.set(converted);
        }
      }
    }
  });
}

initMasks();

loadIngredientSuggestions().then(loadIngredientCatalog);

bindQuickSuggestions(overheadSuggestions, overheadInput, state.overheadMask);

bindQuickSuggestions(marginSuggestions, marginInput, state.marginMask, () => {
  if (profitTypePercent && !profitTypePercent.checked) {
    profitTypePercent.checked = true;
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

renderComponentsSummary();

updateComponentsTotal();

updateComponentSubtotal();

renderOverheadItems();

updateCostSummary();

/**
 * Coleta todos os ingredientes de todos os componentes
 */
function getAllIngredients() {
  const all = [];
  (state.components || []).forEach((component) => {
    if (component.items && Array.isArray(component.items)) {
      component.items.forEach((item) => {
        all.push({
          ...item,
          component: component.name,
        });
      });
    }
  });
  return all;
}

/**
 * Habilita o botão Salvar se houver dados válidos
 */
function enableSaveButton() {
  if (!saveBtn) return;
  
  // Não desabilitar se já está salvando (loading)
  if (saveBtn.classList.contains('is-loading')) {
    return;
  }
  
  const name = nameInput ? nameInput.value.trim() : '';
  const yieldValue = toNumber(yieldInput ? yieldInput.value : null, 0.01);
  const hasIngredients = getAllIngredients().length > 0;
  
  const isValid = name.length >= 3 && yieldValue != null && yieldValue > 0 && hasIngredients;
  
  saveBtn.disabled = !isValid;
}

// Função para aplicar dados da receita nos campos
function toggleDeleteModal(isOpen) {
  if (!deleteModal) return;
  deleteModal.classList.toggle('is-active', isOpen);
  deleteModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    deleteConfirm && deleteConfirm.focus();
  } else {
    deleteBtn && deleteBtn.focus();
  }
}

function applyRecipeData(recipe) {
  if (!recipe) {
    console.warn('[RECIPE-EDIT] applyRecipeData chamado sem receita');
    return;
  }
  
  console.log('[RECIPE-EDIT] Aplicando dados da receita:', recipe);
  
  if (nameInput) nameInput.value = recipe.name || '';
  if (descriptionInput) descriptionInput.value = recipe.description || '';
  if (yieldInput) yieldInput.value = recipe.yield ? String(recipe.yield) : '';
  if (yieldTypeInput) yieldTypeInput.value = recipe.yieldType || 'UN';
  
  // Calcular overhead percentual a partir do overhead total e custo dos ingredientes
  const costIngredients = recipe.costIngredients || 0;
  const overheadTotal = recipe.overhead || 0;
  const overheadItemsTotal = (recipe.overheadItems || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const overheadPercentValue = costIngredients > 0 ? ((overheadTotal - overheadItemsTotal) / costIngredients) * 100 : 0;
  const overheadPercent = Math.max(0, Math.min(15, overheadPercentValue));
  
  console.log('[RECIPE-EDIT] Overhead calculado:', { costIngredients, overheadTotal, overheadItemsTotal, overheadPercent });
  
  if (overheadInput && state.overheadMask) {
    setMaskedValue(overheadInput, overheadPercent, state.overheadMask);
  } else if (overheadInput) {
    overheadInput.value = String(overheadPercent);
  }
  
  // Calcular margin a partir do preço sugerido e custo unitário
  // margin = (priceSuggested / costPerUnit) - 1
  const costPerUnit = recipe.costPerUnit || 0;
  const priceSuggested = recipe.priceSuggested || 0;
  let marginValue = 0;
  let marginPercent = 0;
  
  if (costPerUnit > 0 && priceSuggested > costPerUnit) {
    marginValue = (priceSuggested / costPerUnit) - 1;
    marginPercent = marginValue * 100;
  }
  
  if (marginInput && state.marginMask) {
    setMaskedValue(marginInput, marginPercent, state.marginMask);
  } else if (marginInput) {
    marginInput.value = String(marginPercent);
  }
  
  // Determinar profitType: se há margin > 0, assumimos que é percentual
  // Caso contrário, pode ser fixo ou percentual com 0%
  // Por padrão, vamos usar percentual se há margin, senão fixo
  if (marginPercent > 0) {
    // Se tem margin, é percentual
    if (profitTypePercent) {
      profitTypePercent.checked = true;
      if (profitTypeFixed) profitTypeFixed.checked = false;
    }
  } else {
    // Sem margin, verifica se há lucro total calculado
    const estimatedProfit = recipe.estimatedProfit || 0;
    if (estimatedProfit > 0 && profitTypeFixed) {
      profitTypeFixed.checked = true;
      if (profitTypePercent) profitTypePercent.checked = false;
      if (profitFixedInput && state.profitFixedMask) {
        setMaskedValue(profitFixedInput, estimatedProfit, state.profitFixedMask);
      }
    } else if (profitTypePercent) {
      profitTypePercent.checked = true;
      if (profitTypeFixed) profitTypeFixed.checked = false;
    }
  }
  updateProfitTypeUI();
  
  if (recipe.overheadItems && Array.isArray(recipe.overheadItems)) {
    state.overheadItems = recipe.overheadItems.map((item) => ({
      name: item.name || '',
      value: String(item.cost || item.value || 0),
    }));
    renderOverheadItems();
  }
  
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    state.components = buildComponentsFromIngredients(recipe.ingredients);
    if (!state.components.length) {
      ensureDefaultComponent();
    }
    renderComponentSelect();
    renderIngredients();
  } else {
    ensureDefaultComponent();
    renderComponentSelect();
    renderIngredients();
  }
  
  updateComponentsTotal();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateCostSummary();
  enableSaveButton();
}

// Inicialização (auth via cookie HttpOnly)
ensureAuthOrRedirect();

state.recipeId = params.get('id');

function bootstrap() {
  if (!state.recipeId) {
    window.location.href = '/recipes.html';
    return;
  }

  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/recipes.html';
    });
  }

  // Adicionar event listeners para atualizar o botão Salvar quando os campos mudarem
  if (nameInput) {
    nameInput.addEventListener('input', enableSaveButton);
    nameInput.addEventListener('blur', enableSaveButton);
  }

  if (yieldInput) {
    yieldInput.addEventListener('input', enableSaveButton);
    yieldInput.addEventListener('blur', enableSaveButton);
  }

  // Carregar receita da API - NÃO carregar rascunho primeiro para evitar sobrescrever dados
  apiRequest(`/api/recipes/${state.recipeId}`, null)
    .then((recipe) => {
      applyRecipeData(recipe);
      enableSaveButton(); // Garantir que o botão seja atualizado após carregar dados
      const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
      if (deletedFlag) {
        sessionStorage.removeItem(DELETE_FLAG);
        showMessage('Ficha técnica removida.', 'is-success');
      }
    })
    .catch((err) => {
      if (err.status === 404) {
        showMessage('Receita não encontrada.', 'is-danger');
        setTimeout(() => {
          window.location.href = '/recipes.html';
        }, 2000);
      } else {
        showMessage(err.message || 'Erro ao carregar receita.', 'is-danger');
      }
    });

  // Fechar modal com ESC
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      toggleDeleteModal(false);
    }
  });

  // (duplicata de getProfitType removida: semantica identica a da linha 1302)

  // (removido) tratadores duplicados de salvar/excluir. Um clique em "Salvar" disparava até
  // 3 PUTs, e um deles (saveRecipe) mandava o percentual de gastos extras no lugar do valor
  // em R$ e zerava o lucro fixo. Excluir mandava DELETE duas vezes. Fica só o tratador do form.

  if (deleteCancel) {
    deleteCancel.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDeleteModal(false);
    });
  }

  if (deleteClose) {
    deleteClose.addEventListener('click', () => {
      toggleDeleteModal(false);
    });
  }

  if (deleteCloseBtn) {
    deleteCloseBtn.addEventListener('click', () => {
      toggleDeleteModal(false);
    });
  }
}

bootstrap();
