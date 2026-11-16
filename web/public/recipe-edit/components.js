/**
 * Componentes da ficha (massa, cobertura…): seleção, edição e totais.
 */
import { DEFAULT_COMPONENT_NAME } from './constants.js';
import {
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
} from './dom.js';
import { state } from './state.js';
import { showMessage } from './core.js';
import { calculateIngredientCost, formatMoney } from './calc.js';
import { updateCostSummary } from './summary.js';
import { renderIngredients, resetIngredientForm } from './ingredients.js';
import { saveFormState } from './persist.js';

export function ensureDefaultComponent() {
  if (!state.components.length) {
    state.components.push({ name: DEFAULT_COMPONENT_NAME, items: [] });
  }
}

export function getActiveComponent() {
  if (!state.components.length) return null;
  const selected = componentSelect ? componentSelect.value : '';
  const active = state.components.find((component) => component.name === selected);
  return active || state.components[0];
}

export function setActiveComponent(name) {
  const active = state.components.find((component) => component.name === name) || state.components[0];
  if (componentSelect && active) {
    componentSelect.value = active.name;
  }
  resetIngredientForm();
  renderIngredients();
  updateComponentSubtotal();
}

export function renderComponentSelect() {
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

export function addComponent(rawName) {
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

export function renameActiveComponent(rawName) {
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

export function removeActiveComponent() {
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

export function duplicateActiveComponent() {
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

export function moveActiveComponent(direction) {
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

export function updateComponentsTotal() {
  if (!componentsTotal) return;
  const total = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  componentsTotal.textContent = `Custo total das partes: R$ ${formatMoney(total)}`;
}

export function updateComponentSubtotal() {
  if (!componentSubtotal) return;
  const active = getActiveComponent();
  const items = active ? active.items || [] : [];
  const subtotal = items.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  componentSubtotal.textContent = `R$ ${formatMoney(subtotal)}`;
}

export function renderComponentsSummary() {
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

export function buildComponentsFromIngredients(ingredients) {
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

/**
 * Coleta todos os ingredientes de todos os componentes
 */
export function getAllIngredients() {
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
