/**
 * Rascunho do formulário, aplicação dos dados da ficha e modal de exclusão.
 */
import { AUTO_SAVE_KEY } from './constants.js';
import {
  deleteBtn,
  deleteConfirm,
  deleteModal,
  descriptionInput,
  marginInput,
  nameInput,
  overheadInput,
  profitFixedInput,
  profitTypeFixed,
  profitTypePercent,
  yieldInput,
  yieldTypeInput,
} from './dom.js';
import { state } from './state.js';
import { setMaskedValue } from './catalog.js';
import {
  buildComponentsFromIngredients,
  ensureDefaultComponent,
  renderComponentSelect,
  renderComponentsSummary,
  updateComponentSubtotal,
  updateComponentsTotal,
} from './components.js';
import {
  enableSaveButton,
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
} from './summary.js';
import { renderIngredients } from './ingredients.js';

export function saveFormState() {
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

export function clearFormState() {
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

// Função para aplicar dados da receita nos campos
export function toggleDeleteModal(isOpen) {
  if (!deleteModal) return;
  deleteModal.classList.toggle('is-active', isOpen);
  deleteModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    deleteConfirm && deleteConfirm.focus();
  } else {
    deleteBtn && deleteBtn.focus();
  }
}

export function applyRecipeData(recipe) {
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
