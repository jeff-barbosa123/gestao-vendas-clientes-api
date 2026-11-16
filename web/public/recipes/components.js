/**
 * Componentes da ficha (massa, cobertura…): seleção, edição e totais.
 */
import { DEFAULT_COMPONENT_NAME } from './constants.js';
import {
  componentDuplicateBtn,
  componentMoveDownBtn,
  componentMoveUpBtn,
  componentRemoveBtn,
  componentRenameBtn,
  componentSelect,
  componentSubtotal,
  componentsSummary,
  componentsTotal,
} from './dom.js';
import { state } from './state.js';
import { showMessage } from './core.js';
import { calculateIngredientCost, formatMoney } from './calc.js';
import { renderIngredients, updateSubmitState } from '../recipes.js';

export function getAllIngredients() {
  return state.components.flatMap((component) => {
    const items = Array.isArray(component.items) ? component.items : [];
    return items.map((item) => ({
      ...item,
      component: component.name,
    }));
  });
}

export function updateComponentsTotal() {
  if (!componentsTotal) return;
  const total = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  componentsTotal.textContent = `R$ ${formatMoney(total)}`;
}

export function updateComponentSubtotal() {
  if (!componentSubtotal) return;
  const activeComponent = getActiveComponent();
  const items = activeComponent ? activeComponent.items || [] : [];
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

export function ensureDefaultComponent() {
  if (state.components.length) return;
  state.components = [{ name: DEFAULT_COMPONENT_NAME, items: [] }];
}

export function getActiveComponent() {
  if (!state.components.length) return null;
  const name = componentSelect ? componentSelect.value : '';
  const found = state.components.find((component) => component.name === name);
  return found || state.components[0];
}

export function setActiveComponent(name) {
  const active = state.components.find((component) => component.name === name) || state.components[0];
  if (componentSelect && active) {
    componentSelect.value = active.name;
  }
  renderIngredients();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateSubmitState();
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
  if (!name) return;
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
}

export function renameActiveComponent(rawName) {
  const active = getActiveComponent();
  const name = String(rawName || '').trim();
  if (!active || !name || active.name === DEFAULT_COMPONENT_NAME) return;
  if (state.components.some((component) => component.name.toLowerCase() === name.toLowerCase())) {
    showMessage('Essa parte j\u00e1 existe.', 'is-danger');
    return;
  }
  active.name = name;
  renderComponentSelect();
  setActiveComponent(name);
}

export function removeActiveComponent() {
  const active = getActiveComponent();
  if (!active || active.name === DEFAULT_COMPONENT_NAME || state.components.length <= 1) return;
  if (!window.confirm('Remover esta parte e todos os itens dela?')) return;
  state.components = state.components.filter((component) => component !== active);
  renderComponentSelect();
  setActiveComponent(state.components[0].name);
}

export function duplicateActiveComponent() {
  const active = getActiveComponent();
  if (!active) return;
  const base = `${active.name} copia`;
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
}

export function moveActiveComponent(direction) {
  const active = getActiveComponent();
  if (!active) return;
  const index = state.components.findIndex((component) => component === active);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.components.length) return;
  const swap = state.components[nextIndex];
  state.components[nextIndex] = active;
  state.components[index] = swap;
  renderComponentSelect();
  setActiveComponent(active.name);
}
