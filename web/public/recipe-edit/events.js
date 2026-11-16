/**
 * Eventos da tela: campos, ingredientes, componentes, envio e exclusão.
 */
import { DELETE_FLAG } from './constants.js';
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
  deleteBtn,
  deleteCancel,
  deleteClose,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  descriptionInput,
  form,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientUnit,
  ingredientsBody,
  marginInput,
  nameError,
  nameInput,
  overheadAddBtn,
  overheadBody,
  overheadError,
  overheadInput,
  overheadItemName,
  overheadItemValue,
  profitFixedInput,
  profitTypeFixed,
  profitTypePercent,
  saveBtn,
  yieldError,
  yieldInput,
  yieldTypeInput,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, clearFieldError, setFieldError, showMessage } from './core.js';
import {
  applyUnitNormalization,
  calculateIngredientCost,
  convertMonetaryInput,
  detectAndFixSmallGrams,
  formatQuantity,
  normalizeKgValue,
  normalizePackUnit,
  toNumber,
} from './calc.js';
import {
  validateEditName,
  validateEditYield,
  validateIngredientFields,
  validateName,
} from './validators.js';
import { findCatalogIngredient } from './catalog.js';
import {
  addComponent,
  duplicateActiveComponent,
  getActiveComponent,
  getAllIngredients,
  moveActiveComponent,
  removeActiveComponent,
  renameActiveComponent,
  setActiveComponent,
} from './components.js';
import {
  enableSaveButton,
  getOverheadValue,
  getProfitType,
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
  updateSaveState,
} from './summary.js';
import {
  clearIngredientWarning,
  enforceKgLimits,
  isIngredientAdvancedOpen,
  renderIngredients,
  resetIngredientForm,
  setIngredientAdvancedOpen,
  showIngredientSuccess,
  showIngredientWarning,
  startIngredientEdit,
  updateIngredientUnitHints,
  updatePackQuantityWarning,
  updatePackUnitDisplay,
  updatePackUnitHints,
} from './ingredients.js';
import { applyRecipeData, clearFormState, toggleDeleteModal } from './persist.js';

export function initEvents() {
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
}
